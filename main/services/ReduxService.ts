import {
  createActionBlock, createConstantLine,
  createEffectLine, createExportConstantLine,
  createExportReducer, createImportActionBlock,
  createImportConstantsBlock, createImportImmer,
  createInitStates, createLogicBlock, createLogicFile,
  createReducerCase, createSagaBlock, createSelectorBlock,
  createSelectorFile, fromConstantLine, initSagaBlock,
  initSagaExport
} from '@@/template/redux';
import { createActionBlockTS, createExportReducerTS } from '@@/template/tsx/context';
import { isTsFile } from '@@/utils/Helper';
import { fallback } from '@@/utils/ParseData';
import { spliceString } from '@@/utils/StringHelper';
import { parse } from '@typescript-eslint/typescript-estree';
import { camelCase } from 'lodash';
import { traverse } from 'estraverse';
import fs from 'fs';
import get from 'lodash/get';
import pathUtil from 'path';
import { genFolder } from './ComponentService';

const appendAtLast = (file, data, offset = 0) => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file);
    fs.writeFileSync(file, spliceString(content, content.length - offset, 0, data));
  } else {
    fs.writeFileSync(file, data.trim());
  }
};

const appendAtFirst = (file, data, offset = 0) => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file);
    fs.writeFileSync(file, spliceString(content, offset, 0, data));
  } else {
    fs.writeFileSync(file, data.trim());
  }
};

const appendImportAction = (file, name) => {
  if (fs.existsSync(file)) {
    const input = fs.readFileSync(file, { encoding: 'utf8' });
    const parsed = parse(input, { jsx: true, range: true });
    const logOutput = pathUtil.join(genFolder, 'action.parsed.json');
    fs.writeFileSync(logOutput, JSON.stringify(parsed));
    const importActionBlock = parsed.body.find(block => get(block, 'source.value', '').indexOf('./actions') !== -1);
    if (importActionBlock) {
      const firstImportIndex = get(importActionBlock, 'specifiers[0].range[0]');
      const content = spliceString(input, firstImportIndex, 0, `${camelCase(name)},\n  `);
      fs.writeFileSync(file, content);
    } else {
      appendAtLast(file, createImportActionBlock(name));
    }
  } else {
    fs.writeFileSync(file, createImportActionBlock(name));
  }
};

const appendImportConstant = (file, data) => {
  if (fs.existsSync(file)) {
    const input = fs.readFileSync(file, { encoding: 'utf8' });
    const fromConstantLineIndex = input.indexOf(fromConstantLine);
    if (fromConstantLineIndex !== -1) {
      const content = spliceString(input, fromConstantLineIndex, 0, `${createConstantLine(data)}\n`);
      fs.writeFileSync(file, content);
    } else {
      appendAtFirst(file, createImportConstantsBlock(data));
    }
  } else {
    fs.writeFileSync(file, createImportConstantsBlock(data) + '\n');
  }
};

const appendNewLogic = (file, name, params?) => {
  if (fs.existsSync(file)) {
    const input = fs.readFileSync(file, { encoding: 'utf8' });
    const parsed = parse(input, { jsx: true, range: true });
    const logOutput = pathUtil.join(genFolder, 'logic.parsed.json');
    fs.writeFileSync(logOutput, JSON.stringify(parsed));
    const exportBlock = parsed.body.find(block => block.type === 'ExportDefaultDeclaration');
    if (exportBlock) {
      const [start] = exportBlock.range;
      const elements = get(exportBlock, 'declaration.elements');
      const lastItemIndex = elements[elements.length - 1].range[1] + 1;
      let content = input;
      content = spliceString(content, lastItemIndex, 0, `\n  ${camelCase(name)}Logic,`);
      content = spliceString(content, start, 0, `${createLogicBlock(name, params)}\n`);
      fs.writeFileSync(file, content);
    }
    appendImportAction(file, `${name}Success`);
    appendImportConstant(file, `${name},${name}_CANCEL`);
  } else {
    fs.writeFileSync(file, createLogicFile(name));
  }
};

const appendReducerCase = (file, name, params = 'payload') => {
  const isTs = isTsFile(file)
  if (fs.existsSync(file)) {
    const input = fs.readFileSync(file, { encoding: 'utf8' });
    const parsed: any = parse(input, { jsx: true, range: true });
    const logOutput = pathUtil.join(genFolder, 'reducer.parsed.json');
    fs.writeFileSync(logOutput, JSON.stringify(parsed));
    const exportBlock = parsed.body.find(block => block.type === 'ExportDefaultDeclaration');
    const initStateBlock = parsed.body.find(block => block.type === 'ExportNamedDeclaration');
    if (exportBlock) {
      // const cases = get(exportBlock, 'declaration.body.arguments[1].body.body[0].cases');
      // console.log('cases', cases);
      traverse(parsed, {
        enter: function (node: any) {
          // console.log(node.type)
          switch (node.type) {
            case 'SwitchStatement': {
              const cases = node.cases;
              const lastCaseIndex = cases[cases.length - 1].range[1];
              const lastPropertiesIndex = get(initStateBlock, 'declaration.declarations[0].init.range[1]') - 1;
              let content = input;
              content = spliceString(content, lastCaseIndex, 0, createReducerCase(name, params));
              content = spliceString(content, lastPropertiesIndex, 0, createInitStates(params));
              fs.writeFileSync(file, content);
              break;
            }
          }
        },
        fallback
      });
    } else {
      appendAtFirst(file, createImportImmer());
      appendAtLast(file, (isTs ? createExportReducerTS : createExportReducer)(name, params));
    }
  } else {
    fs.writeFileSync(file, createImportImmer());
    appendAtLast(file, (isTs ? createExportReducerTS : createExportReducer)(name, params));
  }
};

