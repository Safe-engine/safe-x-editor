import { app } from 'electron';
import { execFile } from 'child_process';
import { copyFile, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'path';

type ImageJob = {
  directory: string;
  files: string[];
};

const imageJobs = new Map<string, ImageJob>();
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
const AI_IMAGE_SETTINGS_FILE = 'ai-image-settings.json';

export type AiImageSettings = {
  numberOfImages: number;
  systemPrompt: string;
};

const defaultAiImageSettings: AiImageSettings = {
  numberOfImages: 4,
  systemPrompt: 'You are a board-game SVG asset generator. Your only job is generating assets.\nFixed visual style: square 512×512 board-game token/icon, flat vector shapes, thick rounded dark-navy outlines (#24324A), warm cream background (#FFF3D6), saturated teal/coral/gold accents, simple readable silhouette, subtle shadow, no text, no gradients, no external resources, scripts, or raster images.',
};

function normalizeAiImageSettings(settings: Partial<AiImageSettings>): AiImageSettings {
  const numberOfImages = Number(settings.numberOfImages);
  return {
    numberOfImages: [1, 2, 3, 4].includes(numberOfImages) ? numberOfImages : defaultAiImageSettings.numberOfImages,
    systemPrompt: typeof settings.systemPrompt === 'string' ? settings.systemPrompt : defaultAiImageSettings.systemPrompt,
  };
}

export function getAiImageSettings() {
  const settingsPath = join(app.getPath('userData'), AI_IMAGE_SETTINGS_FILE);
  if (!existsSync(settingsPath)) return defaultAiImageSettings;
  try {
    return normalizeAiImageSettings(JSON.parse(readFileSync(settingsPath, 'utf-8')));
  } catch {
    return defaultAiImageSettings;
  }
}

export function saveAiImageSettings(settings: Partial<AiImageSettings>) {
  const normalized = normalizeAiImageSettings(settings);
  writeFileSync(join(app.getPath('userData'), AI_IMAGE_SETTINGS_FILE), JSON.stringify(normalized), 'utf-8');
  return { success: true, ...normalized };
}

function fileUrl(path: string) {
  return `file://${path.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')}`;
}

function runAgy(prompt: string, cwd: string) {
  return new Promise<string>((resolve, reject) => {
    execFile('agy', ['-p', prompt], { cwd, timeout: 10 * 60 * 1000, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

function generatedImages(directory: string, numberOfImages: number) {
  return readdirSync(directory)
    .map((name) => join(directory, name))
    .filter((path) => imageExtensions.has(extname(path).toLowerCase()))
    .sort()
    .slice(0, numberOfImages);
}

function targetImagePath(rootFolder: string, targetPath: string) {
  const resourcesFolder = resolve(rootFolder, 'res');
  const candidate = resolve(resourcesFolder, isAbsolute(targetPath) ? targetPath : targetPath.replace(/^res[\\/]/, ''));
  if (relative(resourcesFolder, candidate).startsWith('..') || !existsSync(candidate)) {
    throw Error('The selected sprite image no longer exists in the project resources.');
  }
  return candidate;
}

function targetImageDestinationPath(currentImage: string) {
  return join(dirname(currentImage), `${basename(currentImage, extname(currentImage))}_new.svg`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateTextureAssetPath(rootFolder: string, key: string, path: string) {
  const assetFile = join(rootFolder, 'src', 'assets', 'TextureAssets.ts');
  const existing = existsSync(assetFile) ? readFileSync(assetFile, 'utf-8') : '';
  const declaration = new RegExp(`^export\\s+const\\s+${escapeRegExp(key)}\\s*=.*;$`, 'm');
  if (!declaration.test(existing)) throw Error(`Could not update texture asset "${key}".`);
  writeFileSync(assetFile, existing.replace(declaration, `export const ${key} = ${JSON.stringify(path)};`), 'utf-8');
}

export async function generateSpriteImages({ rootFolder, prompt }: { rootFolder: string; prompt: string }) {
  if (!rootFolder) throw Error('No project is loaded.');
  if (!prompt?.trim()) throw Error('Enter an image prompt.');

  const settings = getAiImageSettings();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const directory = join(tmpdir(), 'safe-x-editor', 'ai-images', id);
  mkdirSync(directory, { recursive: true });
  const instruction = [
    settings.systemPrompt.trim() && `SYSTEM: ${settings.systemPrompt.trim()}`,
    `Return exactly ${settings.numberOfImages} complete, self-contained <svg>...</svg> string${settings.numberOfImages === 1 ? '' : 's'} and nothing else: no Markdown, labels, explanations, tool calls, or file operations.`,
    'Each SVG must use viewBox="0 0 512 512" and be a distinct variation while following the system prompt.',
    `User prompt: ${prompt.trim()}`,
  ].join('\n');

  try {
    const response = await runAgy(instruction, rootFolder);
    const svgs = response.match(/<svg\b[\s\S]*?<\/svg>/gi) || [];
    if (svgs.length !== settings.numberOfImages) throw Error(`agy did not return ${settings.numberOfImages} SVG image${settings.numberOfImages === 1 ? '' : 's'} (received ${svgs.length}).`);
    svgs.forEach((svg, index) => writeFileSync(join(directory, `variant-${index + 1}.svg`), svg, 'utf-8'));
  } catch (error: any) {
    rmSync(directory, { recursive: true, force: true });
    if (error?.code === 'ENOENT') throw Error('The agy CLI was not found. Install and sign in to agy before generating images.');
    throw Error(error?.message || 'Image generation failed.');
  }

  const files = generatedImages(directory, settings.numberOfImages);
  if (files.length !== settings.numberOfImages) {
    rmSync(directory, { recursive: true, force: true });
    throw Error(`agy did not produce ${settings.numberOfImages} images (received ${files.length}).`);
  }
  imageJobs.set(id, { directory, files });
  return { success: true, jobId: id, images: files.map((file) => ({ name: basename(file), url: fileUrl(file) })) };
}

export async function replaceSpriteImage({ rootFolder, targetPath, targetKey, jobId, imageIndex }: { rootFolder: string; targetPath: string; targetKey: string; jobId: string; imageIndex: number }) {
  const job = imageJobs.get(jobId);
  const source = job?.files[imageIndex];
  if (!source || !existsSync(source)) throw Error('This generated image is no longer available. Generate again.');

  const currentImage = targetImagePath(rootFolder, targetPath);
  const destination = extname(currentImage).toLowerCase() === '.svg'
    ? currentImage
    : join(dirname(currentImage), `${basename(currentImage, extname(currentImage))}_ai.svg`);
  if (destination !== currentImage) {
    updateTextureAssetPath(rootFolder, targetKey, relative(resolve(rootFolder, 'res'), destination).replace(/\\/g, '/'));
  }
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
  const destination = targetImageDestinationPath(currentImage);
  const relativePath = relative(resolve(rootFolder, 'res'), destination).replace(/\\/g, '/');
  const key = `${String(targetKey || 'sprite').replace(/[^a-zA-Z0-9_$]/g, '_')}_new`;
  const assetFile = join(rootFolder, 'src', 'assets', 'TextureAssets.ts');
  const existing = existsSync(assetFile) ? readFileSync(assetFile, 'utf-8') : '';

  await new Promise<void>((resolve, reject) => copyFile(source, destination, (error) => error ? reject(error) : resolve()));
  if (new RegExp(`(?:export\\s+)?const\\s+${key}\\b`).test(existing)) {
    updateTextureAssetPath(rootFolder, key, relativePath);
  } else {
    writeFileSync(assetFile, `${existing}${existing && !existing.endsWith('\n') ? '\n' : ''}export const ${key} = ${JSON.stringify(relativePath)};\n`, 'utf-8');
  }
  imageJobs.delete(jobId);
  rmSync(job.directory, { recursive: true, force: true });
  return { success: true, key };
}
