import {
  constantCase, pascalCase, camelCase, pathCase,
} from 'change-case';

const paramStringToArray = params => params.split(',');

export const createExportConstantLine = (key, name) => `
export const ${constantCase(name)} = '${pascalCase(key)}/${constantCase(name)}';`;
// export const ${constantCase(name)} = '${constantCase(name)}';`;

export const createActionBlock = (name, params) => `
export function ${camelCase(name)}(${params}) {
  return {
    type: ${constantCase(name)},
    ${params}
  };
}
`;

export const createConstantLine = name => '  ' + paramStringToArray(name)
  .map(constantCase)
  .join(',\n  ') + ',';

export const fromConstantLine = `} from './constants';`;

export const createImportConstantsBlock = (name) => `import {
${createConstantLine(name)}
${fromConstantLine}
`;

export const createImportActionBlock = (name) => `
import {
${paramStringToArray(name).map(camelCase).map(id => `  ${id},`).join('\n')}
} from './actions';
`;

export const createReducerCase = (name, params) => `
    case ${constantCase(name)}: {
      const { ${params} } = action;
${paramStringToArray(params).map(camelCase).map(param => `      draft.${param} = ${param};`).join('\n')}
      break;
    }`;

export const createImportImmer = () => 'import produce from \'immer\';\n';

export const createInitStates = (params) => paramStringToArray(params).map(param => `  ${camelCase(param)}: null,\n`).join('');

export const createExportReducer = (name, params) => `
export const initialState = {
${createInitStates(params)}
};

/* eslint-disable default-case, no-param-reassign */
const reducer = (state = initialState, action) => produce(state, (draft) => {
  switch (action.type) {${createReducerCase(name, params)}
  }
});

export default reducer;
`;

export const createLogicBlock = (name, params?) => `const ${camelCase(name)}Logic = createLogic({
  type: ${constantCase(name)},
  cancelType: ${constantCase(name)}_CANCEL,
  latest: true, // take latest only

  async process({ action }, dispatch, done) {
    try {
      const data = await send${pascalCase(name)}Request(action.payload);
      dispatch(${camelCase(name)}Success(data));
    } catch (err) {
      console.error(err); // might be a render err
    }
    done(); // call when finished dispatching
  },
});
`;

export const createLogicFile = (name) => `import { createLogic } from 'redux-logic';
${createImportActionBlock(`${name}Success`)}
import {
  ${constantCase(name)},
  ${constantCase(name)}_CANCEL,
} from './constants';

${createLogicBlock(name)}
export default [
  ${camelCase(name)}Logic,
];`;

export const createSelectorBlock = (name, param) => `
export const makeSelect${pascalCase(param)} = () => createSelector(
  select${pascalCase(name)},
  (${camelCase(name)}State) => ${camelCase(name)}State.${camelCase(param)},
);`;

export const createSelectorFile = (name, params) => `import { createSelector } from 'reselect';
import { initialState } from './reducer';

export const key = '${camelCase(name)}';

export const select${pascalCase(name)} = (state) => state[key] || initialState;
${paramStringToArray(params).map(param => createSelectorBlock(name, param)).join('\n')}
`;

export const createSagaBlock = (name, params, isStrapi) => `
export function* ${camelCase(name)}(payload) {
  try {
    const { ${params} } = payload;
    ${isStrapi ? `const res = yield strapi.getEntries('${name}');`
    : `const res = yield call(apiService.post, "/public/${pathCase(name)}", { params: {${params}} });`}
    yield put(${camelCase(name)}Success(res${isStrapi ? '' : '.data'}));
  } catch (error) {
    yield put(${camelCase(name)}Fail(error));
  }
}\n`;

export const createEffectLine = (name) => `  yield takeLatest(${constantCase(name)}, ${camelCase(name)});
`;

export const initSagaBlock = (isStrapi) => `import { call, put, takeLatest } from 'redux-saga/effects';
import ${isStrapi ? 'strapi' : 'apiService'} from '@@/api';\n\n`;

export const initSagaExport = () => `\nexport default function* saga () {\n}\n`;
