
import { parse } from '@typescript-eslint/typescript-estree';
import fs from 'fs';
import pathUtil from 'path';
import { convertComponentData, genReactComponentString, getJSXBlock } from '../utils/ParseData';
import { spliceString } from '../utils/StringHelper';
import { lintFile } from './TerminalService';

export const loadComponent = async ({ path }) => {
  // console.log('loadComponent', path);
  const input = fs.readFileSync(path, { encoding: 'utf8' });
  const parsed = parse(input, { jsx: true, range: true });
  // fs.writeFileSync(logOutput, JSON.stringify(parsed, null, 2));
  return convertComponentData(parsed, path, input);
};

// function replaceLast(str, word, newWord) {
//   const n = str.lastIndexOf(word);
//   // slice the string in 2, one from the start to the lastIndexOf
//   // and then replace the word in the rest
//   return str.slice(0, n) + str.slice(n).replace(word, newWord);
// }

// function writeNewComponent(file, componentName, newName) {
//   const reg = new RegExp(escapeRegExp(componentName), 'g');
//   const content = fs.readFileSync(file, { encoding: 'utf8' });
//   const newFile = replaceLast(file, componentName, newName);
//   const newContent = content.replace(reg, newName);
//   fs.writeFileSync(newFile, newContent);
// }

// async function duplicateFiles(componentPath, name?) {
//   if (!isDirectory.sync(componentPath)) {
//     const componentName = getComponentNameByPath(componentPath);
//     const newName = name || `${componentName}(2)`;
//     writeNewComponent(componentPath, componentName, newName);
//     return;
//   }
//   const componentName = getComponentNameByPath(componentPath);
//   const paths = await dirPathPromise(componentPath);
//   const newName = name || `${componentName}(2)`;
//   const newFolder = replaceLast(componentPath, componentName, newName);
//   if (!fs.existsSync(newFolder)) {
//     fs.mkdirSync(newFolder);
//   }
//   paths.dirs.forEach((folder) => {
//     fs.mkdirSync(replaceLast(folder, componentName, newName));
//   });
//   paths.files.forEach((file) => {
//     writeNewComponent(file, componentName, newName);
//   });
// }

// export async function renameComponent({ newName, componentPath }) {
//   await duplicateFiles(componentPath, newName);
//   rimraf.sync(componentPath);
//   return true;
// }

// export async function duplicateComponent(componentPath) {
//   await duplicateFiles(componentPath);
//   return true;
// }

export async function renameComponent({ newName, componentPath, path }) {
  const source = componentPath || path;
  const target = pathUtil.join(pathUtil.dirname(source), newName);
  fs.renameSync(source, target);
  return true;
}

export async function duplicateComponent({ componentPath, path }) {
  const source = componentPath || path;
  const parsed = pathUtil.parse(source);
  const target = pathUtil.join(parsed.dir, `${parsed.name}(2)${parsed.ext}`);
  fs.cpSync(source, target, { recursive: true });
  return true;
}

export const updateComponentTag = ({ nodesData, filePath }) => {
  console.log('updateComponentTag', nodesData, filePath);
  const { component, imports } = genReactComponentString(nodesData);
  const input = fs.readFileSync(filePath, { encoding: 'utf8' });
  const parsed = parse(input, { jsx: true, range: true });
  const [start, end] = getJSXBlock(parsed).range;
  // const logOutput = writeFileSync(pathUtil.join(genFolder,'component.html.parsed.)
  fs.writeFileSync(
    filePath,
    spliceString(input, start, end - start, component)
  );
  lintFile(filePath)
  const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
  if (!imports.length) return true;
  const filtered = imports.filter((imp) => !content.includes(imp));
  fs.writeFileSync(filePath, `${filtered.join('\n')}\n${content}`);
  return true;
};
