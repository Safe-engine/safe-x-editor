import { Dispatch } from 'react';
import toast from 'react-hot-toast';
import { sendRequest } from '../app/app.ipc';
import { setLastRootFolder } from '../data/AppData';
import { GET_FOLDER_FILES, LOAD_COMPONENT_REQUEST } from '../shared/constant.message';
import { Actions, createActions } from './actions';

const undoStack = []
const redoStack = []

export function undoEdit(actions) {
  const prev = undoStack.pop();
  if (!prev) return;
  redoStack.push(prev);
  if (prev.name && actions[prev.name]) {
    actions[prev.name](prev.data);
  }
}

export function redoEdit(actions) {
  const next = redoStack.pop();
  if (!next) return;
  undoStack.push(next);
  if (next.name && actions[next.name]) {
    actions[next.name](next.data);
  }
}

export function createMiddleware(dispatch: Dispatch<any>) {
  const { getFilesSuccess, loadComponentSuccess } = createActions(dispatch)
  const middlewares: Partial<Actions> = {
    async getFiles(src: string) {
      const data: any = await sendRequest({
        key: GET_FOLDER_FILES,
        src,
      })
      if (data.error) {
        toast.error(data.message)
        return
      }
      setLastRootFolder(src)
      getFilesSuccess(data)
    },
    async loadComponent(path: string) {
      const data: any = await sendRequest({
        key: LOAD_COMPONENT_REQUEST,
        path,
      })
      loadComponentSuccess(data)
    },
    updateEditingComponent(component, updated) {
      undoStack.push({ name: 'updateEditingComponent', data: updated });
      redoStack.length = 0; // clear redoStack on new edit
    },
    updateMultiNodes(params) {
      undoStack.push({ name: 'updateMultiNodes', data: params });
      redoStack.length = 0; // clear redoStack on new edit
    },
  }
  return middlewares
}

export const applyMiddleware =
  (dispatch: Dispatch<any>) => async (action: any) => {
    const middlewares = createMiddleware(dispatch);
    if (middlewares[action.type]) {
      middlewares[action.type](...action.data);
    }
    dispatch(action);
  };
