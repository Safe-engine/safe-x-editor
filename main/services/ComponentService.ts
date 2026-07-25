
import { parse } from '@typescript-eslint/typescript-estree';
import assert from 'assert';
import fs from 'fs';
import pathUtil from 'path';
import { convertComponentData, genReactComponentString, getJSXBlock } from '../utils/ParseData';
import { spliceString } from '../utils/StringHelper';

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
  fs.writeFileSync(targetPath, `import { ${baseClass}, ${baseContainer} } from '@safe-engine/sdl';\n\nexport class ${className} extends ${baseClass} {
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

export const updateComponentTag = ({ nodesData, filePath }) => {
  // console.log('updateComponentTag', nodesData, filePath);
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
  if (generatedImports.length || contentWithEngineImports !== content) {
    const generatedImportBlock = generatedImports.join('\n');
    fs.writeFileSync(filePath, generatedImportBlock ? `${generatedImportBlock}\n${contentWithEngineImports}` : contentWithEngineImports);
  }
  return true;
};
