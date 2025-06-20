import { CHECK_FILE_EXIST, CREATE_ACTION, DELETE_COMPONENT } from 'shared/constant.message';
import {
  ADD_NODE,
  CHANGE_COMPONENT_NAME,
  CHANGE_TEXT_STYLES,
  CLICK_ADD_STYLE,
  DELETE_NODE,
  DUPLICATE_NODE,
  EXECUTE_COMMAND,
  GEN_CLASS_NAME_SUCCESS,
  GEN_COMPONENT,
  GEN_PROP_TYPES,
  GEN_PROP_TYPES_SUCCESS,
  GET_FILES,
  GET_FILES_ERROR,
  GET_FILES_SUCCESS,
  LOAD_COMPONENT,
  LOAD_COMPONENT_ERROR,
  LOAD_COMPONENT_SUCCESS,
  LOAD_DATA,
  LOAD_DATA_ERROR,
  LOAD_DATA_SUCCESS,
  SELECT_EDITING_TAG_NODE,
  SELECT_EDITING_TEXT,
  SELECT_NODE,
  TOGGLE_FOLDER,
  UPDATE_EDITING_COMPONENT,
  UPDATE_PROP_TYPE,
  UPDATE_TEXT_TAG,
  UPDATE_TREE,
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

export function addNode(newNode, path: string) {
  return {
    type: ADD_NODE,
    newNode,
    path,
  };
}

export function duplicateNode(path) {
  return {
    type: DUPLICATE_NODE,
    path,
  };
}

export function deleteNode(path) {
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

export function changeComponentName(name: string) {
  return {
    type: CHANGE_COMPONENT_NAME,
    name,
  };
}

export function updateTextTag(text: string) {
  return {
    type: UPDATE_TEXT_TAG,
    text,
  };
}

export function selectEditingText(path: string) {
  return {
    type: SELECT_EDITING_TEXT,
    path,
  };
}

export function selectEditingTagNode(path: string) {
  return {
    type: SELECT_EDITING_TAG_NODE,
    path,
  };
}

export function updateEditingComponent(component: string, updated: any) {
  return {
    type: UPDATE_EDITING_COMPONENT,
    component,
    updated,
  };
}

export function getFiles(src) {
  return {
    type: GET_FILES,
    src,
  };
}

export function getFilesSuccess(data) {
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

export function executeFileCommandAction(command: string, data, rootFolder: string) {
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

export function genComponent(nodesData, filePath: string, styleType: string) {
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

export function genPropTypes(propsData, filePath: string) {
  return {
    type: GEN_PROP_TYPES,
    propsData,
    filePath,
  };
}

export function updatePropType(name: string, propsData) {
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

export function toggleFolder(key: string) {
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
