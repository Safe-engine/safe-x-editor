import { traverse } from 'estraverse';
import { uniq } from 'lodash';
import endsWith from 'lodash/endsWith';
import findIndex from 'lodash/findIndex';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import startsWith from 'lodash/startsWith';
import { basename } from 'path';
import { parseValue } from '../parser/ast';
import { GlobalData } from '../parser/global';
import { hasRender } from './Helper';

export function fallback(node) {
  // console.log(node.type, 'fallback')
  return Object.keys(node);
}

function swapperWith(value, str, endStr?) {
  return startsWith(value, str) && endsWith(value, endStr || str);
}

function getPropValue(value) {
  if (swapperWith(value, '{"', '"}') || swapperWith(value, "{'", "'}")) {
    return value.substring(2, value.length - 2);
  }
  if (swapperWith(value, '"') || swapperWith(value, "'")) {
    return value.substring(1, value.length - 1);
  }
  return value;
}

const getAttributeProps = (openingElement, fileOrigin) => {
  const props = {};
  openingElement?.attributes.forEach(att => {
    const [start, end] = att.range;
    const [key, ...values] = fileOrigin.substring(start, end).split('=');
    if (key === 'node') {
      // console.log(att);
      const { properties } = att.value.expression;
      props[key] = {};
      properties.forEach(p => {
        if (p.key.name === 'xy') {
          // console.log('parseNodeAttribute xy', p)
          const { elements } = p.value;
          const [x, y] = elements.map(parseValue);
          props[key].xy = [x, y];
          return;
        }
        props[key][p.key.name] = parseValue(p.value);
      });
    } else {
      props[key] = values.length ? getPropValue(values.join('=')) : true;
    }
    // console.log(props[key])
  });
  return props;
};

function hasTreeRender(tagName) {
  return hasRender(tagName) || !!GlobalData.componentsCache[tagName];
}

const parseTreeData = (root, fileOrigin = '', childrenIndex = [], index = 0) => {
  const {
    openingElement, children = [],
    type, value, range = []
  } = root;
  const [start, end] = range;
  // console.log('parseTreeData', root);
  const thisIndexes = [...childrenIndex, index];
  const id = `${thisIndexes.join('-')}`;
  if (type === 'JSXText') { return { name: value.trim(), id }; }
  if (type === 'JSXExpressionContainer') {
    const { expression } = root;
    if (expression.type === 'JSXEmptyExpression') { return; }
    if (expression.type === 'CallExpression') {
      // console.log('expression loop', expression)
      // if ('MemberExpression' === expression.callee.type) return
      const startIndex = get(expression, 'arguments[0].params[0].right.value', 0);
      const startIndexSymbol = get(expression, 'arguments[0].params[1].name') || get(expression, 'arguments[0].params[1].left.name', 'i');
      const itemSymbol = get(expression, 'arguments[0].params[0].name') || get(expression, 'arguments[0].params[0].left.name', 'item');
      const count = get(expression, 'callee.object.arguments[0].value', 0);
      const mapFrom = parseValue(expression.callee?.object);
      let res: any = {};
      const body = get(expression, 'arguments[0].body');
      if (body.type === 'JSXElement') {
        res = parseTreeData(body, fileOrigin, thisIndexes, index);
        res.loop = { startIndex, startIndexSymbol, count, mapFrom, itemSymbol };
      }
      if (body.type === 'CallExpression') {
        const startIndex2 = get(body, 'arguments[0].params[0].right.value', 0);
        const startIndexSymbol2 = get(body, 'arguments[0].params[0].left.name', 'i');
        const body2 = get(body, 'arguments[0].body');
        res = parseTreeData(body2, fileOrigin, thisIndexes, index);
        res.grid = { startIndex, startIndexSymbol, startIndex2, startIndexSymbol2 };
      }
      return res;
    }
    return { name: fileOrigin.substring(start, end), id };
  }
  const tag = get(openingElement, 'name.name');
  const props: any = getAttributeProps(openingElement, fileOrigin);
  const components = [];
  const filteredChildren = children.filter(child => {
    const childTag = get(child.openingElement, 'name.name');
    if (childTag && !hasTreeRender(childTag)) {
      components.push({
        tag: childTag,
        props: getAttributeProps(child.openingElement, fileOrigin)
      });
      return false;
    }
    return (typeof child.value !== 'string') || !!child.value.trim();
  });
  return {
    id,
    expanded: true,
    tag,
    props,
    components,
    children: filteredChildren.map((child, index) => {
      return parseTreeData(child, fileOrigin, thisIndexes, index);
    }).filter(Boolean),
  };
};

