import { produce } from 'immer';
import { register } from './actions';

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
  register(draft)[action.type](...action.data);
  // switch (action.type) {
  //   case ADD_NODE: {
  //     const { path, newNode } = action;
  //     newNode.id = new Date().getTime();
  //     let tree = new Tree(draft.componentTree, 'id', 'children');
  //     const node = tree.getNode(path);
  //     if (!node.expanded) { break; }
  //     if (!node.items) {
  //       node.items = [newNode];
  //     } else {
  //       node.items.push(newNode);
  //     }
  //     break;
  //   }

});

export default reducer;
