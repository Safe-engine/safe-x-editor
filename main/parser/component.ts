import { parseValue } from './ast';
import { GlobalData } from './global';
import { getTypeAnnotation } from './helper';

export function isComponentFile(content = '') {
  return content.includes('ComponentX');
}

function getExpressionValue(data) {
  const { object, property, type, name } = data;
  if (type === 'Identifier') {
    return name;
  }
  const objectName = getExpressionValue(object);
  if (objectName.endsWith('Enum')) {
    return `${objectName}_${property.name}`;
  }
  return `${objectName.replace('cc::', '')}::${property.name}`;
}

function getCallExpression(data) {
  const { callee, arguments: args, type, optional } = data;
  return `Vec2(${args[0].value}, ${args[1].value})`;
}

function getObjectExpression(data, content = '') {
  const [start, end] = data.range;
  return content.substring(start, end);
}

function getInitValue(varType, init, content?) {
  if (!init) {
    return '';
  }
  const { type, value, elements, operator, argument, name } = init;
  // console.log('getInitValue', init);
  switch (type) {
    case 'Identifier':
      return name;
    case 'Literal':
      if (value === undefined) {
        return '';
      }
      if (typeof value === 'string') {
        return `'${value}'`;
      }
      if (value === null || value === false || value === 0) {
        return `${value}`;
      }
      return varType === 'string' ? `'${value}'` : value;
    case 'ArrayExpression':
      return `{${elements.map(parseValue).join(', ')}}`;
    case 'UnaryExpression':
      return `${operator}${argument.value}`;
    case 'MemberExpression':
      return getExpressionValue(init);
    case 'CallExpression':
      return getCallExpression(init);
    case 'ObjectExpression':
      return getObjectExpression(init, content);
    case 'ArrowFunctionExpression':
      throw Error('Do not use ArrowFunctionExpression.');
    case 'TSNonNullExpression':
      return getInitValue(varType, init.expression, content);

    default:
      console.log(init);
      throw Error('getInitValue not handled!');
  }
}

export function getParamsType(params = []): { name: string, type: string }[] {
  if (params.length && params[0].type === 'ObjectPattern') {
    const { properties, typeAnnotation } = params[0]
    const { members } = typeAnnotation.typeAnnotation
    return properties.map(p => {
      const { name } = p.key
      const founded = members.find(({ key: mk }) => mk.name === name)
      const type = getTypeAnnotation(founded.typeAnnotation)
      GlobalData.objectTypeMap[name] = type;
      return {
        type,
        name
      }
    })
  }
  return params.map(param => {
    if (param.type === 'AssignmentPattern') {
      const { left, right } = param;
      // console.log(left, right)
      param.type = getTypeAnnotation(left.typeAnnotation);
      param.init = getInitValue(param.type, right);
      param.name = left.name;
      return param;
    }
    param.type = getTypeAnnotation(param.typeAnnotation);
    GlobalData.objectTypeMap[param.name] = param.type;
    return param;
  });
}
