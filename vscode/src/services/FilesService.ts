import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { getResolutionSettings } from '../helper/settings';
import { GlobalData } from '../parser/global';
import { getClassesMetaData } from '../parser/metadata';
import { parseAssetsSrcFile } from './assets';
import { loadComponent } from './ComponentService';

export const getFilesInFolder = async ({ src }, panel) => {
  const packageJson = join(src, 'package.json');
  if (!existsSync(packageJson)) {
    throw Error('No package.json.');
  }
  const content = readFileSync(packageJson, 'utf-8');
  if (!content.includes("safe-x")) {
    throw Error('Not Safex project.');
  }
  GlobalData.rootProject = src
  getClassesMetaData(src)
  const assetsTSFolder = join(src, 'src', 'assets')
  const assetsTextureList = parseAssetsSrcFile(join(assetsTSFolder, 'TextureAssets.ts'), panel);
  const fontAssets = parseAssetsSrcFile(join(assetsTSFolder, 'FontAssets.ts'), panel);
  const spriteSheetAssets = parseAssetsSrcFile(join(assetsTSFolder, 'SpriteSheetAssets.ts'), panel);
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
  // console.log(components, 'components');
  return {
    isPixi: content.includes('@safe-engine/pixi'),
    assets: {
      assetsTextureList,
      fontAssets,
      spriteSheetAssets,
      spriteFramesAssets,
    },
    componentsCache,
    designedResolution
  };
};
