import { execFile } from 'child_process';
import { copyFile, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'path';

type ImageJob = {
  directory: string;
  files: string[];
};

const imageJobs = new Map<string, ImageJob>();
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function fileUrl(path: string) {
  return `file://${path.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')}`;
}

function runAgy(prompt: string, cwd: string) {
  return new Promise<void>((resolve, reject) => {
    execFile('agy', ['-p', prompt], { cwd, timeout: 10 * 60 * 1000, maxBuffer: 1024 * 1024 }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function generatedImages(directory: string) {
  return readdirSync(directory)
    .map((name) => join(directory, name))
    .filter((path) => imageExtensions.has(extname(path).toLowerCase()))
    .sort()
    .slice(0, 4);
}

function targetImagePath(rootFolder: string, targetPath: string) {
  const resourcesFolder = resolve(rootFolder, 'res');
  const candidate = resolve(resourcesFolder, isAbsolute(targetPath) ? targetPath : targetPath.replace(/^res[\\/]/, ''));
  if (relative(resourcesFolder, candidate).startsWith('..') || !existsSync(candidate)) {
    throw Error('The selected sprite image no longer exists in the project resources.');
  }
  return candidate;
}

export async function generateSpriteImages({ rootFolder, prompt }: { rootFolder: string; prompt: string }) {
  if (!rootFolder) throw Error('No project is loaded.');
  if (!prompt?.trim()) throw Error('Enter an image prompt.');

  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const directory = join(tmpdir(), 'safe-x-editor', 'ai-images', id);
  mkdirSync(directory, { recursive: true });
  const outputFiles = [1, 2, 3, 4].map((index) => join(directory, `variant-${index}.png`));
  const instruction = [
    'Generate exactly four distinct image variants for this request using the image-generation tool.',
    `User prompt: ${prompt.trim()}`,
    `Save the four final PNG files exactly at: ${outputFiles.join(', ')}.`,
    'Do not edit any project files and do not return until all four files have been written.',
  ].join('\n');

  try {
    await runAgy(instruction, rootFolder);
  } catch (error: any) {
    rmSync(directory, { recursive: true, force: true });
    if (error?.code === 'ENOENT') throw Error('The agy CLI was not found. Install and sign in to agy before generating images.');
    throw Error(error?.message || 'Image generation failed.');
  }

  const files = generatedImages(directory);
  if (files.length !== 4) {
    rmSync(directory, { recursive: true, force: true });
    throw Error(`agy did not produce four images (received ${files.length}).`);
  }
  imageJobs.set(id, { directory, files });
  return { success: true, jobId: id, images: files.map((file) => ({ name: basename(file), url: fileUrl(file) })) };
}

export async function replaceSpriteImage({ rootFolder, targetPath, jobId, imageIndex }: { rootFolder: string; targetPath: string; jobId: string; imageIndex: number }) {
  const job = imageJobs.get(jobId);
  const source = job?.files[imageIndex];
  if (!source || !existsSync(source)) throw Error('This generated image is no longer available. Generate again.');

  const destination = targetImagePath(rootFolder, targetPath);
  await new Promise<void>((resolve, reject) => copyFile(source, destination, (error) => error ? reject(error) : resolve()));
  imageJobs.delete(jobId);
  rmSync(job.directory, { recursive: true, force: true });
  return { success: true };
}

export async function createSpriteImageAsset({ rootFolder, targetPath, targetKey, jobId, imageIndex }: { rootFolder: string; targetPath: string; targetKey: string; jobId: string; imageIndex: number }) {
  const job = imageJobs.get(jobId);
  const source = job?.files[imageIndex];
  if (!source || !existsSync(source)) throw Error('This generated image is no longer available. Generate again.');

  const currentImage = targetImagePath(rootFolder, targetPath);
  const suffix = `ai_${Date.now()}`;
  const name = `${basename(currentImage, extname(currentImage))}_${suffix}.png`;
  const destination = join(dirname(currentImage), name);
  const relativePath = relative(resolve(rootFolder, 'res'), destination).replace(/\\/g, '/');
  const key = `${String(targetKey || 'sprite').replace(/[^a-zA-Z0-9_$]/g, '_')}_${suffix}`;
  const assetFile = join(rootFolder, 'src', 'assets', 'TextureAssets.ts');
  const existing = existsSync(assetFile) ? readFileSync(assetFile, 'utf-8') : '';

  if (new RegExp(`(?:export\\s+)?const\\s+${key}\\b`).test(existing)) throw Error(`Asset "${key}" already exists.`);
  await new Promise<void>((resolve, reject) => copyFile(source, destination, (error) => error ? reject(error) : resolve()));
  writeFileSync(assetFile, `${existing}${existing && !existing.endsWith('\n') ? '\n' : ''}export const ${key} = ${JSON.stringify(relativePath)};\n`, 'utf-8');
  imageJobs.delete(jobId);
  rmSync(job.directory, { recursive: true, force: true });
  return { success: true, key };
}
