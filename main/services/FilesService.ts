import { safexTemplateDir, sceneTemplate } from '@@/helper/constant';
import { readFileContent, renderMustacheFile } from '@@/helper/string.util';
import { GlobalData } from '@@/parser/global';
import { getClassesMetaData } from '@@/parser/metadata';
import {
  filterImages,
  filterTree,
  getTreeData
} from '@@/utils/Helper';
import { getJSXBlock, getListTagUsed } from '@@/utils/ParseData';
import { spliceString } from '@@/utils/StringHelper';
import { parse } from '@typescript-eslint/typescript-estree';
import DirectoryTree from 'directory-tree';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { copySync } from 'fs-extra';
import sizeOf from 'image-size';
import dir from 'node-dir';
import { join } from 'path';
import rimraf from 'rimraf';
import { startEditorScene } from './TerminalService';

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
  setupEditorFiles(src)
  const jsxOption: DirectoryTree.DirectoryTreeOptions = {
    extensions: /\.(j|t)sx?$/,
    exclude,
    attributes: ['type', 'extension'],
  }
  const components = DirectoryTree(join(src, 'src', 'components'), jsxOption);
  const scenes = DirectoryTree(join(src, 'src', 'scene'), jsxOption);
  const images: any = DirectoryTree(
    join(src, 'res'),
    {
      extensions: /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i,
      exclude,
      attributes: ['type'],
    },
    (item: any, path) => {
      const { width, height } = sizeOf(path);
      item.width = width;
      item.height = height;
    },
  );
  // console.log('imagesData', JSON.stringify(images, null, 2));
  // console.log('treeNodeUtils', treeNodeUtils.filterNodes([tree], filterTreeFunction));
  return {
    components: getTreeData(filterTree([components])),
    scenes: getTreeData(([scenes])),
    res: getTreeData(filterImages([images])),
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

function setupEditorFiles(src: string) {
  const desDir = join(src, 'src', '.safex')
  copySync(join(safexTemplateDir, 'editor.ts'), join(desDir, 'editor.ts'))
  copySync(join(safexTemplateDir, 'editor.html'), join(desDir, 'editor.html'))
  copySync(join(safexTemplateDir, 'Boot.tsx'), join(desDir, 'Boot.tsx'))
  const editorSceneFile = join(desDir, 'EditingScene.tsx')
  const template = readFileContent(sceneTemplate);
  const content = renderMustacheFile(template, {})
  writeFileSync(editorSceneFile, content)
  startEditorScene()
}

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