function getViewJSXBlocks(parsed): any[] {
  let jsxBlocks = [];
  traverse(parsed, {
    enter: function (node: any) {
      if (node.type !== 'MethodDefinition' || node.key?.name !== '__view') {
        return;
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
      this.break();
    },
    fallback,
  });
  return jsxBlocks;
}

function createSyntheticViewBlock(jsxBlocks) {
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

export function getJSXBlock(parsed): any {
  const viewJSXBlocks = getViewJSXBlocks(parsed);
  if (viewJSXBlocks.length > 1) {
    return createSyntheticViewBlock(viewJSXBlocks);
  }
  if (viewJSXBlocks.length === 1) {
    return viewJSXBlocks[0];
  }
  let jsxBlock = {};
  traverse(parsed, {
    enter: function (node: any) {
      if (node.type === 'JSXElement') {
        jsxBlock = node;
        this.break();
      }
    },
    fallback,
  });
  return jsxBlock;
}

export const convertComponentData = async (parsed, filePath, fileOrigin) => {
  const exportedName = basename(filePath).split('.')[0];
  // console.log('exportedName', exportedName);
  const viewJSXBlocks = getViewJSXBlocks(parsed);
  const treeData = viewJSXBlocks.length > 1
    ? viewJSXBlocks.map((jsxBlock, index) => parseTreeData(jsxBlock, fileOrigin, [], index))
    : parseTreeData(viewJSXBlocks[0] || getJSXBlock(parsed), fileOrigin);
  // const input = readFileContent(filePath);
  // const [start, end] = jsxBlock.range;
  // const content = input.slice(start, end)
  // updateEditorJSX(content)
  return {
    name: exportedName,
    treeData,
  };
};

const genPropsLine = (props: { [key: string]: any }) => {
  const lines = Object.entries(props)
    .map(([key, val]) => {
      if (val === undefined || val === null) { return ''; }
      if (val === true) { return key; }
      if (val === false) { return `${key}={false}`; }
      if (typeof val === 'number') { return `${key}={${val}}`; }
      if ((key === 'capInsets' || key === 'offset' || key === 'posList') && Array.isArray(val)) {
        return `${key}={${JSON.stringify(val)}}`;
      }
      if (key === 'node') {
        // console.log('genPropsLine node', val);
        if (val.position?.replace(/\s/g, '') === 'Vec2(0,0)') { return ''; }
        const nodeEntries = Object.entries(val).filter(([, nodeValue]) => nodeValue !== null && nodeValue !== undefined);
        if (!nodeEntries.length) { return ''; }
        // if (val.xy === [0,0]) { return ''; }
        return `node={{ ${nodeEntries.map(([key, nodeValue]) => {
          if (key === 'xy') {
            return `${key}: [${(nodeValue as any[]).map(v => typeof v === 'number' ? Math.round(v) : v).join(', ')}]`;
          }
          return `${key}: ${nodeValue}`;
        }).join(', ')} }}`;
      }
      if (val === '') {
        return `${key}=""`;
      }
      if (swapperWith(val, '{', '}') || /^{.*}$/.test(val)) {
        return `${key}=${val}`;
      }
      return `${key}="${val}"`;
    });
  return lines.join(' ');
};

const INDENT = '  ';

const createTag = (root, imports, baseIndent = '') => {
  // if (!root.tag) return `${root.name}`;
  const {
    tag, name, props = {}, children = [], title, components = [], imported, isSubModule, loop
  } = root;
  if (!tag) {
    return `${title || name}`;
  }
  if (imported) {
    if (isSubModule) {
      const existedIndex = findIndex(imports, (ip: string) => ip.includes(`from '${imported}';\n`));
      if (existedIndex === -1) {
        imports.push(`import { ${tag} } from '${imported}';\n`);
      } else {
        imports[existedIndex] = imports[existedIndex].replace(/{ ([^}]+) }:/g, `$1, ${tag}`);
      }
    } else {
      imports.push(imported);
    }
  }
  if (loop) {
    // console.log('loop found:', loop);
    const { startIndex, startIndexSymbol, count, mapFrom, itemSymbol = '_' } = loop;
    const listSource = mapFrom || `Array(${count})`;
    const childIndent = baseIndent + INDENT;
    return `{${listSource}.map((${itemSymbol}, ${startIndexSymbol}${startIndex ? ' = ' + startIndex : ''}) => (
${childIndent}${createTag({ tag, name, props, children, title, components, imported, isSubModule }, imports, childIndent)}
${baseIndent}))}`;
  }
  const propsLine = genPropsLine(props);
  // console.log('propsLine', propsLine, ';');
  if (!children.length && isEmpty(components)) {
    return `<${tag}${!isEmpty(propsLine) ? ' ' : ''}${propsLine} />`;
  }
  const childIndent = baseIndent + INDENT;
  const tagWithProps = `<${tag}${!isEmpty(propsLine) ? ' ' : ''}${propsLine}>`;
  const close = `</${tag}>`;
  const renderChildren = children.length ? '\n' + children.map(child => childIndent + createTag(child, imports, childIndent)).join('\n') : '';
  const renderComponents = components.length ? '\n' + components.map(child => childIndent + createTag(child, imports, childIndent)).join('\n') : '';
  return `${tagWithProps}${renderChildren}${renderComponents}
${baseIndent}${close}`;
};

export function genReactComponentString(treeData) {
  const imports = [];
  const component = Array.isArray(treeData)
    ? treeData.map(root => createTag(root, imports)).join(';\n')
    : createTag(treeData, imports);
  return { imports, component };
}

export function getListTagUsed(parsed): string[] {
  const listUsed = [];
  traverse(parsed, {
    enter: function (node: any) {
      if (node.type === 'JSXOpeningElement') {
        listUsed.push(node.name.name);
      }
    },
    fallback: 'iteration',
  });
  return uniq(listUsed);
}
