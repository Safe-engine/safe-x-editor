
import { dir } from 'console';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, parse } from 'path';
import { getResolutionSettings } from '../helper/settings';
import { readFileContent } from '../helper/string.util';
import { GlobalData } from '../parser/global';
import { getClassesMetaData } from '../parser/metadata';
import { filterTree, getTreeData } from '../utils/Helper';
import { getJSXBlock, getListTagUsed } from '../utils/ParseData';
import { spliceString } from '../utils/StringHelper';
import { parseAssetsSrcFile } from './assets';

export const getFilesInFolder = ({ src, exclude = [] }) => {
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
  // setupEditorFiles(src)
  const jsxOption: DirectoryTree.DirectoryTreeOptions = {
    extensions: /\.tsx$/,
    exclude,
    attributes: ['type', 'extension'],
  }
  const components = DirectoryTree(join(src, 'src'), jsxOption);
  const assetsTSFolder = join(src, 'src', 'assets')
  const assetsTextureList = parseAssetsSrcFile(join(assetsTSFolder, 'TextureAssets.ts'));
  const fontAssets = parseAssetsSrcFile(join(assetsTSFolder, 'FontAssets.ts'));
  const spriteSheetAssets = parseAssetsSrcFile(join(assetsTSFolder, 'SpriteSheetAssets.ts'));
  const spriteFramesAssets = parseAssetsSrcFile(join(assetsTSFolder, 'SpriteFrames.ts'));
  const designedResolution = getResolutionSettings(src)
  // console.log('components', JSON.stringify(components, null, 2));
  return {
    components: getTreeData(filterTree([components])),
    assets: {
      assetsTextureList,
      fontAssets,
      spriteSheetAssets,
      spriteFramesAssets,
    },
    designedResolution
  };
};

export const checkFileExist = (filePath) => existsSync(filePath);

export const deleteFolder = (data) => {
  rimraf.sync(data);
};

export const dirPathPromise = (componentPath) =>
  new Promise<any>((resole, reject) => {
    dir.paths(componentPath, (error, paths) => {
      if (error) {
        reject(error);
      }
      resole(paths);
    });
  });

export function updateEditorJSX(jsxString: string) {
  const editorSceneFile = join(GlobalData.rootProject, 'src', '.safex', 'EditingScene.tsx')
  const input = readFileContent(editorSceneFile);
  const parsed = parse(input, { jsx: true, range: true });
  const jsxBlock = getJSXBlock(parsed);
  const [start, end] = jsxBlock.range;
  let content = jsxString.includes('SceneComponent') ? jsxString :
    `<SceneComponent>\n      ${jsxString}\n      </SceneComponent>`
  const tagUsed = getListTagUsed(parsed)
  content = spliceString(input, start, end - start, content)
  tagUsed.forEach(tag => {
    const importLine = GlobalData.importPaths[tag]
    if (importLine && !input.includes(importLine)) {
      content = `${importLine}\n${content}`
    }
  })
  writeFileSync(editorSceneFile, content);
}