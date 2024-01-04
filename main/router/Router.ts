import { ipcMain } from 'electron';
import {
  ADD_NEW_STATE,
  CHECK_FILE_EXIST,
  CREATE_ACTION,
  CREATE_I18N,
  DELETE_COMPONENT,
  DUPLICATE_COMPONENT,
  GEN_CLASS_NAME_REQUEST,
  GEN_PROP_TYPES_REQUEST,
  GET_FOLDER_FILES,
  LOAD_COMPONENT_REQUEST,
  NEW_COMPONENT,
  NEW_PAGE,
  RE_NAME_COMPONENT
} from '@shared/constant.message';
import {
  getFilesInFolder,
  checkFileExist,
  deleteFolder,
} from '@@/services/FilesService';
import {
  addNewPage,
  addNewState, createNewComponent, duplicateComponent,
  loadComponent, renameComponent, updateComponentPropTypes, updateComponentTag,
} from '@@/services/ComponentService';
import { createAction } from '@@/services/ReduxService';
import { createI18n } from '@@/services/LanguageService';
import { IpcRequest, RequestMessage } from '@shared/types.message';

// import console from '../utils/console';

const addedListeners = [];
const addListener = (name: RequestMessage, listener) => {
  if (addedListeners.indexOf(name) !== -1) return;
  addedListeners.push(name);
  ipcMain.on(name, async (event, data: IpcRequest) => {
    const response = await listener(data);
    console.log('console res: ', name, response);
    event.sender.send(name, response);
  });
};

export default function Router() {
  addListener(CHECK_FILE_EXIST, checkFileExist);
  addListener(GET_FOLDER_FILES, getFilesInFolder);
  addListener(LOAD_COMPONENT_REQUEST, loadComponent);
  addListener(NEW_COMPONENT, createNewComponent);
  addListener(CREATE_ACTION, createAction);
  addListener(RE_NAME_COMPONENT, renameComponent);
  addListener(DUPLICATE_COMPONENT, duplicateComponent);
  addListener(DELETE_COMPONENT, deleteFolder);
  addListener(GEN_CLASS_NAME_REQUEST, updateComponentTag);
  addListener(GEN_PROP_TYPES_REQUEST, updateComponentPropTypes);
  addListener(CREATE_I18N, createI18n);
  addListener(ADD_NEW_STATE, addNewState);
  addListener(NEW_PAGE, addNewPage);
}
