import { CHECK_FILE_EXIST, CREATE_ACTION, DELETE_COMPONENT } from 'shared/constant.message';
import {
  UPDATE_TREE, ADD_NODE,
  LOAD_DATA, LOAD_DATA_SUCCESS,
  LOAD_DATA_ERROR, CHANGE_TEXT_STYLES,
  CLICK_ADD_STYLE,
  CHANGE_COMPONENT_NAME,
  DELETE_NODE,
  DUPLICATE_NODE,
  GET_FILES,
  GET_FILES_SUCCESS,
  LOAD_COMPONENT,
  LOAD_COMPONENT_SUCCESS,
  EXECUTE_COMMAND,
  SELECT_NODE,
  GEN_CLASS_NAME_SUCCESS,
  GEN_COMPONENT,
  LOAD_COMPONENT_ERROR,
  GET_FILES_ERROR,
  TOGGLE_FOLDER,
  GEN_PROP_TYPES,
  GEN_PROP_TYPES_SUCCESS,
  UPDATE_PROP_TYPE,
  UPDATE_TEXT_TAG,
  SELECT_EDITING_TEXT,
  SELECT_EDITING_TAG_NODE,
  UPDATE_EDITING_COMPONENT,
} from './app.constant';

/**
 * Load the repositories, this action starts the request saga
 *
 * @return {object} An action object with a type of LOAD_DATA
 */
export function loadData() {
  return {
    type: LOAD_DATA,
  };
}

/**
 * Dispatched when the repositories are loaded by the request saga
 *
 *
 * @return {object}      An action object with a type of LOAD_DATA_SUCCESS passing the repos
 */
export function dataLoaded() {
  return {
    type: LOAD_DATA_SUCCESS,
  };
}

/**
 * Dispatched when loading the repositories fails
 *
 * @param  {object} error The error
 *
 * @return {object}       An action object with a type of LOAD_DATA_ERROR passing the error
 */
export function dataLoadingError(error) {
  return {
    type: LOAD_DATA_ERROR,
    error,
  };
}

export function updateTree(payload) {
  return {
    type: UPDATE_TREE,
    payload,
  };
}

export function addNode(newNode, path): { type: typeof ADD_NODE, path: string, newNode: any } {
  return {
    type: ADD_NODE,
    newNode,
    path,
  };
}

export function duplicateNode(path): { type: typeof DUPLICATE_NODE, path: any } {
  return {
    type: DUPLICATE_NODE,
    path,
  };
}

export function deleteNode(path): { type: typeof DELETE_NODE, path: any } {
  return {
    type: DELETE_NODE,
    path,
  };
}

export function clickAddStyle(name) {
  return {
    type: CLICK_ADD_STYLE,
    name,
  };
}

export function changeTextStyles(style) {
  return {
    type: CHANGE_TEXT_STYLES,
    style,
  };
}

export function changeComponentName(name: string): { type: typeof CHANGE_COMPONENT_NAME, name: string } {
  return {
    type: CHANGE_COMPONENT_NAME,
    name,
  };
}

export function updateTextTag(text: string): { type: typeof UPDATE_TEXT_TAG, text: string } {
  return {
    type: UPDATE_TEXT_TAG,
    text,
  };
}

export function selectEditingText(path: string): {
  type: typeof SELECT_EDITING_TEXT, path: string
} {
  return {
    type: SELECT_EDITING_TEXT,
    path,
  };
}

export function selectEditingTagNode(path: string): {
  type: typeof SELECT_EDITING_TAG_NODE, path: string
} {
  return {
    type: SELECT_EDITING_TAG_NODE,
    path,
  };
}

export function updateEditingComponent(component: string, updated: any): {
  type: typeof UPDATE_EDITING_COMPONENT, component: string, updated: any
} {
  return {
    type: UPDATE_EDITING_COMPONENT,
    component,
    updated,
  };
}

export function getFiles(src): { type: typeof GET_FILES, src: string } {
  return {
    type: GET_FILES,
    src,
  };
}

export function getFilesSuccess(data): { type: typeof GET_FILES_SUCCESS, data: any } {
  return {
    type: GET_FILES_SUCCESS,
    data,
  };
}

export function getFilesError(error) {
  return {
    type: GET_FILES_ERROR,
    error,
  };
}

export function loadComponent(path) {
  return {
    type: LOAD_COMPONENT,
    path,
  };
}

export function loadComponentSuccess(data) {
  return {
    type: LOAD_COMPONENT_SUCCESS,
    data,
  };
}

export function loadComponentError(error) {
  return {
    type: LOAD_COMPONENT_ERROR,
    error,
  };
}

export function executeFileCommandAction(command, data, rootFolder): {
  type: typeof EXECUTE_COMMAND,
  command: string,
  data: any,
  rootFolder: string,
} {
  return {
    type: EXECUTE_COMMAND,
    command,
    data,
    rootFolder,
  };
}

export function selectNode(path, selectedNode) {
  return {
    type: SELECT_NODE,
    path,
    selectedNode,
  };
}

export function genComponent(nodesData, filePath, styleType): {
  type: typeof GEN_COMPONENT,
  nodesData,
  filePath: string,
  styleType: string,
} {
  return {
    type: GEN_COMPONENT,
    nodesData,
    filePath,
    styleType,
  };
}

export function genClassNameSuccess(payload) {
  return {
    type: GEN_CLASS_NAME_SUCCESS,
    payload,
  };
}

export function genPropTypes(propsData, filePath): {
  type: typeof GEN_PROP_TYPES,
  propsData,
  filePath: string,
} {
  return {
    type: GEN_PROP_TYPES,
    propsData,
    filePath,
  };
}

export function updatePropType(name, propsData): {
  type: typeof UPDATE_PROP_TYPE,
  propsData,
  name: string,
} {
  return {
    type: UPDATE_PROP_TYPE,
    propsData,
    name,
  };
}

export function genPropTypesSuccess(payload) {
  return {
    type: GEN_PROP_TYPES_SUCCESS,
    payload,
  };
}

export function toggleFolder(key): {
  type: typeof TOGGLE_FOLDER,
  key: string,
} {
  return {
    type: TOGGLE_FOLDER,
    key,
  };
}

export type AppAction = ReturnType<typeof changeComponentName>
  | ReturnType<typeof getFiles>
  | ReturnType<typeof getFilesSuccess>
  | { type: typeof CHECK_FILE_EXIST, data: any }
  | { type: typeof LOAD_COMPONENT, path: string }
  | { type: typeof LOAD_COMPONENT_SUCCESS, data: any }
  | { type: typeof UPDATE_TREE, payload: any }
  | ReturnType<typeof addNode>
  | ReturnType<typeof deleteNode>
  | ReturnType<typeof duplicateNode>
  | ReturnType<typeof genComponent>
  | ReturnType<typeof genPropTypes>
  | ReturnType<typeof updatePropType>
  | ReturnType<typeof executeFileCommandAction>
  | { type: typeof DELETE_NODE, path: string }
  | { type: typeof EXECUTE_COMMAND, command: string, data: any, rootFolder: string }
  | { type: typeof SELECT_NODE, path: string, selectedNode: string }
  | { type: typeof DELETE_COMPONENT, componentPath: string, rootFolder: string }
  | { type: typeof CREATE_ACTION, data: any }
  | ReturnType<typeof toggleFolder>
  | ReturnType<typeof updateTextTag>
  | ReturnType<typeof selectEditingText>
  | ReturnType<typeof selectEditingTagNode>
  | ReturnType<typeof updateEditingComponent>;
