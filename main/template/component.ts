import { NUMBER_NAMES_LIST } from '@@/utils/constants';
import { isPlural } from 'pluralize';

const createDefaultComponent = (
  name,
  props,
  defaultProps,
  isUseRedux,
  listState = [],
  listStateDefault,
  isWithMemo,
  isUseInject,
  isUseTranslate,
  isUseCss,
  isUseScss,
  isExtendsChildren,
  isExtendsClassName
) => ``;

function getTypeByName(name) {
  if (NUMBER_NAMES_LIST.includes(name)) {
    return 'number';
  }
  if (name.startsWith('on')) {
    return 'func';
  }
  if (name.startsWith('is')) {
    return 'bool';
  }
  if (isPlural(name)) {
    return 'array';
  }
  return 'string';
}

const createDefaultStyleScss = (name) => `.${name} {

}
`;

const createDefaultStyleCss = (name) => `@layer components {
  .${name} {

  }
}
`;

const createUseStateLine = (name, defaultValue) => `

`;

const createUseEffectSetterBlock = (setterFunc) => `
  useEffect(() => {
    const newData = logic_code
    ${setterFunc}(newData);
  }, [${setterFunc}]);
`;

export const pageTemplate = (name) => `
import React from 'react';
import ${name} from '../src/containers/${name}';

function ${name}Page() {
  return (
    <${name} />
  );
}

export default ${name}Page;
`;

export function createPropType(name, propsList, defaultProps) {
  return `
${name}.propTypes = {
${propsList
  .map(
    (prop) =>
      `  ${prop.name}: PropTypes.${prop.type}${
        prop.isRequired ? '.isRequired' : ''
      },`
  )
  .join('\n')}
};

${name}.defaultProps = {
${defaultProps
  .map((prop) => `  ${prop.name}: ${prop.defaultValue},`)
  .join(',\n')}
};
`;
}

export {
  createDefaultComponent,
  createDefaultStyleScss,
  createDefaultStyleCss,
  createUseStateLine,
  createUseEffectSetterBlock,
};
