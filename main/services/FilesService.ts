import { safexTemplateDir, sceneTemplate } from '@@/helper/constant';
import { readFileContent, renderMustacheFile } from '@@/helper/string.util';
import { GlobalData } from '@@/parser/global';
import { getClassesMetaData } from '@@/parser/metadata';
import {
  filterImages,
  filterTree,
  getTreeData
} from '@@/utils/Helper';
import { getJSXBlock } from '@@/utils/ParseData';
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

// const logFolder = app.getPath('logs');
// const genFolder = pathUtil.join(logFolder, 'gen');
// if (!existsSync(genFolder)) {
//   mkdirSync(genFolder);
// }

export const defaultExclude = [
  /\/node_modules/,
  /\/build/,
  /\/release/,
  /\/gen\//,
  /\/network/,
  /\/storage/,
  /\/out/,
  /\/dist/,
  /\/main\//,
  /\.git/,
  /\.next/,
  /\/helper/,
  /\/i18n/,
];

export const getFilesInFolder = ({ src, excludes = [] }) => {
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
  const components = DirectoryTree(join(src, 'src'), {
    extensions: /\.(j|t)sx?$/,
    exclude: [...defaultExclude, ...excludes, /\/public/],
    attributes: ['type', 'extension'],
  });
  const images: any = DirectoryTree(
    join(src, 'res'),
    {
      extensions: /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i,
      exclude: [...defaultExclude, ...excludes, /\/src/],
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
    src: getTreeData(filterTree([components])),
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
  const desDir = join(src, '.safex')
  copySync(join(safexTemplateDir, 'editor.ts'), join(desDir, 'editor.ts'))
  copySync(join(safexTemplateDir, 'editor.html'), join(desDir, 'editor.html'))
  const editorSceneFile = join(desDir, 'EditingScene.tsx')
  const template = readFileContent(sceneTemplate);
  const content = renderMustacheFile(template, {})
  writeFileSync(editorSceneFile, content)
  startEditorScene()
}

export function updateEditorJSX(jsxString: string) {
  const editorSceneFile = join(GlobalData.rootProject, '.safex', 'EditingScene.tsx')
  const input = readFileContent(editorSceneFile);
  const parsed = parse(input, { jsx: true, range: true });
  const jsxBlock = getJSXBlock(parsed);
  const [start, end] = jsxBlock.range;
  const content = jsxString.includes('SceneComponent') ? jsxString :
    `<SceneComponent>\n      ${jsxString}\n      </SceneComponent>`
  writeFileSync(
    editorSceneFile,
    spliceString(input, start, end - start, content)
  );
}