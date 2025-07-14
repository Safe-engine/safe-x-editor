import Tree from "@colin-luo/tree";
import { sendRequest } from "app/app.ipc";
import { setLastRootFolder } from "data/AppData";
import { Dispatch } from "react";
import toast from "react-hot-toast";
import { GET_FOLDER_FILES, LOAD_COMPONENT_REQUEST } from "shared/constant.message";
import { AppState } from "./app.reducer";

const actions = {
  getFiles(src: string) {
    (this as AppState).rootFolder = src;
  },
  getFilesSuccess(data) {
    const { components, assets, designedResolution } = data;
    (this as AppState).filesData = components[0].children;
    (this as AppState).assets = assets;
    (this as AppState).settings.designedResolution = designedResolution;
  },
  loadComponent(path: string) {
    if ((this as AppState).filePath !== path)
      (this as AppState).filePath = path;
  },
  loadComponentSuccess(data) {
    const { treeData, name } = data;
    (this as AppState).componentTree = [treeData];
    (this as AppState).componentPropTypes = (this as AppState).componentTree[0].props;
    (this as AppState).editingClassNamePath = '';
    (this as AppState).selectedNode = {};
    (this as AppState).editingPath = name;
  },
  selectEditingTagNode(path: string) {
    (this as AppState).editingClassNamePath = path;
    const tree = new Tree((this as AppState).componentTree, 'id', 'children');
    const node = tree.getNode((this as AppState).editingClassNamePath);
    if (node && node.props) {
      (this as AppState).componentPropTypes = node.props;
      (this as AppState).selectedNode = node
    }
  },
  updateEditingComponent(component: string, updated: any) {
    const tree = new Tree((this as AppState).componentTree, 'id', 'children');
    const node = tree.getNode((this as AppState).editingClassNamePath);
    if (node) {
      node[component] = { ...node[component], ...updated };
      (this as AppState).selectedNode = node
    }
  },
  toggleFolder(key: string) {
    let tree = new Tree((this as AppState).filesData, 'path', 'children');
    const node = tree.getNode(key);
    // console.log(key, node, tree)
    node.expanded = !node.expanded;
  }
};

export function getAction(draft: AppState, name: string) {
  return actions[name].bind(draft);
}

type Actions = typeof actions;
export function createMiddleware(dispatch: Dispatch<any>) {
  const { getFilesSuccess, loadComponentSuccess } = createActions(dispatch)
  const middlewares: Partial<Actions> = {
    async getFiles(src: string) {
      const data: any = await sendRequest({
        key: GET_FOLDER_FILES,
        src
      });
      if (data.error) {
        toast.error(data.message);
        return;
      }
      setLastRootFolder(src);
      getFilesSuccess(data);
    },
    async loadComponent(path: string) {
      const data: any = await sendRequest({
        key: LOAD_COMPONENT_REQUEST,
        path
      });
      loadComponentSuccess(data);
    },
  }
  return middlewares
}

export function createActions(appDispatch: Dispatch<any>) {
  const obj = new Proxy({}, {
    get: (_, prop: string) => {
      return (...args: any) => {
        // console.log('dispatch action', prop, args);
        appDispatch({
          type: prop,
          data: args,
        })
      }
    }
  });
  return obj as Actions
}