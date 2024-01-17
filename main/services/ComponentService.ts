import {
  createDefaultComponent,
  createDefaultStyleCss,
  createDefaultStyleScss,
  createPropType,
  createUseEffectSetterBlock,
  createUseStateLine,
  pageTemplate,
} from '@@/template/component';
import { createDefaultTsx, createPropTypeTS } from '@@/template/tsx';
import { getComponentNameByPath, getContainer, isTsx } from '@@/utils/Helper';
import {
  convertComponentData,
  genReactComponentString,
  getJSXBlock
} from '@@/utils/ParseData';
import { parse } from '@typescript-eslint/typescript-estree';
import { pascalCase } from 'change-case';
import { traverse } from 'estraverse';
import fs from 'fs';
import isDirectory from 'is-directory';
import { kebabCase } from 'lodash';
import escapeRegExp from 'lodash/escapeRegExp';
import get from 'lodash/get';
import pathUtil from 'path';
import rimraf from 'rimraf';
import { fallback } from '../utils/ParseData';
import { spliceString } from '../utils/StringHelper';
import { dirPathPromise } from './FilesService';
import { lintFile } from './TerminalService';

const { app } = require('electron');

const logFolder = app
  ? app.getPath('logs')
  : pathUtil.join(__dirname, '..', '..'); // ~/Library/Logs/Electron/
export const genFolder = pathUtil.join(logFolder, 'gen');
const logOutput = pathUtil.join(genFolder, 'component.parsed.json');

if (!fs.existsSync(genFolder)) {
  fs.mkdirSync(genFolder);
}

export const loadComponent = async ({ path }) => {
  console.log('loadComponent', path);
  if (isDirectory.sync(path)) {
    return;
  }
  const input = fs.readFileSync(path, { encoding: 'utf8' });
  const parsed = parse(input, { jsx: true, range: true });
  fs.writeFileSync(logOutput, JSON.stringify(parsed, null, 2));
  return convertComponentData(parsed, path, input);
};

export const createNewComponent = ({
  rootFolder,
  path,
  name,
  props,
  defaultProps,
  isUseRedux,
  listState,
  isWithMemo,
  isUseInject,
  isUseTranslate,
  listStateDefault,
  styleType,
  isExtendsChildren,
  isExtendsClassName,
  isCreatePage,
  isContainerComponent,
}) => {
  console.log('createNewComponent', path);
  const componentName = pascalCase(name);
  const componentFolder = pathUtil.join(path, componentName);
  const ext = global.isTSproject ? 'tsx' : 'js';
  const indexFile = pathUtil.join(componentFolder, `index.${ext}`);
  const states = listState ? listState.split(',') : [];
  const isUseCss = styleType === 'css';
  const isUseScss = styleType === 'scss';
  if (isExtendsChildren) {
    props = `children${props ? ', ' : ''}${props}`;
  }
  if (isExtendsClassName) {
    props = `className${props ? ', ' : ''}${props}`;
  }
  const componentContent = (
    global.isTSproject ? createDefaultTsx : createDefaultComponent
  )(
    componentName,
    props,
    defaultProps,
    isUseRedux,
    states,
    listStateDefault.split(','),
    isWithMemo,
    isUseInject,
    isUseTranslate,
    isUseCss,
    isUseScss,
    isExtendsChildren,
    isExtendsClassName
  );
  if (isContainerComponent) {
    const containersFolder = getContainer(path, rootFolder);
    if (!containersFolder) {
      return;
    }
    const compsFolder = pathUtil.join(containersFolder, 'components');
    if (!fs.existsSync(compsFolder)) {
      fs.mkdirSync(compsFolder);
    }
    const componentFile = pathUtil.join(compsFolder, `${componentName}.${ext}`);
    fs.writeFileSync(componentFile, componentContent);
  } else if (styleType === 'tailwind' && !isUseInject && !isCreatePage) {
    fs.writeFileSync(`${componentFolder}.${ext}`, componentContent);
  } else {
    if (!fs.existsSync(componentFolder)) {
      fs.mkdirSync(componentFolder);
    }
    fs.writeFileSync(indexFile, componentContent);
  }
  if (isUseScss) {
    const styleFile = pathUtil.join(componentFolder, 'styles.scss');
    fs.writeFileSync(styleFile, createDefaultStyleScss(componentName));
  } else if (isUseCss) {
    const name = pathUtil.basename(componentFolder);
    const styleFile = pathUtil.join(componentFolder, `${name}.module.css`);
    fs.writeFileSync(styleFile, createDefaultStyleCss(componentName));
  }
  return true;
};

export async function addNewState(data) {
  const { path, name, defaultValue, isUseEffect = false } = data;
  if (isDirectory.sync(path)) {
    return;
  }
  const input = fs.readFileSync(path, { encoding: 'utf8' });
  const parsed: any = parse(input, { jsx: true, range: true });
  const logOutput = pathUtil.join(genFolder, 'component.parsed.json');
  fs.writeFileSync(logOutput, JSON.stringify(parsed, null, 2));
  traverse(parsed, {
    enter: function (node: any) {
      // console.log(node.type)
      switch (node.type) {
        case 'BlockStatement': {
          const returnStatement = node.body.find(
            ({ type, argument }) =>
              type === 'ReturnStatement' && argument.type === 'JSXElement'
          );
          if (returnStatement) {
            const useEffectStatement = node.body.find(
              ({ type, declarations = [] }) => {
                const hasUseEffect = declarations.find(
                  ({ init }) => get(init, 'callee.name') === 'useEffect'
                );
                return type === 'VariableDeclaration' && hasUseEffect;
              }
            );
            let content = createUseStateLine(name, defaultValue);
            if (isUseEffect) {
              content += createUseEffectSetterBlock(`set${pascalCase(name)}`);
            }
            const output = spliceString(
              input,
              returnStatement.start - 3,
              0,
              content
            );
            fs.writeFileSync(path, output);
          }
          break;
        }
      }
    },
    fallback,
  });
  return true;
}

