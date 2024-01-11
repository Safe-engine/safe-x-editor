
import { getParamsType } from './component';
import { getTypeAnnotation } from './helper';
import { parseParams } from './parse-data';
import { get, upperFirst } from 'lodash';
import { praseJSXElement } from './jsx';
import { GlobalData } from './global';
import { propertiesToParams } from './helper';

const templatesList = ['getComponent', 'getComponentInChildren', 'getComponentsInChildren', 'hasComponentInChildren'];

function parseMemberExpressionProperty(memberObj, isLeft?) {
  const { type, name } = memberObj;
  switch (type) {
    case 'Identifier':
      if (isLeft === undefined) {
        return name;
      }
      return isLeft ? `set${upperFirst(name)}` : `get${upperFirst(name)}()`;

    default:
      console.error('not supported prop', type);
      break;
  }
}

function parseMemberExpression(member, isLeft?) {
  const { type, object, property, name, computed } = member;
  // if(property.name==='x')
  // console.log(global.enumsName, object.name);
  if (object.name && global.enumsName.includes(object.name)) {
    return `${object.name}_${property.name}`;
  }
  switch (type) {
    case 'MemberExpression': {
      if (object.name) {
        if (object.name.includes('Color') || object.name.includes('Assets'))
          return `${object.name}::${property.name}`;
      }
      if (computed) {
        return `${parseValue(object, false)}.at(${parseValue(property)})`;
      }
      const obj = parseValue(object, false);
      // console.log(obj);
      const isDot = ['Vec2', 'Size'].includes(GlobalData.objectTypeMap[obj]);
      const prop = isDot ? parseValue(property) : parseMemberExpressionProperty(property, isLeft);
      return `${obj}${isDot ? '.' : '->'}${prop}`;
    }
    case 'ThisExpression':
      return `${parseMemberExpressionProperty(property, isLeft)}`;

    default:
      return `${parseValue(member, false)}`;
  }
}

function parseAssignmentExpression({ left, operator, right }) {
  if (operator === '=' && left.type === 'MemberExpression') {
    return `${parseValue(left, true)}(${parseValue(right, false)})`;
  }
  if (operator === '-=' && left.type === 'MemberExpression') {
    return `${parseValue(left, true)}(${parseValue(left, false)} - ${parseValue(right, false)})`;
  }
  if (operator === '+=' && left.type === 'MemberExpression') {
    return `${parseValue(left, true)}(${parseValue(left, false)} +${parseValue(right, false)})`;
  }
  return `${parseValue(left, false)} ${operator} ${parseValue(right, false)}`;
}

function parseUnaryExpression({ operator, argument }) {
  return `${operator}${parseValue(argument, false)}`;
}

function parseConditionalExpression({ test, consequent, alternate }) {
  return `(${parseValue(test)}) ? ${parseValue(consequent)} : ${parseValue(alternate)}`;
}

function parseArrowFunctionExpression({ params, body }) {
  const paramString = getParamsType(params).map(({ type, name }) => `${type} ${name}`).join(', ');
  const bodyContent = parseValue(body)
  return `[=] (${paramString}) {
  ${bodyContent}${(bodyContent.endsWith(';')) ? '' : ';'}
}`;
}

function parseArrayExpression({ elements }) {
  const [first] = elements;
  if (!first) return '{}';
  const { type, callee } = first;
  const paramString = elements.map(parseValue).join(', ');
  return `vector<${callee.name}> {${paramString}}`;
}

function parseUpdateExpression({ operator, argument }) {
  return `${parseValue(argument)}${operator}`;
}

const namesMap = {
  'undefined': 'NULL',
  'null': 'nullptr',
};

export function parseValue(value, isLeft?) {
  if (!value) { return ''; }
  const { type, callee, arguments: args, name } = value;
  switch (type) {
    case 'Identifier':
      return namesMap[name] || name;
    case 'Literal':
      if (value.raw.includes('"') || value.raw.includes('\'')) {
        return `"${value.value}"`;
      }
      return namesMap[value.value] || value.value;
    case 'MemberExpression':
      return parseMemberExpression(value, isLeft);
    case 'CallExpression':
      return parseCallExpression(value);
    case 'UnaryExpression':
      return parseUnaryExpression(value);
    case 'ThisExpression':
      return 'this';
    case 'TSAsExpression':
      return parseTSAsExpression(value);
    case 'BinaryExpression':
      return parseBinaryExpression(value);
    case 'AssignmentExpression':
      return parseAssignmentExpression(value);
    case 'LogicalExpression':
      return parseLogicalExpression(value);
    case 'ConditionalExpression':
      return parseConditionalExpression(value);
    case 'ArrowFunctionExpression':
      return parseArrowFunctionExpression(value);
    case 'ArrayExpression':
      return parseArrayExpression(value);
    case 'UpdateExpression':
      return parseUpdateExpression(value);
    case 'NewExpression':
      return parseNewExpression(callee, args);
    case 'TemplateLiteral':
      return parseTemplateLiteral(value);
    case 'BlockStatement':
      return parseMethodBodyCpp(value, 1);
    case 'TSNonNullExpression':
    case 'JSXExpressionContainer':
      return parseValue(value.expression, isLeft);
    case 'ImportDeclaration':
    case 'ObjectPattern':
      // console.log('ignore', type);
      break;
    default:
      console.error('not supported value', type);
      break;
  }
}

