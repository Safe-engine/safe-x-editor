import { parse } from '@typescript-eslint/typescript-estree';
import { get } from 'lodash';
import { Position } from 'vscode';
import { GlobalData } from '../parser/global';
import { hasRender } from '../parser/jsx';

/**
 * Trả về mảng index các node dẫn đến vị trí con trỏ,
 * bắt đầu từ JSXElement đầu tiên bao quanh vị trí đó.
 */
export function getSelectPathFromJSX(documentText: string, position: Position): number[] {
  const ast = parse(documentText, {
    jsx: true,
    loc: true,
    range: true,
  });

  // Tính offset
  const lines = documentText.split(/\r?\n/);
  const offset =
    lines.slice(0, position.line).reduce((acc, line) => acc + line.length + 1, 0) +
    position.character;

  let bestPath: number[] = [];
  const jsxRoot = getJSXRoot(ast as any);

  function visit(node: any, path: number[], childNum) {
    // console.log('visit', node);
    if (!node?.range) { return; }
    const [start, end] = node.range;
    if (offset < start || offset > end) {
      return;
    }
    bestPath = path;
    // Duyệt tiếp các node con
    let renderIndex = 0;
    for (const value of node.children || []) {
      if (!value?.range) { continue; }
      const [childStart, childEnd] = value.range;
      if (offset < childStart || offset > childEnd) {
        if (isRenderableJSXNode(value)) { renderIndex++; }
        continue;
      }
      if (!isRenderableJSXNode(value)) {
        return;
      }
      visit(value, [...path, renderIndex + childNum], getChildNum(value));
      return;
    }
  }
  const filteredRoot = filterJSXText(jsxRoot);
  if (!filteredRoot) { return bestPath; }
  visit(
    filteredRoot,
    filteredRoot.isSyntheticRoot ? [] : [0],
    filteredRoot.isSyntheticRoot ? 0 : getChildNum(filteredRoot)
  );
  return bestPath;
}

function getJSXRoot(ast: any): any {
  const viewJSXBlocks = getViewJSXBlocks(ast);
  if (viewJSXBlocks.length > 1) {
    return createSyntheticViewBlock(viewJSXBlocks);
  }
  if (viewJSXBlocks.length === 1) {
    return viewJSXBlocks[0];
  }
  let jsxRoot = null;
  traverseAST(ast, (node) => {
    if (node.type === 'JSXElement') {
      jsxRoot = node;
      return true;
    }
    return false;
  });
  return jsxRoot;
}

function getViewJSXBlocks(ast: any): any[] {
  let jsxBlocks: any[] = [];
  traverseAST(ast, (node) => {
    if (node.type !== 'MethodDefinition' || node.key?.name !== '__view') {
      return false;
    }
    jsxBlocks = (node.value?.body?.body || [])
      .map(statement => {
        if (statement.type === 'ExpressionStatement' && statement.expression?.type === 'JSXElement') {
          return statement.expression;
        }
        if (statement.type === 'ReturnStatement' && statement.argument?.type === 'JSXElement') {
          return statement.argument;
        }
        return null;
      })
      .filter(Boolean);
    return true;
  });
  return jsxBlocks;
}

function createSyntheticViewBlock(jsxBlocks: any[]): any {
  const first = jsxBlocks[0];
  const last = jsxBlocks[jsxBlocks.length - 1];
  return {
    type: 'JSXElement',
    openingElement: {
      name: {
        name: 'SceneComponent',
      },
      attributes: [],
    },
    children: jsxBlocks,
    range: [first.range[0], last.range[1]],
    isSyntheticRoot: true,
  };
}

function traverseAST(node: any, visit: (node: any) => boolean): boolean {
  if (!node || typeof node !== 'object') { return false; }
  if (visit(node)) { return true; }
  return Object.values(node).some((value) => {
    if (Array.isArray(value)) {
      return value.some((child) => traverseAST(child, visit));
    }
    if (value && typeof value === 'object' && 'type' in value) {
      return traverseAST(value, visit);
    }
    return false;
  });
}

function getChildNum(node: any): number {
  const tagName = get(node, 'openingElement.name.name');
  const component = tagName && GlobalData.componentsCache[tagName];
  return Array.isArray(component) ? component.length : component?.children?.length ?? 0;
}

function isRenderableJSXNode(node: any): boolean {
  const tagName = get(node, 'openingElement.name.name');
  return !tagName || hasRender(tagName) || !!GlobalData.componentsCache[tagName];
}

export function filterJSXText(node: any): any {
  if (!node || typeof node !== 'object') { return node; }

  // Nếu đây là node JSXText → xoá luôn
  if (node.type === 'JSXText') { return null; }
  // Nếu là mảng → lọc từng phần tử
  if (Array.isArray(node)) {
    return node
      .map((child) => filterJSXText(child))
      .filter((n) => n !== null);
  }
  // Ngược lại, duyệt qua các key con
  const clone: any = {};
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (Array.isArray(value)) {
      const filtered = value
        .map((child) => filterJSXText(child))
        .filter((n) => n !== null);
      clone[key] = filtered;
    } else if (typeof value === 'object' && value !== null) {
      const filtered = filterJSXText(value);
      if (filtered !== null) { clone[key] = filtered; }
    } else {
      clone[key] = value;
    }
  }
  return clone;
}
