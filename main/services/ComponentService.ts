
import { parse } from '@typescript-eslint/typescript-estree';
import assert from 'assert';
import fs from 'fs';
import pathUtil from 'path';
import { GlobalData } from '../parser/global';
import { renderList } from '../utils/constants';
import { removeTextureMatchingNodeSizes } from '../utils/NodeSize';
import { convertComponentData, genReactComponentString, getJSXBlock } from '../utils/ParseData';
import { spliceString } from '../utils/StringHelper';
import { parseAssetsSrcFile } from './assets';

export const loadComponent = async ({ path }) => {
  // console.log('loadComponent', path);
  const input = fs.readFileSync(path, { encoding: 'utf8' });
  const parsed = parse(input, { jsx: true, range: true });
  // fs.writeFileSync(logOutput, JSON.stringify(parsed, null, 2));
  return convertComponentData(parsed, path, input);
};

export function createComponentFile({ rootFolder, directory, name, kind }) {
  const className = String(name || '').trim();
  if (!/^[A-Za-z_$][\w$]*$/.test(className)) throw Error('Use a valid class name.');
  if (kind !== 'component' && kind !== 'scene') throw Error('Invalid file type.');

  const root = pathUtil.resolve(rootFolder, 'src');
  const targetDirectory = pathUtil.resolve(directory);
  const expectedFolder = pathUtil.resolve(root, kind === 'component' ? 'components' : 'scene');
  if (targetDirectory !== expectedFolder || !targetDirectory.startsWith(`${root}${pathUtil.sep}`)) {
    throw Error(`New ${kind}s can only be created in ${expectedFolder}.`);
  }

  const targetPath = pathUtil.join(targetDirectory, `${className}.tsx`);
  if (fs.existsSync(targetPath)) throw Error(`${className}.tsx already exists.`);

  const baseClass = kind === 'component' ? 'ComponentX' : 'Scene';
  const baseContainer = kind === 'component' ? 'Container' : 'Scene';
  const importBaseContainer = kind === 'component' ? ', ' + baseContainer : '';
  fs.writeFileSync(targetPath, `import { ${baseClass}${importBaseContainer} } from '@safe-engine/sdl';\n\nexport class ${className} extends ${baseClass} {
    __view() {
      <${baseContainer} />
    }
  }\n`);
  return { success: true, path: targetPath };
}

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

function indent(string, w) {
  if (1 == arguments.length) w = 2;
  assert('string' == typeof string);
  assert('string' == typeof w || 'number' == typeof w);
  if ('number' == typeof w) w = new Array(w + 1).join(' ');
  return string.replace(/^(?!$)/mg, w);
};

const PROPERTY_PANEL_COMPONENTS = new Set([
  'BoxCollider',
  'CircleCollider',
  'PolygonCollider',
  'Widget',
  'RigidBody',
  'SpineBonesControl',
]);

function getMissingEngineComponentImports(nodesData, content: string) {
  const componentTags = new Set<string>();
  const collectComponentTags = (node) => {
    if (!node || typeof node !== 'object') return;
    if (renderList.includes(node.tag)) componentTags.add(node.tag);
    for (const component of node.components || []) {
      if (PROPERTY_PANEL_COMPONENTS.has(component.tag)) componentTags.add(component.tag);
    }
    for (const child of node.children || []) collectComponentTags(child);
  };

  (Array.isArray(nodesData) ? nodesData : [nodesData]).forEach(collectComponentTags);
  const imported = new Set<string>();
  const importPattern = /import\s+\{([^}]*)\}\s+from\s+['"]@safe-engine\/sdl['"];?/g;
  for (const match of content.matchAll(importPattern)) {
    for (const specifier of match[1].split(',')) {
      imported.add(specifier.trim());
    }
  }
  return [...componentTags].filter((tag) => !imported.has(tag));
}

