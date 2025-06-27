import {
  ADD_NEW_STATE, CHANGE_FUNCTION,
  CHANGE_LANGUAGE, CHECK_FILE_EXIST,
  CREATE_ACTION, CREATE_I18N, CREATE_NEW_ACTION,
  DELETE_COMPONENT, DUPLICATE_COMPONENT,
  GEN_COMPONENT_REQUEST, GEN_PROP_TYPES_REQUEST, GET_FOLDER_FILES,
  LOAD_COMPONENT_REQUEST, NEW_COMPONENT,
  NEW_PAGE, RE_NAME_COMPONENT
} from "./constant.message";

export type IpcRequest =
  | { key: typeof CHANGE_LANGUAGE }
  | { key: typeof CHANGE_FUNCTION }
  | { key: typeof CREATE_NEW_ACTION }
  | { key: typeof CREATE_I18N }
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
  | { key: typeof NEW_PAGE }

export type RequestMessage = IpcRequest['key'];

export type IpcResponse =
  | { key: typeof CHANGE_LANGUAGE }
  | { key: typeof CHANGE_FUNCTION }
  | { key: typeof CREATE_NEW_ACTION }
  | { key: typeof CREATE_I18N }
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
  | { key: typeof NEW_PAGE }

export type ResponseMessage = IpcResponse['key'];
