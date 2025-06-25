import {
  duplicateComponent,
  loadComponent, renameComponent, updateComponentTag,
} from '@@/services/ComponentService';
import {
  checkFileExist,
  deleteFolder,
  getFilesInFolder,
} from '@@/services/FilesService';
import { createI18n } from '@@/services/LanguageService';
import {
  CHECK_FILE_EXIST,
  CREATE_I18N,
  DELETE_COMPONENT,
  DUPLICATE_COMPONENT,
  GEN_COMPONENT_REQUEST,
  GET_FOLDER_FILES,
  LOAD_COMPONENT_REQUEST,
  RE_NAME_COMPONENT
} from '@shared/constant.message';
import { IpcRequest, RequestMessage } from '@shared/types.message';
import { ipcMain } from 'electron';

// import console from '../utils/console';

const addedListeners = [];
const addListener = (name: RequestMessage, listener) => {
  if (addedListeners.indexOf(name) !== -1) return;
  addedListeners.push(name);
  ipcMain.handle(name, async (event, data: IpcRequest) => {
    try {
      // console.log('addedListeners', name, event, data)
      const response = await listener(data);
      // console.log('console res: ', name, response);
      // ipcMain.emit(name, response);
      return response
    } catch (error) {
      console.log('ERROR res: ', error);
      // ipcMain.emit('ERROR', error.message);
    }
  });
};

export default function Router() {
  addListener(CHECK_FILE_EXIST, checkFileExist);
  addListener(GET_FOLDER_FILES, getFilesInFolder);
  addListener(LOAD_COMPONENT_REQUEST, loadComponent);
  addListener(RE_NAME_COMPONENT, renameComponent);
  addListener(DUPLICATE_COMPONENT, duplicateComponent);
  addListener(DELETE_COMPONENT, deleteFolder);
  addListener(GEN_COMPONENT_REQUEST, updateComponentTag);
  addListener(CREATE_I18N, createI18n);
}
