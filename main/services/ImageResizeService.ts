import { Jimp } from 'jimp';
import { existsSync } from 'fs';
import { isAbsolute, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

function targetImagePath(rootFolder: string, targetPath: string) {
  const resourcesFolder = resolve(rootFolder, 'res');
  const normalizedTargetPath = targetPath.startsWith('file:') ? fileURLToPath(targetPath) : targetPath;
  const candidate = resolve(resourcesFolder, isAbsolute(normalizedTargetPath) ? normalizedTargetPath : normalizedTargetPath.replace(/^res[\\/]/, ''));
  if (relative(resourcesFolder, candidate).startsWith('..') || !existsSync(candidate)) {
    throw Error('The selected sprite image no longer exists in the project resources.');
  }
  return candidate;
}

export async function resizeSpriteImage({ rootFolder, targetPath, width, height }: { rootFolder: string; targetPath: string; width: number; height: number }) {
  if (!rootFolder) throw Error('No project is loaded.');
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw Error('Texture dimensions must be positive whole numbers.');
  }

  const imagePath = targetImagePath(rootFolder, targetPath);
  const image = await Jimp.read(imagePath);
  image.resize({ w: width, h: height });
  await image.write(imagePath);
  return { success: true };
}