const opsMap = {
  '===': '==',
  '!==': '!=',
};

function parseOperator(op) {
  return opsMap[op] || op;
}

function parseBinaryExpression({ operator, left, right }) {
  if ('BinaryExpression' === right.type && right.operator === '+' || right.operator === '-') {
    return `${parseValue(left, false)} ${parseOperator(operator)} (${parseValue(right, false)})`;
  }
  return `${parseValue(left, false)} ${parseOperator(operator)} ${parseValue(right, false)}`;
}

function parseTSAsExpression(asExp) {
  const { expression } = asExp;
  const type = getTypeAnnotation(asExp);
  return `static_cast<${type}>(${parseValue(expression, false)})`;
}

function parseCallExpression(value) {
  const { typeParameters, callee, arguments: args } = value
  if ('loadJsonFromCache' === callee.name) {
    const { params } = typeParameters
    return `${params[0].typeName.name}::parseJsonAsset(${parseValue(args[0])})`;
  }
  if ('instantiate' === callee.name) {
    const componentName = parseValue(args[0])
    return `${componentName}::create(${propertiesToParams(componentName, args[1].properties)})`;
  }
  const argsString = args.map(a => parseValue(a)).join(', ');
  switch (callee.type) {
    case 'MemberExpression':
      if (templatesList.includes(callee.property.name)) {
        return `${parseValue(callee)}<${argsString}>()`;
      }
      if ('distance' === callee.property.name && callee.object.name === 'Vec2') {
        return `${parseValue(args[0])}.distance(${parseValue(args[1])})`;
      }
      if ('addComponent' === callee.property.name) {
        return `${parseValue(callee)}<${args[0].callee.name}>()`;
      }
      if ('bind' === callee.property.name) {
        // console.log('bind', callee)
        const cbParamNum = GlobalData.cbParamsMap[callee.object.name] || 1
        return `AX_CALLBACK_${cbParamNum}(${GlobalData.currentClassName}::${callee.object.name}, ${parseValue(args[0])})`;
      }
      if (callee.property.name === 'forEach') {
        const { params, body } = args[0];
        if (!params[1]) {
          return `for(auto ${params[0].name} : ${parseValue(callee.object)}) {
${parseMethodBodyCpp(body, 1)}
}`;
        }
        return `for(int ${params[1].name} = 0; ${params[1].name}< ${parseValue(callee.object)}.size(); ${params[1].name}++) {
  auto ${params[0].name} = ${parseValue(callee.object)}.at(${params[1].name});
${parseMethodBodyCpp(body, 1)}
}`;
      }
      break;
    case 'Identifier':
      if (templatesList.includes(callee.name)) {
        return `${parseValue(callee)}<${argsString}>()`;
      }
      if ('addComponent' === callee.name) {
        return `${parseValue(callee)}<${args[0].callee.name}>()`;
      }
      break;
    default:
      break;
  }
  return `${parseValue(callee)}(${argsString})`;
}

function parseNewExpression(callee, args) {
  const argsString = args.map(a => parseValue(a)).join(', ');
  // switch (callee.type) {
  //   case 'MemberExpression':
  //     if (callee.property.name === 'NodePool') {
  //       return `${parseMemberExpression(callee)}<${argsString}>()`;
  //     }
  //     break;

  //   default:
  //     break;
  // }
  return `${parseValue(callee)}(${argsString})`;
}

function parseVariableDeclaration(declaration) {
  const { type, id, init } = declaration;
  const { typeAnnotation } = id;
  switch (type) {
    case 'VariableDeclarator':
      GlobalData.objectTypeMap[parseValue(id)] = getTypeAnnotation(typeAnnotation);
      switch (id.type) {
        case 'ObjectPattern': {
          return id.properties
            .map(prop => {
              const obj = parseValue(init, false)
              const isDot = ['Vec2', 'Size'].includes(GlobalData.objectTypeMap[obj]);
              const specialMember = init.type === 'MemberExpression' && ['winSize', 'size', 'offset'].includes(init.property.name);
              const callProp = (specialMember || isDot) ?
                `.${prop.key.name}` :
                `->get${upperFirst(prop.key.name)}()`;
              return `auto ${prop.value ? prop.value.name : prop.key.name} = ${obj}${callProp};`;
            })
            .join('\n');
        }
        case 'Identifier': {
          const varType = getTypeAnnotation(typeAnnotation);
          // console.log(varType, declaration)
          if (varType !== 'void')
            return `${varType} ${id.name} = ${parseValue(init, false)};`;
        }
      }
      return `auto ${id.name} = ${parseValue(init, false)};`;

    default:
      break;
  }
  return `auto ${id.name} = ${parseValue(init, false)};`;
}

