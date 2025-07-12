import Tree from "@colin-luo/tree";
import { sendRequest } from "app/app.ipc";
import { setLastRootFolder } from "data/AppData";
import { Dispatch } from "react";
import toast from "react-hot-toast";
import { GET_FOLDER_FILES, LOAD_COMPONENT_REQUEST } from "shared/constant.message";
import { AppState } from "./app.reducer";

export function register(draft: AppState) {
  const actions = {
    getFiles(src: string) {
      draft.rootFolder = src;
    },
    getFilesSuccess(data) {
      const { components, assets, designedResolution } = data
      draft.filesData = components[0].children;
      draft.assets = assets;
      draft.settings.designedResolution = designedResolution;
    },
    loadComponent(path: string) {
      if (draft.filePath !== path)
        draft.filePath = path;
    },
    loadComponentSuccess(data) {
      const { treeData, name } = data;
      draft.componentTree = [treeData];
      draft.componentPropTypes = draft.componentTree[0].props;
      draft.editingClassNamePath = '';
      draft.selectedNode = {};
    },
    selectEditingTagNode(path: string) {
      draft.editingClassNamePath = path;
      const tree = new Tree(draft.componentTree, 'id', 'children');
      const node = tree.getNode(draft.editingClassNamePath);
      if (node && node.props) {
        draft.componentPropTypes = node.props;
        draft.selectedNode = node
      }
    },
    updateEditingComponent(component: string, updated: any) {
      const tree = new Tree(draft.componentTree, 'id', 'children');
      const node = tree.getNode(draft.editingClassNamePath);
      if (node) {
        node[component] = { ...node[component], ...updated };
        draft.selectedNode = node
      }
    }
  };
  return actions;
}

type Actions = ReturnType<typeof register>;
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
        console.log('dispatch action', prop, args);
        appDispatch({
          type: prop,
          data: args,
        })
      }
    }
  });
  return obj as Actions
}