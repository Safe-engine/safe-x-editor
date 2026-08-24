import fs from 'fs';
import path from 'path';
import { GlobalData } from '../parser/global';
import { parseAssetsSrcFile } from './assets';
import { syncResConst } from './TerminalService';

const assetFiles = [
  'TextureAssets.ts',
  'FontAssets.ts',
  'JsonAssets.ts',
  'AudioAssets.ts',
  'SpriteSheetAssets.ts',
  'DragonBonesAssets.ts',
  'SpineAssets.ts',
  'TiledMapAssets.ts',
  'ParticleAssets.ts',
];
const codeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resourceKeyForPath(rootFolder: string, resourcePath: string) {
  GlobalData.rootProject = rootFolder;
  const assetsFolder = path.join(rootFolder, 'src', 'assets');
  for (const assetFile of assetFiles) {
    const asset = parseAssetsSrcFile(path.join(assetsFolder, assetFile)).find((item) => item.path === resourcePath);
    if (asset) return asset.key;
  }
  return undefined;
}

function codeFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return codeFiles(filePath);
    return codeExtensions.has(path.extname(entry.name)) ? [filePath] : [];
  });
}

export function replaceAssetKeyReferences(sourceDirectory: string, oldKey: string, newKey: string) {
  if (oldKey === newKey) return 0;
  const pattern = new RegExp(`\\b${escapeRegExp(oldKey)}\\b`, 'g');
  let changedFiles = 0;
  for (const filePath of codeFiles(sourceDirectory)) {
    const source = fs.readFileSync(filePath, 'utf8');
    const updated = source.replace(pattern, newKey);
    if (updated === source) continue;
    fs.writeFileSync(filePath, updated, 'utf8');
    changedFiles++;
  }
  return changedFiles;
}

export function renameResource({ rootFolder, resourcePath, resourceKey, newName }, syncAssets = syncResConst) {
  const resourcesFolder = path.resolve(rootFolder, 'res');
  const normalizedPath = String(resourcePath || '').replace(/\\/g, '/').replace(/^res\//, '');
  const sourcePath = path.resolve(resourcesFolder, normalizedPath);
  const name = String(newName || '').trim();

  if (!rootFolder || !normalizedPath || !resourceKey) throw Error('Invalid resource rename request.');
  if (!name || name !== path.basename(name) || name === '.' || name === '..') throw Error('Use a valid file name.');
  if (path.relative(resourcesFolder, sourcePath).startsWith('..') || !fs.existsSync(sourcePath)) {
    throw Error('The selected resource no longer exists in the project.');
  }

  const targetPath = path.join(path.dirname(sourcePath), name);
  if (sourcePath === targetPath) return { success: true, oldKey: resourceKey, newKey: resourceKey, replacedFiles: 0 };
  if (fs.existsSync(targetPath)) throw Error(`${name} already exists.`);
  if (resourceKeyForPath(rootFolder, normalizedPath) !== resourceKey) {
    throw Error('The selected resource is out of date. Reload resources and try again.');
  }

  const targetResourcePath = path.relative(resourcesFolder, targetPath).replace(/\\/g, '/');
  let moved = false;
  try {
    fs.renameSync(sourcePath, targetPath);
    moved = true;
    syncAssets(rootFolder);
    const newKey = resourceKeyForPath(rootFolder, targetResourcePath);
    if (!newKey) throw Error('Unable to find the renamed resource after syncing assets.');
    const replacedFiles = replaceAssetKeyReferences(path.join(rootFolder, 'src'), resourceKey, newKey);
    return { success: true, oldKey: resourceKey, newKey, replacedFiles };
  } catch (error) {
    if (moved && fs.existsSync(targetPath) && !fs.existsSync(sourcePath)) fs.renameSync(targetPath, sourcePath);
    throw error;
  }
}
