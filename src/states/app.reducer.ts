import { produce } from 'immer';
import { register } from './actions';

export const initialState = {
  loading: false,
  error: false,
  filesData: [],
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

  //   case DUPLICATE_NODE: {
  //     const { path } = action;
  //     let tree = new Tree(draft.componentTree, 'id', 'children');
  //     const node = tree.getParent(path);
  //     const fixedNode = fixKeys(path);
  //     // console.log(path, fixedNode)
  //     node.items.push(fixedNode);
  //     break;
  //   }

  //   case DELETE_NODE: {
  //     const { path } = action;
  //     let tree = new Tree(draft.componentTree, 'id', 'children');
  //     tree.remove(path);
  //     break;
  //   }

  //   case TOGGLE_FOLDER: {
  //     const { key } = action;
  //     let tree = new Tree(draft.filesData, 'path', 'children');
  //     const node = tree.getNode(key);
  //     // console.log(key, node, tree)
  //     node.expanded = !node.expanded;
  //     break;
  //   }

  //   case UPDATE_PROP_TYPE: {
  //     const { name, propsData } = action;
  //     draft.componentPropTypes[name] = { ...draft.componentPropTypes[name], ...propsData };
  //     break;
  //   }
});

export default reducer;
