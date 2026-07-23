import { IpcRequest } from 'shared/types.message';
import { ADD_OPEN_WITH_APP_REQUEST, CREATE_ASSET_REQUEST, CREATE_PROJECT_REQUEST, CREATE_SPRITE_IMAGE_ASSET_REQUEST, GENERATE_SPRITE_IMAGES_REQUEST, GET_AI_IMAGE_SETTINGS_REQUEST, GET_COLLIDER_SETTINGS_REQUEST, GET_FOLDER_FILES, LOAD_COMPONENT_REQUEST, REPLACE_SPRITE_IMAGE_REQUEST, SAVE_AI_IMAGE_SETTINGS_REQUEST, SAVE_COLLIDER_SETTINGS_REQUEST, UPDATE_PROJECT_COLORS_REQUEST } from 'shared/constant.message';

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
  if (key === GENERATE_SPRITE_IMAGES_REQUEST || key === REPLACE_SPRITE_IMAGE_REQUEST || key === CREATE_SPRITE_IMAGE_ASSET_REQUEST) {
    return { success: false, message: 'AI image generation is only available in the desktop app.' }
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
  if (key === GET_AI_IMAGE_SETTINGS_REQUEST) {
    return { numberOfImages: 4, systemPrompt: '' }
  }
  if (key === SAVE_AI_IMAGE_SETTINGS_REQUEST) {
    return { success: true }
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
