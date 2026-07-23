import { IpcRequest } from 'shared/types.message';
import { ADD_OPEN_WITH_APP_REQUEST, CREATE_ASSET_REQUEST, CREATE_PROJECT_REQUEST, GET_COLLIDER_SETTINGS_REQUEST, GET_FOLDER_FILES, LOAD_COMPONENT_REQUEST, SAVE_COLLIDER_SETTINGS_REQUEST, UPDATE_PROJECT_COLORS_REQUEST } from 'shared/constant.message';

const getIpcRenderer = () => {
  const electronRequire = (globalThis as any).require
  return electronRequire?.('electron')?.ipcRenderer
}

const getBrowserFallback = (key: string) => {
  if (key === GET_FOLDER_FILES) {
    return {
      designedResolution: { width: 960, height: 640 },
      assets: {},
      componentsCache: {},
      colors: [],
      defaultProps: {},
      jsonCaches: {},
      staticPropsMap: {},
      enumsList: {},
    }
  }
  if (key === LOAD_COMPONENT_REQUEST) {
    return { name: '', treeData: [] }
  }
  if (key === CREATE_ASSET_REQUEST) {
    return { success: true }
  }
  if (key === CREATE_PROJECT_REQUEST) {
    return { success: true }
  }
  if (key === UPDATE_PROJECT_COLORS_REQUEST) {
    return { success: true }
  }
  if (key === GET_COLLIDER_SETTINGS_REQUEST) {
    return { groupsList: '', colliderMatrix: '[]' }
  }
  if (key === SAVE_COLLIDER_SETTINGS_REQUEST) {
    return { success: true }
  }
  if (key === ADD_OPEN_WITH_APP_REQUEST) {
    return { apps: [] }
  }
  return undefined
}

export const sendRequest = (request: IpcRequest) => {
  const { key, ...rest } = request;
  console.log('sendRequest: ', key, rest);
  const ipcRenderer = getIpcRenderer()
  if (ipcRenderer) return ipcRenderer.invoke(key, rest);
  return Promise.resolve(getBrowserFallback(key));
};
