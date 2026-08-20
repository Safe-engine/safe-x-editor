import fs from 'fs';
import path from 'path';
import { parseAssetsSrcFile } from './assets';
import { syncResConst } from './TerminalService';

function normalizeResourcePath(value = '') {
  return String(value).replace(/\\/g, '/').replace(/^res\//, '').replace(/^res$/, '').replace(/^\/+|\/+$/g, '');
}

function resolveResourceFolder(rootFolder: string, resourcePath = '') {
  const resourcesFolder = path.resolve(rootFolder, 'res');
  let targetFolder = path.resolve(resourcesFolder, normalizeResourcePath(resourcePath));
  if (fs.existsSync(targetFolder) && fs.statSync(targetFolder).isFile()) {
    targetFolder = path.dirname(targetFolder);
  }
  if (targetFolder !== resourcesFolder && !targetFolder.startsWith(`${resourcesFolder}${path.sep}`)) {
    throw Error('Invalid destination folder.');
  }
  return { resourcesFolder, targetFolder };
}

export function importResources({ rootFolder, resourcePath = '', sourcePaths = [] }, syncAssets = syncResConst) {
  if (!rootFolder || !Array.isArray(sourcePaths) || !sourcePaths.length) throw Error('Choose at least one file or folder to import.');

  const { resourcesFolder, targetFolder } = resolveResourceFolder(rootFolder, resourcePath);
  const importedPaths: string[] = [];
  fs.mkdirSync(targetFolder, { recursive: true });

  for (const sourcePath of sourcePaths) {
    const source = path.resolve(String(sourcePath || ''));
    if (!sourcePath || !fs.existsSync(source)) throw Error('A dropped file no longer exists.');
    const target = path.join(targetFolder, path.basename(source));
    if (fs.existsSync(target)) throw Error(`${path.basename(source)} already exists in this folder.`);
    if (source === target || (fs.statSync(source).isDirectory() && target.startsWith(`${source}${path.sep}`))) {
      throw Error('A folder cannot be copied into itself.');
    }
    fs.cpSync(source, target, { recursive: true, errorOnExist: true });
    importedPaths.push(path.relative(resourcesFolder, target).replace(/\\/g, '/'));
  }

  syncAssets(rootFolder);
  const textureAssets = parseAssetsSrcFile(path.join(rootFolder, 'src', 'assets', 'TextureAssets.ts'));
  const assets = importedPaths.map((resourcePath) => ({
    path: resourcePath,
    key: textureAssets.find((asset) => asset.path === resourcePath)?.key,
  }));
  return { success: true, assets };
}
