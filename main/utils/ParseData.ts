import { readFileContent } from '@@/helper/string.util';
import { parseValue } from '@@/parser/ast';
import { GlobalData } from '@@/parser/global';
import { updateEditorJSX } from '@@/services/FilesService';
import { traverse } from 'estraverse';
import endsWith from 'lodash/endsWith';
import findIndex from 'lodash/findIndex';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import startsWith from 'lodash/startsWith';
import { basename, join } from 'path';
import { getPropsType } from './Helper';
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
  openingElement.attributes.forEach(att => {
    const [start, end] = att.range;
    const [key, value] = fileOrigin.substring(start, end).split('=');
    if (key === 'node') {
      console.log(att);
      const { properties } = att.value.expression
      props[key] = {}
      properties.forEach(p => {
        props[key][p.key.name] = parseValue(p.value);
      })
    } else {
      props[key] = getPropValue(value);
    }
    // console.log(props[key])
  });
  return props;
};

function getNodeName(className) {
  if (!className) { return undefined; }
  if (className.indexOf('--') === -1) { return className; }
  const element = className.split('--')[1];
  if (className.indexOf('__') !== -1) {
    return element.split('__')[1];
  }
  return element;
}

const parseTreeData = (root, fileOrigin = '', depth = 0, index = 0) => {
  const {
    openingElement, children = [],
    type, value, range = []
  } = root;
  const [start, end] = range;
  // console.log('parseTreeData', root);
  const key = `${depth}-${index}-${Math.random()}`;
  if (type === 'JSXText') { return { name: value.trim(), key }; }
  if (type === 'JSXExpressionContainer') {
    return { name: fileOrigin.substring(start, end), key };
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
    key,
    expanded: true,
    tag,
    props,
    components,
    items: filteredChildren.map((child, index) => parseTreeData(child, fileOrigin, depth + 1, index)),
  };
};

// FIXME! load alias when load project
const alias = {
  '@@': './src',
  '@images': './public/images',
};

function resolveAlias(pathSource = '') {
  return Object.entries(alias).reduce(
    (prv, [key, val]) => prv.replace(key, val),
    pathSource
  );
}

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

function getPropType(parsed, exportedName) {
  const propTypes = {};
  traverse(parsed, {
    enter: function (node: any) {
      // console.log(node.type)
      switch (node.type) {
        case 'FunctionDeclaration': {
          if (node.id.name === exportedName && node.params[0]) {
            node.params[0].properties.forEach(({ key }) => {
              if (!propTypes[key.name]) {
                propTypes[key.name] = { type: 'any', isRequired: true };
              }
            });
          }
          break;
        }
        case 'TSTypeAliasDeclaration': {
          if (node.id.name === 'Props') {
            node.typeAnnotation.members.forEach(anno => {
              propTypes[anno.key.name] = {
                type: getPropsType(anno.typeAnnotation),
                isRequired: !anno.optional
              };
            });
          }
          break;
        }
        case 'AssignmentExpression': {
          // console.log('AssignmentExpression', node)
          if (node.left.property?.name === 'propTypes') {
            node.right.properties.forEach(prop => {
              propTypes[prop.key.name] = {
                ...propTypes[prop.key.name],
                type: prop.value.object.property ? prop.value.object.property.name : prop.value.property.name,
                isRequired: prop.value.property.name === 'isRequired',
              };
            });
          } else if (node.left.property?.name === 'defaultProps') {
            node.right.properties.forEach(prop => {
              propTypes[prop.key.name] = {
                ...propTypes[prop.key.name],
                value: prop.value.value,
              };
            });
          }
          break;
        }
      }
    },
    fallback,
  });
  return propTypes;
}

export const convertComponentData = async (parsed, filePath, fileOrigin) => {
  const exportedName = basename(filePath).split('.')[0];
  // console.log('exportedName', exportedName);
  const jsxBlock = getJSXBlock(parsed);
  const treeData = parseTreeData(jsxBlock, fileOrigin);
  const input = readFileContent(filePath);
  const [start, end] = jsxBlock.range;
  const content = input.slice(start, end)
  updateEditorJSX(content)
  return {
    name: exportedName,
    treeData,
  };
};

const genPropsLine = (props: { [key: string]: string }) => {
  const lines = Object.entries(props)
    .map(([key, val]) => {
      if (val === undefined) { return key; }
      if (!val) { return ''; }
      if (key === 'node') {
        return `node={{${Object.entries(val).map(([key, val]) => `${key}: ${val}`).join(', ')}}}`
      }
      if (swapperWith(val, '{', '}') || /^{.*}$/.test(val)) {
        return `${key}=${val}`;
      }
      return `${key}='${val}'`;
    });
  return lines.join(' ');
};

const createTag = (root, imports) => {
  // if (!root.tag) return `${root.name}`;
  const {
    tag, name, props = {}, items = [], title, components = [], imported, isSubModule,
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
  if (!items.length && isEmpty(components)) {
    return `<${tag} ${propsLine}/>`;
  }
  const renderChildren = items.map(child => createTag(child, imports)).join('\n');
  const renderComponents = components.map(child => createTag(child, imports)).join('\n');
  return `<${tag} ${propsLine}>
    ${renderChildren}
    ${renderComponents}
  </${tag}>`;
};

export function genReactComponentString(treeData) {
  const imports = [];
  const component = createTag(treeData, imports);
  return { imports, component };
}
