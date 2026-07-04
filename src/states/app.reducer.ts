import { produce } from 'immer';
import { getAction } from './actions';

export const initialState = {
  loading: false,
  error: false,
  isPixi: false,
  filesData: [],
  resourceFilesData: [],
  rootFolder: '',
  filePath: '',
  editingPath: '',
  editingClassNamePath: '',
  componentTree: [],
  componentsCache: [],
  assets: {
    fontAssets: [],
    audioAssets: [],
    assetsTextureList: [],
    spriteSheetAssets: [],
    spriteFramesAssets: [],
  },
  previewAsset: null as any,
  settings: { designedResolution: { width: 0, height: 0 } },
  componentPropTypes: {},
  selectedPaths: [],
  selectedNodes: []
};

export type AppState = typeof initialState;

const reducer = (state: AppState = initialState, action: any) => produce(state, draft => {
  console.log('reducer', action);
  getAction(draft)[action.type](...action.data);
});

export default reducer;