function addEngineComponentImports(content: string, components: string[]) {
  if (!components.length) return content;
  const importPattern = /import\s+\{([^}]*)\}\s+from\s+['"]@safe-engine\/sdl['"];?/;
  const match = importPattern.exec(content);
  if (!match) return `import { ${components.join(', ')} } from '@safe-engine/sdl';\n${content}`;

  const existing = match[1].trim();
  const merged = existing ? `${existing}, ${components.join(', ')}` : components.join(', ');
  return `${content.slice(0, match.index)}${match[0].replace(match[1], ` ${merged} `)}${content.slice(match.index + match[0].length)}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getColorNamesUsedByProps(nodesData, colorNames: Set<string>) {
  const used = new Set<string>();
  const collectColorValue = (value) => {
    if (value === undefined || value === null) return;
    const source = Array.isArray(value) ? value.join(',') : String(value);
    for (const colorName of colorNames) {
      if (new RegExp(`\\b${escapeRegExp(colorName)}\\b`).test(source)) used.add(colorName);
    }
  };
  const collectProps = (props) => {
    for (const [key, value] of Object.entries(props || {})) {
      if (['color', 'outline', 'shadow'].includes(key)) collectColorValue(value);
      if (key === 'node' && value && typeof value === 'object') collectColorValue(value.color);
    }
  };
  const collectNode = (node) => {
    if (!node || typeof node !== 'object') return;
    collectProps(node.props);
    for (const component of node.components || []) collectProps(component.props);
    for (const child of node.children || []) collectNode(child);
  };

  (Array.isArray(nodesData) ? nodesData : [nodesData]).forEach(collectNode);
  return [...used];
}

function addColorImports(content: string, filePath: string, nodesData) {
  const colorsFilePath = pathUtil.join(GlobalData.rootProject, 'src', 'helper', 'colors.ts');
  const colorNames = new Set(parseAssetsSrcFile(colorsFilePath, undefined, true).map((color) => color.key));
  const usedColorNames = getColorNamesUsedByProps(nodesData, colorNames);
  if (!usedColorNames.length) return content;

  let importPath = pathUtil.relative(pathUtil.dirname(filePath), colorsFilePath).replace(/\\/g, '/').replace(/\.ts$/, '');
  if (!importPath.startsWith('.')) importPath = `./${importPath}`;
  const importPattern = new RegExp(`import\\s+\\{([^}]*)\\}\\s+from\\s+(['"])${escapeRegExp(importPath)}\\2;?`);
  const match = importPattern.exec(content);
  if (!match) return `import { ${usedColorNames.join(', ')} } from '${importPath}';\n${content}`;

  const importedNames = match[1].split(',').map((name) => name.trim());
  const missingNames = usedColorNames.filter((name) => !importedNames.includes(name));
  if (!missingNames.length) return content;
  const merged = `${importedNames.filter(Boolean).join(', ')}, ${missingNames.join(', ')}`;
  return `${content.slice(0, match.index)}${match[0].replace(match[1], ` ${merged} `)}${content.slice(match.index + match[0].length)}`;
}

function getSpriteFrameNamesUsedByProps(nodesData, spriteFrameNames: Set<string>) {
  const used = new Set<string>();
  const collectProps = (props) => {
    const spriteFrame = props?.spriteFrame;
    if (typeof spriteFrame !== 'string') return;
    const name = spriteFrame.replace(/^\{(.*)\}$/, '$1');
    if (spriteFrameNames.has(name)) used.add(name);
  };
  const collectNode = (node) => {
    if (!node || typeof node !== 'object') return;
    collectProps(node.props);
    for (const component of node.components || []) collectProps(component.props);
    for (const child of node.children || []) collectNode(child);
  };

  (Array.isArray(nodesData) ? nodesData : [nodesData]).forEach(collectNode);
  return [...used];
}

function addSpriteFrameImports(content: string, filePath: string, nodesData) {
  const spriteFramesFilePath = pathUtil.join(GlobalData.rootProject, 'src', 'assets', 'TextureAssets.ts');
  const spriteFrameNames = new Set(parseAssetsSrcFile(spriteFramesFilePath).map((asset) => asset.key));
  const usedSpriteFrameNames = getSpriteFrameNamesUsedByProps(nodesData, spriteFrameNames);
  if (!usedSpriteFrameNames.length) return content;

  let importPath = pathUtil.relative(pathUtil.dirname(filePath), spriteFramesFilePath).replace(/\\/g, '/').replace(/\.ts$/, '');
  if (!importPath.startsWith('.')) importPath = `./${importPath}`;
  const importPattern = new RegExp(`import\\s+\\{([^}]*)\\}\\s+from\\s+(['"])${escapeRegExp(importPath)}\\2;?`);
  const match = importPattern.exec(content);
  if (!match) return `import { ${usedSpriteFrameNames.join(', ')} } from '${importPath}'\n${content}`;

  const importedNames = match[1].split(',').map((name) => name.trim());
  const missingNames = usedSpriteFrameNames.filter((name) => !importedNames.includes(name));
  if (!missingNames.length) return content;
  const merged = `${importedNames.filter(Boolean).join(', ')}, ${missingNames.join(', ')}`;
  return `${content.slice(0, match.index)}${match[0].replace(match[1], ` ${merged} `)}${content.slice(match.index + match[0].length)}`;
}

export const updateComponentTag = ({ nodesData, filePath }) => {
  // console.log('updateComponentTag', nodesData, filePath);
  const assetsPath = pathUtil.join(GlobalData.rootProject, 'src', 'assets');
  const assetPanel: any = { webview: { asWebviewUri: (uri) => uri.fsPath } };
  const textures = parseAssetsSrcFile(pathUtil.join(assetsPath, 'TextureAssets.ts'), assetPanel);
  const spriteFrames = parseAssetsSrcFile(pathUtil.join(assetsPath, 'SpriteFrames.ts'), assetPanel);
  removeTextureMatchingNodeSizes(nodesData, textures, spriteFrames);
  const { component, imports } = genReactComponentString(nodesData);
  const input = fs.readFileSync(filePath, { encoding: 'utf8' });
  const parsed = parse(input, { jsx: true, range: true });
  const [start, end] = getJSXBlock(parsed).range;
  const indentLength = input.slice(0, start).match(/([ \t]+)$/)?.[1]?.length || 0;
  // console.log('updateComponentTag', start, end, indentLength);
  // const logOutput = writeFileSync(pathUtil.join(genFolder,'component.html.parsed.)
  fs.writeFileSync(
    filePath,
    spliceString(input, start - indentLength, end - start + indentLength, indent(component, indentLength)),
  );
  // lintFile(filePath)
  const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
  const generatedImports = imports.filter((imp) => !content.includes(imp));
  const missingEngineComponents = getMissingEngineComponentImports(nodesData, content);
  const contentWithEngineImports = addEngineComponentImports(content, missingEngineComponents);
  const contentWithColorImports = addColorImports(contentWithEngineImports, filePath, nodesData);
  const contentWithSpriteFrameImports = addSpriteFrameImports(contentWithColorImports, filePath, nodesData);
  if (generatedImports.length || contentWithSpriteFrameImports !== content) {
    const generatedImportBlock = generatedImports.join('\n');
    fs.writeFileSync(filePath, generatedImportBlock ? `${generatedImportBlock}\n${contentWithSpriteFrameImports}` : contentWithSpriteFrameImports);
  }
  return true;
};
