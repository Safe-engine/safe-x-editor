import DirectoryTree from 'directory-tree';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { getResolutionSettings } from '../helper/settings';
import { GlobalData } from '../parser/global';
import { getClassesMetaData } from '../parser/metadata';
import { filterTree, getTreeData } from '../utils/Helper';
import { parseAssetsSrcFile } from './assets';
import { loadComponent } from './ComponentService';

export const getFilesInFolder = async ({ src }, panel) => {
  const packageJson = join(src, 'package.json');
  if (!existsSync(packageJson)) {
    throw Error('No package.json.');
  }
  const content = readFileSync(packageJson, 'utf-8');
  if (!content.includes("@safe-engine")) {
    throw Error('Not Safex project.');
  }
  GlobalData.rootProject = src
  getClassesMetaData(src)
  const assetsTSFolder = join(src, 'src', 'assets')
  const assetsTextureList = parseAssetsSrcFile(join(assetsTSFolder, 'TextureAssets.ts'), panel);
  const fontAssets = parseAssetsSrcFile(join(assetsTSFolder, 'FontAssets.ts'), panel);
  const spriteSheetAssets = parseAssetsSrcFile(join(assetsTSFolder, 'SpriteSheetAssets.ts'), panel);
  const dragonBonesAssets = parseAssetsSrcFile(join(assetsTSFolder, 'DragonBonesAssets.ts'), panel);
  const spineAssets = parseAssetsSrcFile(join(assetsTSFolder, 'SpineAssets.ts'), panel);
  const spriteFramesAssets = parseAssetsSrcFile(join(assetsTSFolder, 'SpriteFrames.ts'));
  const designedResolution = getResolutionSettings(src)
  // console.log('components', JSON.stringify(components, null, 2));
  const componentsCache = {}
  const components = readdirSync(join(src, 'src', 'components'))
    .filter(file => file.endsWith('.tsx'))
    .map(async file => {
      const filePath = join(src, 'src', 'components', file);
      const { name, treeData } = await loadComponent({ path: filePath });
      componentsCache[name] = treeData;
      return filePath
    });
  await Promise.all(components);
  const jsxOption: DirectoryTree.DirectoryTreeOptions = {
    extensions: /\.tsx$/,
    exclude: [],
    attributes: ['type', 'extension'],
  }
  // console.log(components, 'components');
  return {
    componentsTree: getTreeData(filterTree([DirectoryTree(join(src, 'src'), jsxOption)])),
    isPixi: content.includes('@safe-engine/pixi'),
    assets: {
      assetsTextureList,
      fontAssets,
      spriteSheetAssets,
      spriteFramesAssets,
      dragonBonesAssets,
      spineAssets
    },
    componentsCache,
    designedResolution
  };
};
