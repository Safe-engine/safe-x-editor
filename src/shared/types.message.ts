import {
  ADD_NEW_STATE, CHANGE_FUNCTION,
  CHANGE_LANGUAGE, CHECK_FILE_EXIST,
  CREATE_ACTION, CREATE_ASSET_REQUEST, CREATE_I18N, CREATE_NEW_ACTION, CREATE_PROJECT_REQUEST, CREATE_SPRITE_IMAGE_ASSET_REQUEST, GENERATE_SPRITE_IMAGES_REQUEST, REPLACE_SPRITE_IMAGE_REQUEST,
  DELETE_COMPONENT, DUPLICATE_COMPONENT,
  SYNC_RES_REQUEST, GEN_COMPONENT_REQUEST, GEN_PROP_TYPES_REQUEST, GET_FOLDER_FILES,
  GET_COLLIDER_SETTINGS_REQUEST, LOAD_COMPONENT_REQUEST, NEW_COMPONENT,
  NEW_PAGE, RE_NAME_COMPONENT, SAVE_COLLIDER_SETTINGS_REQUEST, UPDATE_PROJECT_COLORS_REQUEST,
  ADD_OPEN_WITH_APP_REQUEST, GET_OPEN_WITH_APPS_REQUEST, REMOVE_OPEN_WITH_APP_REQUEST
} from "./constant.message";

export type IpcRequest =
  | { key: typeof CHANGE_LANGUAGE }
  | { key: typeof CHANGE_FUNCTION }
  | { key: typeof CREATE_NEW_ACTION }
  | { key: typeof CREATE_I18N }
  | { key: typeof CREATE_PROJECT_REQUEST, rootFolder: string, projectName: string }
  | { key: typeof CREATE_ASSET_REQUEST, rootFolder: string, assetType: string, data: any }
  | { key: typeof GENERATE_SPRITE_IMAGES_REQUEST, rootFolder: string, prompt: string }
  | { key: typeof REPLACE_SPRITE_IMAGE_REQUEST, rootFolder: string, targetPath: string, targetKey: string, jobId: string, imageIndex: number }
  | { key: typeof CREATE_SPRITE_IMAGE_ASSET_REQUEST, rootFolder: string, targetPath: string, targetKey: string, jobId: string, imageIndex: number }
  | { key: typeof UPDATE_PROJECT_COLORS_REQUEST, rootFolder: string, colors: any[] }
  | { key: typeof GET_COLLIDER_SETTINGS_REQUEST }
  | { key: typeof SAVE_COLLIDER_SETTINGS_REQUEST, groupsList: string[], colliderMatrix: any[] }
  | { key: typeof GET_OPEN_WITH_APPS_REQUEST }
  | { key: typeof ADD_OPEN_WITH_APP_REQUEST }
  | { key: typeof REMOVE_OPEN_WITH_APP_REQUEST, appPath: string }
  | { key: typeof GET_FOLDER_FILES, src: string, patternList?: [string] }
  | { key: typeof CHECK_FILE_EXIST, folderPath: string }
  | { key: typeof LOAD_COMPONENT_REQUEST, path: string }
  | { key: typeof GEN_COMPONENT_REQUEST, nodesData: any, filePath: string }
  | { key: typeof GEN_PROP_TYPES_REQUEST }
  | { key: typeof NEW_COMPONENT }
  | { key: typeof RE_NAME_COMPONENT }
  | { key: typeof DUPLICATE_COMPONENT }
  | { key: typeof DELETE_COMPONENT }
  | { key: typeof CREATE_ACTION }
  | { key: typeof ADD_NEW_STATE }
  | { key: typeof SYNC_RES_REQUEST, rootFolder: string }
  | { key: typeof NEW_PAGE }

export type RequestMessage = IpcRequest['key'];

export type IpcResponse =
  | { key: typeof CHANGE_LANGUAGE }
  | { key: typeof CHANGE_FUNCTION }
  | { key: typeof CREATE_NEW_ACTION }
  | { key: typeof CREATE_I18N }
  | { key: typeof CREATE_PROJECT_REQUEST }
  | { key: typeof CREATE_ASSET_REQUEST }
  | { key: typeof GENERATE_SPRITE_IMAGES_REQUEST }
  | { key: typeof REPLACE_SPRITE_IMAGE_REQUEST }
  | { key: typeof CREATE_SPRITE_IMAGE_ASSET_REQUEST }
  | { key: typeof UPDATE_PROJECT_COLORS_REQUEST }
  | { key: typeof GET_COLLIDER_SETTINGS_REQUEST }
  | { key: typeof SAVE_COLLIDER_SETTINGS_REQUEST }
  | { key: typeof GET_OPEN_WITH_APPS_REQUEST }
  | { key: typeof ADD_OPEN_WITH_APP_REQUEST }
  | { key: typeof REMOVE_OPEN_WITH_APP_REQUEST }
  | { key: typeof GET_FOLDER_FILES }
  | { key: typeof CHECK_FILE_EXIST }
  | { key: typeof LOAD_COMPONENT_REQUEST }
  | { key: typeof GEN_COMPONENT_REQUEST }
  | { key: typeof GEN_PROP_TYPES_REQUEST }
  | { key: typeof NEW_COMPONENT }
  | { key: typeof RE_NAME_COMPONENT }
  | { key: typeof DUPLICATE_COMPONENT }
  | { key: typeof DELETE_COMPONENT }
  | { key: typeof CREATE_ACTION }
  | { key: typeof ADD_NEW_STATE }
  | { key: typeof SYNC_RES_REQUEST }
  | { key: typeof NEW_PAGE }

export type ResponseMessage = IpcResponse['key'];
