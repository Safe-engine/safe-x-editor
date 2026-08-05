import { app, clipboard } from 'electron';
import { execFile } from 'child_process';
import { copyFile, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

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
  provider: 'agy' | 'codex' | 'claude' | 'openai-compatible';
  model: string;
  baseUrl: string;
  apiKey: string;
};

const defaultAiImageSettings: AiImageSettings = {
  numberOfImages: 4,
  systemPrompt: 'You are a board-game SVG asset generator. Your only job is generating assets.\nFixed visual style: square 512×512 board-game token/icon, flat vector shapes, thick rounded dark-navy outlines (#24324A), warm cream background (#FFF3D6), saturated teal/coral/gold accents, simple readable silhouette, subtle shadow, no text, no gradients, no external resources, scripts, or raster images.',
  provider: 'agy',
  model: 'gemini-3.6-flash-high',
  baseUrl: '',
  apiKey: '',
};

function normalizeAiImageSettings(settings: Partial<AiImageSettings>): AiImageSettings {
  const numberOfImages = Number(settings.numberOfImages);
  const provider = ['agy', 'codex', 'claude', 'openai-compatible'].includes(settings.provider || '')
    ? settings.provider as AiImageSettings['provider']
    : defaultAiImageSettings.provider;
  return {
    numberOfImages: [1, 2, 3, 4].includes(numberOfImages) ? numberOfImages : defaultAiImageSettings.numberOfImages,
    systemPrompt: typeof settings.systemPrompt === 'string' ? settings.systemPrompt : defaultAiImageSettings.systemPrompt,
    provider,
    model: typeof settings.model === 'string' && settings.model !== 'Default' ? settings.model : defaultAiImageSettings.model,
    baseUrl: typeof settings.baseUrl === 'string' ? settings.baseUrl : defaultAiImageSettings.baseUrl,
    apiKey: typeof settings.apiKey === 'string' ? settings.apiKey : defaultAiImageSettings.apiKey,
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
  return pathToFileURL(path).href;
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
  const normalizedTargetPath = targetPath.startsWith('file:') ? fileURLToPath(targetPath) : targetPath;
  const candidate = resolve(resourcesFolder, isAbsolute(normalizedTargetPath) ? normalizedTargetPath : normalizedTargetPath.replace(/^res[\\/]/, ''));
  if (relative(resourcesFolder, candidate).startsWith('..') || !existsSync(candidate)) {
    throw Error('The selected sprite image no longer exists in the project resources.');
  }
  return candidate;
}

function targetImageDestinationPath(currentImage: string, extension = extname(currentImage)) {
  const currentName = basename(currentImage, extension);
  const match = currentName.match(/^(.*?)(\d+)$/);
  const name = match?.[1] || currentName;
  let number = match ? Number(match[2]) + 1 : 2;
  let destination = join(dirname(currentImage), `${name}${number}${extension}`);

  while (existsSync(destination)) {
    number += 1;
    destination = join(dirname(currentImage), `${name}${number}${extension}`);
  }
  return destination;
}

function nextTextureAssetKey(rootFolder: string, targetKey: string) {
  const assetFile = join(rootFolder, 'src', 'assets', 'TextureAssets.ts');
  const existing = existsSync(assetFile) ? readFileSync(assetFile, 'utf-8') : '';
  const currentKey = String(targetKey || 'sprite').replace(/[^a-zA-Z0-9_$]/g, '_');
  const match = currentKey.match(/^(.*?)(\d+)$/);
  const base = match?.[1] || currentKey;
  let number = match ? Number(match[2]) + 1 : 2;
  let key = `${base}${number}`;

  while (new RegExp(`(?:export\\s+)?const\\s+${escapeRegExp(key)}\\b`).test(existing)) {
    number += 1;
    key = `${base}${number}`;
  }
  return { assetFile, key };
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

export async function generateSpriteImages({ rootFolder, prompt, targetPath }: { rootFolder: string; prompt: string; targetPath?: string }) {
  if (!rootFolder) throw Error('No project is loaded.');
  if (!prompt?.trim()) throw Error('Enter an image prompt.');

  const settings = getAiImageSettings();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const directory = join(tmpdir(), 'safe-x-editor', 'ai-images', id);
  mkdirSync(directory, { recursive: true });
  const currentSvg = targetPath && extname(targetPath).toLowerCase() === '.svg'
    ? readFileSync(targetImagePath(rootFolder, targetPath), 'utf-8')
    : '';
  const instruction = [
    settings.systemPrompt.trim() && `SYSTEM: ${settings.systemPrompt.trim()}`,
    `Return exactly ${settings.numberOfImages} complete, self-contained <svg>...</svg> string${settings.numberOfImages === 1 ? '' : 's'} and nothing else: no Markdown, labels, explanations, tool calls, or file operations.`,
    'Each SVG must use viewBox="0 0 512 512" and be a distinct variation while following the system prompt.',
    currentSvg && `Edit the following current SVG according to the user prompt. Preserve its recognizable subject and style unless the prompt asks to change them:\n${currentSvg}`,
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

export async function replaceSpriteImageFromFile({ rootFolder, targetPath, sourcePath }: { rootFolder: string; targetPath: string; sourcePath: string }) {
  if (!sourcePath || !existsSync(sourcePath) || !imageExtensions.has(extname(sourcePath).toLowerCase())) {
    throw Error('Choose an existing PNG, JPG, WebP, or SVG image.');
  }

  const destination = targetImagePath(rootFolder, targetPath);
  await new Promise<void>((resolve, reject) => copyFile(sourcePath, destination, (error) => error ? reject(error) : resolve()));
  return { success: true };
}

export function replaceSpriteImageFromClipboard({ rootFolder, targetPath, targetKey }: { rootFolder: string; targetPath: string; targetKey: string }) {
  const image = clipboard.readImage();
  if (image.isEmpty()) throw Error('The clipboard does not contain an image.');

  const currentImage = targetImagePath(rootFolder, targetPath);
  const destination = extname(currentImage).toLowerCase() === '.png'
    ? currentImage
    : join(dirname(currentImage), `${basename(currentImage, extname(currentImage))}_pasted.png`);
  writeFileSync(destination, image.toPNG());
  if (destination !== currentImage) {
    updateTextureAssetPath(rootFolder, targetKey, relative(resolve(rootFolder, 'res'), destination).replace(/\\/g, '/'));
  }
  return { success: true };
}

async function createSpriteImageAssetFromSource({ rootFolder, targetPath, targetKey, extension, write }: { rootFolder: string; targetPath: string; targetKey: string; extension: string; write: (destination: string) => Promise<void> | void }) {
  const currentImage = targetImagePath(rootFolder, targetPath);
  const destination = targetImageDestinationPath(currentImage, extension);
  const relativePath = relative(resolve(rootFolder, 'res'), destination).replace(/\\/g, '/');
  const { assetFile, key } = nextTextureAssetKey(rootFolder, targetKey);

  await write(destination);
  const existing = existsSync(assetFile) ? readFileSync(assetFile, 'utf-8') : '';
  writeFileSync(assetFile, `${existing}${existing && !existing.endsWith('\n') ? '\n' : ''}export const ${key} = ${JSON.stringify(relativePath)};\n`, 'utf-8');
  return { success: true, key };
}

export async function createSpriteImageAssetFromFile({ rootFolder, targetPath, targetKey, sourcePath }: { rootFolder: string; targetPath: string; targetKey: string; sourcePath: string }) {
  if (!sourcePath || !existsSync(sourcePath) || !imageExtensions.has(extname(sourcePath).toLowerCase())) {
    throw Error('Choose an existing PNG, JPG, WebP, or SVG image.');
  }
  return createSpriteImageAssetFromSource({
    rootFolder,
    targetPath,
    targetKey,
    extension: extname(sourcePath),
    write: (destination) => new Promise<void>((resolve, reject) => copyFile(sourcePath, destination, (error) => error ? reject(error) : resolve())),
  });
}

export function createSpriteImageAssetFromClipboard({ rootFolder, targetPath, targetKey }: { rootFolder: string; targetPath: string; targetKey: string }) {
  const image = clipboard.readImage();
  if (image.isEmpty()) throw Error('The clipboard does not contain an image.');

  return createSpriteImageAssetFromSource({
    rootFolder,
    targetPath,
    targetKey,
    extension: '.png',
    write: (destination) => writeFileSync(destination, image.toPNG()),
  });
}

export async function createSpriteImageAsset({ rootFolder, targetPath, targetKey, jobId, imageIndex }: { rootFolder: string; targetPath: string; targetKey: string; jobId: string; imageIndex: number }) {
  const job = imageJobs.get(jobId);
  const source = job?.files[imageIndex];
  if (!source || !existsSync(source)) throw Error('This generated image is no longer available. Generate again.');

  const result = await createSpriteImageAssetFromSource({
    rootFolder,
    targetPath,
    targetKey,
    extension: extname(source),
    write: (destination) => new Promise<void>((resolve, reject) => copyFile(source, destination, (error) => error ? reject(error) : resolve())),
  });
  imageJobs.delete(jobId);
  rmSync(job.directory, { recursive: true, force: true });
  return result;
}
