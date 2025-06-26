import Tree from '@colin-luo/tree';
import { fixKeys } from 'helper/utils';
import { produce } from 'immer';
import { AppAction } from './app.action';
import {
  ADD_NODE, DELETE_NODE,
  DUPLICATE_NODE, GET_FILES, GET_FILES_SUCCESS,
  LOAD_COMPONENT, LOAD_COMPONENT_SUCCESS, SELECT_EDITING_TAG_NODE,
  TOGGLE_FOLDER, UPDATE_EDITING_COMPONENT, UPDATE_PROP_TYPE
} from './app.constant';

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

const reducer = (state: AppState = initialState, action: AppAction) => produce(state, draft => {
  console.log('reducer', action);
  switch (action.type) {
    case GET_FILES:
      draft.rootFolder = action.src;
      break;

    case GET_FILES_SUCCESS:
      const { components, assets, designedResolution } = action.data
      draft.filesData = components[0].children;
      draft.assets = assets;
      draft.settings.designedResolution = designedResolution;
      break;

    case LOAD_COMPONENT:
      if (draft.filePath !== action.path)
        draft.filePath = action.path;
      break;

    case LOAD_COMPONENT_SUCCESS:
      // eslint-disable-next-line react/forbid-foreign-prop-types
      const { treeData, name } = action.data;
      draft.componentTree = treeData.tag === 'SceneComponent' ? treeData.children : [treeData];
      draft.componentPropTypes = draft.componentTree[0].props;
      draft.editingClassNamePath = draft.componentTree[0].id;
      break;

    case ADD_NODE: {
      const { path, newNode } = action;
      newNode.id = new Date().getTime();
      let tree = new Tree(draft.componentTree, 'id', 'children');
      const node = tree.getNode(path);
      if (!node.expanded) { break; }
      if (!node.items) {
        node.items = [newNode];
      } else {
        node.items.push(newNode);
      }
      break;
    }

    case DUPLICATE_NODE: {
      const { path } = action;
      let tree = new Tree(draft.componentTree, 'id', 'children');
      const node = tree.getParent(path);
      const fixedNode = fixKeys(path);
      // console.log(path, fixedNode)
      node.items.push(fixedNode);
      break;
    }

    case DELETE_NODE: {
      const { path } = action;
      let tree = new Tree(draft.componentTree, 'id', 'children');
      tree.remove(path);
      break;
    }

    case TOGGLE_FOLDER: {
      const { key } = action;
      let tree = new Tree(draft.filesData, 'path', 'children');
      const node = tree.getNode(key);
      // console.log(key, node, tree)
      node.expanded = !node.expanded;
      break;
    }

    case UPDATE_PROP_TYPE: {
      const { name, propsData } = action;
      draft.componentPropTypes[name] = { ...draft.componentPropTypes[name], ...propsData };
      break;
    }

    case SELECT_EDITING_TAG_NODE: {
      const { path } = action;
      draft.editingClassNamePath = path;
      const tree = new Tree(draft.componentTree, 'id', 'children');
      const node = tree.getNode(draft.editingClassNamePath);
      if (node && node.props) {
        draft.componentPropTypes = node.props;
        draft.selectedNode = node
      }
      break;
    }

    case UPDATE_EDITING_COMPONENT: {
      const { component, updated } = action;
      const tree = new Tree(draft.componentTree, 'id', 'children');
      const node = tree.getNode(draft.editingClassNamePath);
      node[component] = { ...node[component], ...updated };
      draft.selectedNode = node
      break;
    }
  }
});

export default reducer;
