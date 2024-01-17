import {
  addNewPage,
  addNewState, createNewComponent, duplicateComponent,
  loadComponent, renameComponent, updateComponentPropTypes, updateComponentTag,
} from '@@/services/ComponentService';
import {
  checkFileExist,
  deleteFolder,
  getFilesInFolder,
} from '@@/services/FilesService';
import { createI18n } from '@@/services/LanguageService';
import {
  ADD_NEW_STATE,
  CHECK_FILE_EXIST,
  CREATE_I18N,
  DELETE_COMPONENT,
  DUPLICATE_COMPONENT,
  GEN_COMPONENT_REQUEST,
  GEN_PROP_TYPES_REQUEST,
  GET_FOLDER_FILES,
  LOAD_COMPONENT_REQUEST,
  NEW_COMPONENT,
  NEW_PAGE,
  RE_NAME_COMPONENT
} from '@shared/constant.message';
import { IpcRequest, RequestMessage } from '@shared/types.message';
import { ipcMain } from 'electron';

// import console from '../utils/console';

const addedListeners = [];
const addListener = (name: RequestMessage, listener) => {
  if (addedListeners.indexOf(name) !== -1) return;
  addedListeners.push(name);
  ipcMain.on(name, async (event, data: IpcRequest) => {
    try {
      const response = await listener(data);
      console.log('console res: ', name, response);
      event.sender.send(name, response);
    } catch (error) {
      event.sender.send('ERROR', error.message);
    }
  });
};

export default function Router() {
  addListener(CHECK_FILE_EXIST, checkFileExist);
  addListener(GET_FOLDER_FILES, getFilesInFolder);
  addListener(LOAD_COMPONENT_REQUEST, loadComponent);
  addListener(NEW_COMPONENT, createNewComponent);
  addListener(RE_NAME_COMPONENT, renameComponent);
  addListener(DUPLICATE_COMPONENT, duplicateComponent);
  addListener(DELETE_COMPONENT, deleteFolder);
  addListener(GEN_COMPONENT_REQUEST, updateComponentTag);
  addListener(GEN_PROP_TYPES_REQUEST, updateComponentPropTypes);
  addListener(CREATE_I18N, createI18n);
  addListener(ADD_NEW_STATE, addNewState);
  addListener(NEW_PAGE, addNewPage);
}
