import { produce } from 'immer';
import { AppAction } from './app.action';
import {
  ADD_NODE, DELETE_NODE,
  DUPLICATE_NODE, GET_FILES, GET_FILES_SUCCESS,
  LOAD_COMPONENT, LOAD_COMPONENT_SUCCESS, SELECT_EDITING_TAG_NODE, SELECT_EDITING_TEXT, TOGGLE_FOLDER, UPDATE_EDITING_COMPONENT, UPDATE_PROP_TYPE, UPDATE_TEXT_TAG
} from './app.constant';
import Tree from '@colin-luo/tree';
import { fixKeys } from 'helper/utils';
import { getLibraryComponents } from 'data/AppData';

export const initialState = {
  loading: false,
  error: false,
  filesData: [],
  rootFolder: '',
  filePath: '',
  editingPath: '',
  editingClassNamePath: '',
  componentTree: [],
  libraryComps: getLibraryComponents(),
  images: [],
  settings: {},
  componentPropTypes: {},
  selectedNode: {}
};

export type AppState = typeof initialState;

const reducer = (state: AppState = initialState, action: AppAction) => produce(state, draft => {
  console.log('reducer', action);
  switch (action.type) {
    case GET_FILES:
      draft.rootFolder = action.src;
      break;

    case GET_FILES_SUCCESS:
      draft.filesData = action.data.components;
      draft.images = action.data.images;
      break;

    case LOAD_COMPONENT:
      draft.filePath = action.path;
      break;

    case LOAD_COMPONENT_SUCCESS:
      // eslint-disable-next-line react/forbid-foreign-prop-types
      const { treeData, props } = action.data;
      draft.componentTree = [treeData];
      draft.componentPropTypes = treeData.props;
      draft.editingClassNamePath = treeData.key;
      break;

    case ADD_NODE: {
      const { path, newNode } = action;
      newNode.key = new Date().getTime();
      let tree = new Tree(draft.componentTree, 'key', 'items');
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
      let tree = new Tree(draft.componentTree, 'key', 'items');
      const node = tree.getParent(path);
      const fixedNode = fixKeys(path);
      // console.log(path, fixedNode)
      node.items.push(fixedNode);
      break;
    }

    case DELETE_NODE: {
      const { path } = action;
      let tree = new Tree(draft.componentTree, 'key', 'items');
      tree.remove(path);
      break;
    }

    case TOGGLE_FOLDER: {
      const { key } = action;
      let tree = new Tree(draft.filesData, 'path', 'items');
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

    case SELECT_EDITING_TEXT: {
      const { path } = action;
      if (draft.editingPath === path) { return; }
      let tree = new Tree(draft.componentTree, 'key', 'items');
      const lastNode = tree.getNode(draft.editingPath);
      if (lastNode) {
        lastNode.editing = false;
      }
      draft.editingPath = path;
      const node = tree.getNode(draft.editingPath);
      node.editing = true;
      break;
    }

    case UPDATE_TEXT_TAG: {
      const { text } = action;
      const tree = new Tree(draft.componentTree, 'key', 'items');
      const node = tree.getNode(draft.editingPath);
      node.name = text;
      break;
    }

    case SELECT_EDITING_TAG_NODE: {
      const { path } = action;
      draft.editingClassNamePath = path;
      const tree = new Tree(draft.componentTree, 'key', 'items');
      const node = tree.getNode(draft.editingClassNamePath);
      if (node && node.props) {
        draft.componentPropTypes = node.props;
        draft.selectedNode = node
      }
      break;
    }

    case UPDATE_EDITING_COMPONENT: {
      const { component, updated } = action;
      const tree = new Tree(draft.componentTree, 'key', 'items');
      const node = tree.getNode(draft.editingClassNamePath);
      node[component] = updated;
      break;
    }
  }
});

export default reducer;
