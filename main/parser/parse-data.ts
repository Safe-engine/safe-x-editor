import ESTraverse from 'estraverse';
import { getTypeAnnotation } from './helper';

function parseProperties(parsed, hpp) {
  hpp.append('private:\n');
  ESTraverse.traverse(parsed, {
    leave(node: any, parent) {
      if (node.type === 'ClassProperty') {
        const { key: { name }, value, typeAnnotation } = node;
        // console.log(typeAnnotation);
        const variableType = getTypeAnnotation(typeAnnotation);
        const initial = value ? ` = ${value.value}` : '';
        const staticStr = name === 'instance' ? 'static ' : '';
        hpp.append(`  ${staticStr}${variableType} ${name}${initial};\n`);
      }
    }
  })
}

export function parseParams(params = []) {
  const res = params.map((param) => {
    const { name, typeAnnotation } = param;
    const paramType = getTypeAnnotation(typeAnnotation);
    return `${paramType} ${name}`;
  });
  return res.join(', ');
}
