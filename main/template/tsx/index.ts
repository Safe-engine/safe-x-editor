import { NUMBER_NAMES_LIST } from '@@/utils/constants';
import { camelCase, pascalCase } from 'change-case';
import { isPlural } from 'pluralize';

export function createPropTypeTS(exportedName, propsList) {
  return `
type ${exportedName}Props = {
${propsList
  .map(
    ({ name, type, isRequired }) =>
      `  ${name.trim()}${isRequired ? '' : '?'}: ${type};`
  )
  .join('\n')}
};
`;
}

function getTypeByName(name = '') {
  if (NUMBER_NAMES_LIST.includes(name)) {
    return 'number';
  }
  if (name.startsWith('on')) {
    return 'Function';
  }
  if (name.startsWith('is')) {
    return 'boolean';
  }
  if (isPlural(name)) {
    return 'Array<any>';
  }
  return 'string';
}

function getDefaultPropList(props) {
  return props.split(',').map((name) => ({
    name,
    type: getTypeByName(name),
    isRequired: false,
  }));
}

export const createDefaultTsx = (
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
) => `${
  isUseScss
    ? `import './styles.scss;'\n`
    : `${isUseCss ? `import styles from './${name}.module.css;'\n` : ''}`
}${
  isUseInject
    ? `import reducer from './reducer';
import saga from './saga';
import { useInjectReducer } from '@@/helpers/injectReducer';
import { useInjectSaga } from '@@/helpers/injectSaga';
import { key } from './selectors';\n`
    : ''
}${
  isUseTranslate ? `import { useTranslation } from '@@/i18n';` : ''
}import React, { ${listState.length ? 'useState' : ''}${
  isWithMemo ? ', memo' : ''
} } from 'react';
${
  isUseRedux ? `import { useDispatch, useSelector } from 'react-redux';\n` : ''
}${props ? createPropTypeTS(name, getDefaultPropList(props)) : ''}

function ${name}(${props ? `{ ${props} }: ${name}Props` : ''}) {${
  isUseInject
    ? `\n  useInjectReducer({ key, reducer });
  useInjectSaga({ key, saga });`
    : ''
}${isUseRedux ? '\n  const dispatch = useDispatch();' : ''}${
  isUseTranslate ? `\n  const { t } = useTranslation();` : ''
}
${listState.map(
  (state, i) =>
    `  const [${camelCase(state)}, set${pascalCase(state)}] = useState(${
      listStateDefault[i]
    });\n`
)}
  return (
    <div className=${isExtendsClassName ? '{`${className} `}' : `'${name}'`}>
      ${isExtendsChildren ? '{children}' : ''}
    </div>
  );
}

export default ${isWithMemo ? `memo(${name})` : name};
`;