function replaceLast(str, word, newWord) {
  const n = str.lastIndexOf(word);
  // slice the string in 2, one from the start to the lastIndexOf
  // and then replace the word in the rest
  return str.slice(0, n) + str.slice(n).replace(word, newWord);
}

function writeNewComponent(file, componentName, newName) {
  const reg = new RegExp(escapeRegExp(componentName), 'g');
  const content = fs.readFileSync(file, { encoding: 'utf8' });
  const newFile = replaceLast(file, componentName, newName);
  const newContent = content.replace(reg, newName);
  fs.writeFileSync(newFile, newContent);
}

async function duplicateFiles(componentPath, name?) {
  if (!isDirectory.sync(componentPath)) {
    const componentName = getComponentNameByPath(componentPath);
    const newName = name || `${componentName}(2)`;
    writeNewComponent(componentPath, componentName, newName);
    return;
  }
  const componentName = getComponentNameByPath(componentPath);
  const paths = await dirPathPromise(componentPath);
  const newName = name || `${componentName}(2)`;
  const newFolder = replaceLast(componentPath, componentName, newName);
  if (!fs.existsSync(newFolder)) {
    fs.mkdirSync(newFolder);
  }
  paths.dirs.forEach((folder) => {
    fs.mkdirSync(replaceLast(folder, componentName, newName));
  });
  paths.files.forEach((file) => {
    writeNewComponent(file, componentName, newName);
  });
}

export async function renameComponent({ newName, componentPath }) {
  await duplicateFiles(componentPath, newName);
  rimraf.sync(componentPath);
  return true;
}

export async function duplicateComponent(componentPath) {
  await duplicateFiles(componentPath);
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

function getDefaultValue(type) {
  switch (type) {
    case 'number':
      return 0;
    case 'string':
      return `''`;
    case 'array':
      return [];
    case 'bool':
      return false;

    default:
      return `''`;
  }
}
const TypesMap = {
  func: 'Function',
  bool: 'boolean',
};

export function updateComponentPropTypes({ propsData, filePath }) {
  // console.log(propsData, filePath)
  let content = fs.readFileSync(filePath, 'utf8');
  const exportedName = pathUtil.basename(filePath).split('.')[0];
  const propsList = [];
  const defaultProps = [];
  const isTsxComponent = isTsx(filePath);
  Object.entries(propsData).forEach(([key, value]) => {
    const { type, isRequired } = value as any;
    propsList.push({
      name: key,
      type: isTsxComponent ? TypesMap[type] || type : type,
      isRequired,
      defaultValue: getDefaultValue(type),
    });
    if (!isRequired) {
      defaultProps.push({
        name: key,
        defaultValue: getDefaultValue(type),
      });
    }
  });
  if (isTsxComponent) {
    const propTypesContentTS = createPropTypeTS(exportedName, propsList);
    const propTypesLine = `\ntype ${exportedName}Props = {`;
    const functionIndex = content.indexOf('\nfunction');
    if (!content.includes(propTypesLine)) {
      content = spliceString(content, functionIndex, 0, propTypesContentTS);
    } else {
      const startPropIndex = content.indexOf('}', functionIndex) + 1;
      const endPropIndex = content.indexOf(')', startPropIndex);
      content = spliceString(
        content,
        startPropIndex,
        endPropIndex - startPropIndex,
        `: ${exportedName}Props`
      );
      const propTypesIndex = content.indexOf(propTypesLine);
      content = spliceString(
        content,
        propTypesIndex,
        functionIndex - propTypesIndex,
        propTypesContentTS
      );
    }
  } else {
    const propTypesContent = createPropType(
      exportedName,
      propsList,
      defaultProps
    );
    const exportIndex = content.indexOf('\nexport default');
    const propTypesLine = `\n${exportedName}.propTypes`;
    if (!content.includes(propTypesLine)) {
      content = spliceString(content, exportIndex, 0, propTypesContent);
    } else {
      const propTypesIndex = content.indexOf(propTypesLine);
      content = spliceString(
        content,
        propTypesIndex,
        exportIndex - propTypesIndex,
        propTypesContent
      );
    }
    const importPropTypes = `import PropTypes from 'prop-types';\n`;
    if (!content.includes(importPropTypes)) {
      content = `${importPropTypes}${content}`;
    }
  }
  fs.writeFileSync(filePath, content);
  return true;
}

export function addNewPage(componentProps) {
  const { name = '', path: rootPath } = componentProps;
  const pagesFolder = pathUtil.join(rootPath, 'pages');
  const containersFolder = pathUtil.join(rootPath, 'src', 'containers');
  const page = pathUtil.join(pagesFolder, `${kebabCase(name)}.js`);
  const container = pathUtil.join(containersFolder, name);
  if (!fs.existsSync(page)) {
    fs.writeFileSync(page, pageTemplate(pascalCase(name)));
  }
  if (!fs.existsSync(container)) {
    componentProps.path = containersFolder;
    createNewComponent(componentProps);
  }
}
