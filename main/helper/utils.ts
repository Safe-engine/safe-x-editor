import { camelCase, upperFirst } from 'lodash';

export function pascalCase(str) {
  return upperFirst(camelCase(str))
}

export function spliceSlice(str = '', index = 0, count = 0, add = '') {
  // We cannot pass negative indexes directly to the 2nd slicing operation.
  if (index < 0) {
    index = str.length + index;
    if (index < 0) {
      index = 0;
    }
  }

  return str.slice(0, index) + (add || '') + str.slice(index + count);
}

export function getAndIncrementLastNumber(str) {
  return str.replace(/\d+$/, function (s) {
    return +s + 1;
  });
}

export function getCustomComponents(components = []) {
  return components.filter(({ __type__ }) => !__type__.includes('cc.'));
}

export function getSceneName(scene) {
  return pascalCase(`${scene}Fire`);
}

export function getAssetName(scene) {
  return pascalCase(`${scene}AssetFire`);
}

export function getEntityVarName(entityName: string, component = '') {
  return `${entityName}${component.replace('cc.', '').replace('sp.', '')}`;
}

export function getNodeName(entityName: string) {
  return `${entityName}Node`;
}

export function createSetter(prop: string, value: string) {
  return `set${upperFirst(prop)}(${value})`;
}

export function vec2cpp(v2: any) {
  const { x, y } = v2;
  return `Vec2(${x}, ${y})`;
}

export function createPositionPair(v2: any) {
  const { x, y } = v2;
  return `${x}, ${y}`;
}
