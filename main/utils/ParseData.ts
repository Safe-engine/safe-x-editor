import { parseValue } from '@@/parser/ast';
import { traverse } from 'estraverse';
import { uniq } from 'lodash';
import endsWith from 'lodash/endsWith';
import findIndex from 'lodash/findIndex';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import startsWith from 'lodash/startsWith';
import { basename } from 'path';
import { noRenderList } from './constants';

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
    const [key, value] = fileOrigin.substring(start, end).split('=');
    if (key === 'node') {
      // console.log(att);
      const { properties } = att.value.expression
      props[key] = {}
      properties.forEach(p => {
        if (p.key.name === 'xy') {
          // console.log('parseNodeAttribute xy', p)
          const { elements } = p.value
          const [x, y] = elements.map(parseValue)
          props[key].xy = [x, y];
          return
        }
        props[key][p.key.name] = parseValue(p.value);
      })
    } else {
      props[key] = getPropValue(value);
    }
    // console.log(props[key])
  });
  return props;
};

const parseTreeData = (root, fileOrigin = '', childrenIndex = [], index = 0) => {
  const {
    openingElement, children = [],
    type, value, range = []
  } = root;
  const [start, end] = range;
  // console.log('parseTreeData', root);
  const thisIndexes = [...childrenIndex, index];
  const id = `${thisIndexes.join('-')}.${Math.random()}`;
  if (type === 'JSXText') { return { name: value.trim(), id }; }
  if (type === 'JSXExpressionContainer') {
    const { expression } = root
    if (expression.type === 'JSXEmptyExpression')
      return
    if (expression.type === 'CallExpression') {
      // console.log('expression', expression)
      // if ('MemberExpression' === expression.callee.type) return
      const startIndex = get(expression, 'arguments[0].params[0].right.value', 0)
      const startIndexSymbol = get(expression, 'arguments[0].params[0].left.name', 'i')
      const count = get(expression, 'callee.object.arguments[0].value', 0);
      let res: any = {};
      const body = get(expression, 'arguments[0].body')
      if (body.type === 'JSXElement') {
        res = parseTreeData(body, fileOrigin, thisIndexes, index)
        res.loop = { startIndex, startIndexSymbol, count }
      }
      if (body.type === 'CallExpression') {
        const startIndex2 = get(body, 'arguments[0].params[0].right.value', 0)
        const startIndexSymbol2 = get(body, 'arguments[0].params[0].left.name', 'i')
        const body2 = get(body, 'arguments[0].body')
        res = parseTreeData(body2, fileOrigin, thisIndexes, index)
        res.grid = { startIndex, startIndexSymbol, startIndex2, startIndexSymbol2 }
      }
      return res
    }
    return { name: fileOrigin.substring(start, end), id };
  }
  const tag = get(openingElement, 'name.name');
  const props: any = getAttributeProps(openingElement, fileOrigin);
  const components = []
  const filteredChildren = children.filter(child => {
    const childTag = get(child.openingElement, 'name.name');
    if (noRenderList.includes(childTag)) {
      components.push({
        tag: childTag,
        props: getAttributeProps(child.openingElement, fileOrigin)
      })
      return false
    }
    return (typeof child.value !== 'string') || !!child.value.trim()
  });
  return {
    id,
    expanded: true,
    tag,
    props,
    components,
    children: filteredChildren.map((child, index) => {
      return parseTreeData(child, fileOrigin, thisIndexes, index)
    }).filter(Boolean),
  };
};

export function getJSXBlock(parsed): any {
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
  const jsxBlock = getJSXBlock(parsed);
  const treeData = parseTreeData(jsxBlock, fileOrigin);
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
      if (val === undefined) { return key; }
      if (!val) { return ''; }
      if (key === 'node') {
        if (val.position === 'Vec2(0,0)' || val.position === 'Vec2(0, 0)') return ''
        if (val.xy === '[0,0]' || val.xy === '[0, 0]') return ''
        return `node={{${Object.entries(val).map(([key, val]) => {
          if (key === 'xy') return `${key}: [${(val as number[]).map(Math.round)}]`
          return `${key}: ${val}`
        }).join(', ')}}}`
      }
      if (swapperWith(val, '{', '}') || /^{.*}$/.test(val)) {
        return `${key}=${val}`;
      }
      return `${key}="${val}"`;
    });
  return lines.join(' ');
};

const createTag = (root, imports) => {
  // if (!root.tag) return `${root.name}`;
  const {
    tag, name, props = {}, children = [], title, components = [], imported, isSubModule,
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
  const propsLine = genPropsLine(props);
  // console.log('propsLine', propsLine, ';');
  if (!children.length && isEmpty(components)) {
    return `<${tag}${!isEmpty(propsLine) ? ' ' : ''}${propsLine}/>`;
  }
  const renderChildren = children.length ? '\n' + children.map(child => createTag(child, imports)).join('\n') : '';
  const renderComponents = components.length ? '\n' + components.map(child => createTag(child, imports)).join('\n') : '';
  return `<${tag}${!isEmpty(propsLine) ? ' ' : ''}${propsLine}>${renderChildren}${renderComponents}
</${tag}>`;
};

export function genReactComponentString(treeData) {
  const imports = [];
  const component = createTag(treeData, imports);
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
