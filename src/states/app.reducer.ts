import { produce } from 'immer';
import { getAction } from './actions';

export const initialState = {
  loading: false,
  error: false,
  rootFolder: '',
  filePath: '',
  editingPath: '',
  editingClassNamePath: '',
  componentTree: [],
  assets: {
    fontAssets: [],
    assetsTextureList: [],
    spriteSheetAssets: [],
    spriteFramesAssets: [],
  },
  settings: { designedResolution: { width: 0, height: 0 } },
  componentPropTypes: {},
  selectedNode: {} as any
};

export type AppState = typeof initialState;

const reducer = (state: AppState = initialState, action: any) => produce(state, draft => {
  console.log('reducer', action);
  getAction(draft, action.type)(...action.data);

  //   case UPDATE_PROP_TYPE: {
  //     const { name, propsData } = action;
  //     draft.componentPropTypes[name] = { ...draft.componentPropTypes[name], ...propsData };
  //     break;
  //   }
});

export default reducer;
