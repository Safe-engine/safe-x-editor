import { camelCase, constantCase, pascalCase } from 'change-case';
import { createInitStates, createReducerCase } from '../redux';

export const createActionBlockTS = (name, params) => `
type ${pascalCase(name)}Action = {
  type: typeof ${constantCase(name)},
  ${params}
}

export function ${camelCase(name)}(${params}): ${pascalCase(name)}Action {
  return {
    type: ${constantCase(name)},
    ${params}
  };
}
`;

export const createExportReducerTS = (name, params) => `import { AppAction } from './app.action';

export const initialState = {
${createInitStates(params)}
};

export type AppState = typeof initialState;

const reducer = (state: AppState = initialState, action: AppAction) => produce(state, draft => {
  switch (action.type) {${createReducerCase(name, params)}
  }
});

export default reducer;
`;