function parseLogicalExpression({ left, right, operator }) {
  return `${parseValue(left)} ${parseOperator(operator)} ${parseValue(right)}`;
}

function parseIfStatement(block) {
  const { test, consequent, alternate } = block;
  const ifStatementContent = `if(${parseValue(test)}) {\n${parseBlock(consequent, 0)}\n}`;
  return `${ifStatementContent}${alternate ? ` else {\n${parseBlock(alternate, 0)}\n}` : ''}`;
}

function parseForBlock(block) {
  const { init: { declarations }, test: { operator, right }, update, body } = block;
  const { init, id } = declarations[0];
  // console.log(init)
  const indexName = id.name;
  const testStr = `${indexName} ${operator} ${parseValue(right, false)}`;
  return `for(int ${indexName} = ${init.value}; ${testStr}; ${indexName}${update.operator}) {
  ${parseBlock(body, 0)}
}`;
}

function parseForOfStatement(block) {
  const { left, right, body } = block;
  const { id } = left.declarations[0];
  // console.log(init)
  return `for(auto ${id.name} : ${parseValue(right, false)}) {
${parseMethodBodyCpp(body, 1)}
}`;
}

function parseWhileBlock(block) {
  const { test, body } = block;
  // console.log(init)
  return `while (${parseValue(test)}) {
  ${parseBlock(body, 0)}
}`;
}

function parseSwitchStatementBlock(block, depth) {
  const { discriminant, cases } = block;
  return `switch(${parseValue(discriminant)}){
    ${cases.map((cas) => {
    const { consequent, test } = cas;
    const block = consequent.map(b => parseBlock(b, depth)).join('\n');
    if (!test) return `default: {
      ${block}
    }`;
    return `case ${parseValue(test)}: {
    ${block}
  }`;
  }).join('\n')}
  }`;
}

function parseOnCallback(args, callee) {
  // console.log(args);
  const { type, name } = args[1];
  if (type === 'ArrowFunctionExpression') return;
  const eventName = parseValue(args[0]);
  const method = name;
  const params = GlobalData.cbMethodParamsMap[method];
  const paramString = getParamsType(params).map(({ type, name }) => `${type} ${name}`).join(', ');
  const paramPassString = getParamsType(params).map(({ name }) => name).join(', ');
  return `${parseValue(callee)}(${eventName}, [=] (${paramString}) {
  ${parseValue(args[1])}(${paramPassString});
});`;
}

function parseBlock(block, depth) {
  const { type, key, value, decorators, typeAnnotation, range,
    computed, static: isStatic, readonly, declarations, expression,
  } = block;
  switch (type) {
    case 'ExpressionStatement': {
      const hasOn = get(expression, 'callee.property.name') === 'on';
      if (hasOn) {
        const { callee, arguments: args } = expression;
        if (args.length === 3) {
          return parseOnCallback(args, callee);
        }
      }
      return `${parseValue(expression)};`;
    }
    case 'VariableDeclaration':
      return `${declarations.map(parseVariableDeclaration).join('\n')}`;
    case 'IfStatement':
    case 'ConditionalExpression':
      return parseIfStatement(block);
    case 'ReturnStatement':
      if (block.argument && block.argument.type === 'JSXElement')
        return praseJSXElement(block.argument)
      return `return ${parseValue(block.argument)};`;
    case 'BlockStatement':
      return parseMethodBodyCpp(block, depth + 1);
    case 'ForStatement':
      return parseForBlock(block);
    case 'ForOfStatement':
      return parseForOfStatement(block);
    case 'WhileStatement':
      return parseWhileBlock(block);
    case 'SwitchStatement':
      return parseSwitchStatementBlock(block, depth + 1);
    case 'BreakStatement':
      return 'break;';
    case 'ExportNamedDeclaration':
      return parseBlock(block.declaration, depth);
    case 'FunctionDeclaration':
      return parseFunctionDeclaration(block, depth);
    case 'ImportDeclaration':
      // console.log('ignore', type);
      break;
    default:
      console.error('not supported statement', type);
      break;
  }
}

export function parseMethodBodyCpp({ body = [] }, depth) {
  const block = body.map(b => parseBlock(b, depth)).join('\n');
  // console.log(depth, block)
  return block;
}

function parseTemplateLiteral(value: any) {
  const { quasis, expressions } = value;
  const ret = [];
  quasis.forEach((q, i) => {
    if (q.value.raw)
      ret.push(`"${q.value.raw}"`);
    if (!q.tail) {
      const expValue = parseValue(expressions[i]);
      const type = GlobalData.objectTypeMap[expValue];
      if (type === 'string')
        ret.push(expValue);
      else
        ret.push(`to_string(${expValue})`);
    }
  });
  return ret.join(' + ');
}

function parseFunctionDeclaration(block: any, depth: any) {
  const { id, body, returnType, params } = block;
  const type = returnType ? getTypeAnnotation(returnType) : 'void';
  const paramsString = parseParams(params);
  return `inline ${type} ${id.name} (${paramsString})
{
${parseMethodBodyCpp(body, depth + 1)}
}
`;
}
