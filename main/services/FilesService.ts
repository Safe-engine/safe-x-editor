import {
  filterImages,
  filterTree,
  getTreeData,
  sendError,
} from '@@/utils/Helper';
import DirectoryTree from 'directory-tree';
import * as fs from 'fs';
import dir from 'node-dir';
import path from 'path';
import rimraf from 'rimraf';
import sizeOf from 'image-size';

// const logFolder = app.getPath('logs');
// const genFolder = pathUtil.join(logFolder, 'gen');
// if (!fs.existsSync(genFolder)) {
//   fs.mkdirSync(genFolder);
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
  const packageJson = path.join(src, 'package.json');
  if (!fs.existsSync(packageJson)) {
    return sendError('No package.json.');
  }
  const tsConfigFile = path.join(src, 'tsconfig.json');
  global.isTSproject = fs.existsSync(tsConfigFile);
  const content = fs.readFileSync(packageJson);
  if (!content.includes(`"react"`)) {
    return sendError('Not React project.');
  }
  const components = DirectoryTree(src, {
    extensions: /\.(j|t)sx?$/,
    exclude: [...defaultExclude, ...excludes, /\/public/],
    attributes: ['type', 'extension'],
  });
  const images: any = DirectoryTree(
    src,
    {
      extensions: /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i,
      exclude: [...defaultExclude, ...excludes, /\/src/],
      attributes: ['type'],
    },
    (item: any, path) => {
      const { width, height } = sizeOf(path);
      item.width = width;
      item.height = height;
    }
  );
  // console.log('imagesData', JSON.stringify(images, null, 2));
  // console.log('treeNodeUtils', treeNodeUtils.filterNodes([tree], filterTreeFunction));
  return {
    components: getTreeData(filterTree([components])),
    images: getTreeData(filterImages([images])),
  };
};

export const checkFileExist = (filePath) => fs.existsSync(filePath);

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
