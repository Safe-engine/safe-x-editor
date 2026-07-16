import { GlobalData } from "./global";

function getObjectType(obj, isPointer = false) {
  if (!obj) {
    return 'void';
  }
  const { typeName, type, elementType, left, right, name } = obj;
  switch (type) {
    case 'TSUnionType': {
      return getObjectType(obj.types[0], isPointer);
    }
    case 'TSArrayType': {
      const objectType = getObjectType(elementType, isPointer);
      return `vector<${objectType}>`;
    }
    case 'TSStringKeyword': {
      return 'string';
    }
    case 'TSBooleanKeyword': {
      return 'bool';
    }
    case 'TSNumberKeyword': {
      return 'float';
    }
    case 'TSVoidKeyword': {
      return 'void';
    }
    case 'TSTypeQuery': {
      return 'string';
    }
    case 'TSFunctionType': {
      const { returnType, params } = obj
      return `function<${getTypeAnnotation(returnType)}(${params.map(({ typeAnnotation }) => getTypeAnnotation(typeAnnotation)).join(', ')})>`;
    }
    case 'Identifier':
      if (name.endsWith('JsonAsset')) {
        return GlobalData.jsonAssetsMap[name];
      }
      if (name.endsWith('Enum')) {
        return name;
      }
      if (name === 'Vec2' || name === 'Vec3')
        return 'Vec2';
      if (name === 'Integer')
        return 'int';
      if (name === 'Float')
        return 'float';
      if (isPointer || name.includes('Data') || name === 'Touch')
        return `${name}*`;
      return `ComponentHandle<${name}>`;
    // return getCCPType(name);
    case 'TSTypeReference':
      // console.log('typeName', typeName);
      return getObjectType(typeName, isPointer);
    case 'TSQualifiedName': {
      // console.log(type, obj)
      if (right.name === 'Prefab') {
        return 'PrefabName';
      }
      if (right.name === 'NodePool') {
        return 'NodePool*';
      }
    }
    default:
      return 'void';
  }
}

export function getTypeAnnotation(typeObj, isPointer = false) {
  if (!typeObj) { return 'auto'; }
  return getObjectType(typeObj.typeAnnotation, isPointer);
}