const appendSelector = (file, key, params) => {
  if (fs.existsSync(file)) {
    appendAtLast(file, createSelectorBlock(key, params));
  } else {
    fs.writeFileSync(file, createSelectorFile(key, params));
  }
};

const appendNewSaga = (file, name, paramsString, isStrapi) => {
  const isFirstCreate = !fs.existsSync(file);
  if (isFirstCreate) {
    fs.writeFileSync(file, initSagaBlock(isStrapi));
  }
  appendImportConstant(file, name);
  appendImportAction(file, `${name}Success`);
  appendImportAction(file, `${name}Fail`);
  const content = fs.readFileSync(file, { encoding: 'utf8' });
  const index = content.indexOf('export default function*');
  if (isFirstCreate) {
    appendAtLast(file, createSagaBlock(name, paramsString, isStrapi));
    appendAtLast(file, initSagaExport());
  } else {
    appendAtFirst(file, createSagaBlock(name, paramsString, isStrapi), index - 1);
  }
  appendAtLast(file, createEffectLine(name), 2);
};

export const createAction = ({
  path = '', name, params, isUseLogic = false,
  isUseSaga = false,
  isUseSelectors = false,
  isUseStrapi = true,
  filesPath,
}) => {
  // console.log('createAction', path);
  const isSelectedFiles = fs.existsSync(filesPath.constants)
    && fs.existsSync(filesPath.actions)
    && fs.existsSync(filesPath.reducers);
  const isTs = global.isTSproject;
  const ext = isTs ? 'ts' : 'js';
  if (path || isSelectedFiles) {
    const createFolder = path && fs.lstatSync(path).isFile()
      ? pathUtil.dirname(path) : path;
    const constants = filesPath.constants || pathUtil.join(createFolder, `constants.${ext}`);
    const key = pathUtil.basename(createFolder);
    const constLine = createExportConstantLine(key, name);
    if (fs.existsSync(constants) &&
      fs.readFileSync(constants, 'utf-8').includes(constLine)) {
      console.log('constants existed');
      return false;
    }
    const action = filesPath.actions || pathUtil.join(createFolder, `actions.${ext}`);
    const reducer = filesPath.reducers || pathUtil.join(createFolder, `reducer.${ext}`);
    const selectors = filesPath.selectors || pathUtil.join(createFolder, `selectors.${ext}`);
    const paramsString = params || 'payload';
    // console.log('params', paramsString);
    appendAtLast(action, '\n' + (isTs ? createActionBlockTS : createActionBlock)(name, paramsString));
    appendAtLast(constants, constLine);
    appendReducerCase(reducer, name, paramsString);
    appendImportConstant(action, name);
    appendImportConstant(reducer, name);
    if (isUseSaga) {
      const saga = filesPath.saga || pathUtil.join(createFolder, `saga.${ext}`);
      const constantsData = ['success', 'fail']
        .map(eff => `${name}_${eff}`)
        .map(n => createExportConstantLine(key, n))
        .join('');
      appendAtLast(constants, `${constantsData}\n`);
      appendImportConstant(action, `${name},${name}_success,${name}_fail`);
      appendAtLast(action, (isTs ? createActionBlockTS : createActionBlock)(`${name}_success`, 'payload'));
      appendAtLast(action, (isTs ? createActionBlockTS : createActionBlock)(`${name}_fail`, 'error'));
      appendNewSaga(saga, name, paramsString, isUseStrapi);
      appendImportConstant(reducer, `${name}Success`);
      appendReducerCase(reducer, `${name}_success`, paramsString);
    } else if (isUseLogic) {
      const logic = filesPath.logic || pathUtil.join(createFolder, `logic.${ext}`);
      const constantsData = ['success', 'cancel', 'error']
        .map(eff => `${name}_${eff}`)
        .map(n => createExportConstantLine(key, n))
        .join('');
      appendAtLast(constants, `${constantsData}\n`);
      appendImportConstant(action, `${name}_success`);
      appendAtLast(action, (isTs ? createActionBlockTS : createActionBlock)(`${name}_success`, 'payload'));
      appendNewLogic(logic, name);
      appendImportConstant(reducer, `${name}Success`);
      appendReducerCase(reducer, `${name}_success`, paramsString);
    }
    if (params && isUseSelectors) appendSelector(selectors, key, params);
  }
  return true;
};