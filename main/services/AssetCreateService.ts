import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path/posix';

function toIdentifier(name = '') {
  const normalized = name.trim().replace(/[^a-zA-Z0-9_$]/g, '_');
  if (!normalized) throw Error('Asset name is required.');
  return /^[0-9]/.test(normalized) ? `_${normalized}` : normalized;
}

function normalizePath(value = '') {
  const normalized = value.trim().replace(/\\/g, '/');
  if (!normalized) throw Error('Asset path is required.');
  return normalized;
}

function quoted(value: string) {
  return JSON.stringify(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function appendDeclaration(filePath: string, key: string, declaration: string) {
  mkdirSync(dirname(filePath), { recursive: true });
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';
  if (new RegExp(`(?:export\\s+)?const\\s+${escapeRegExp(key)}\\b`).test(existing)) {
    throw Error(`Asset "${key}" already exists.`);
  }
  const prefix = existing && !existing.endsWith('\n') ? '\n' : '';
  writeFileSync(filePath, `${existing}${prefix}${declaration}\n`, 'utf-8');
}

export async function createAsset({ rootFolder, assetType, data }) {
  if (!rootFolder) throw Error('No project is loaded.');

  const assetsFolder = join(rootFolder, 'src', 'assets');
  const key = toIdentifier(data.name);

  if (assetType === 'image') {
    const path = normalizePath(data.path);
    appendDeclaration(
      join(assetsFolder, 'TextureAssets.ts'),
      key,
      `export const ${key} = ${quoted(path)};`
    );
    return { success: true, key };
  }

  if (assetType === 'audio') {
    const path = normalizePath(data.path);
    appendDeclaration(
      join(assetsFolder, 'AudioAssets.ts'),
      key,
      `export const ${key} = ${quoted(path)};`
    );
    return { success: true, key };
  }

  if (assetType === 'animation') {
    const animationType = data.type === 'dragonBones' ? 'dragonBones' : 'spine';
    const atlasPath = normalizePath(data.atlasPath);
    const skeletonPath = normalizePath(data.skeletonPath);
    const texturePath = data.texturePath?.trim() ? normalizePath(data.texturePath) : '';
    const fileName = animationType === 'dragonBones' ? 'DragonBonesAssets.ts' : 'SpineAssets.ts';
    const textureLine = texturePath ? `\n  texture: ${quoted(texturePath)},` : '';

    appendDeclaration(
      join(assetsFolder, fileName),
      key,
      `export const ${key} = {\n  atlas: ${quoted(atlasPath)},\n  skeleton: ${quoted(skeletonPath)},${textureLine}\n};`
    );
    return { success: true, key };
  }

  throw Error('Unsupported asset type.');
}
