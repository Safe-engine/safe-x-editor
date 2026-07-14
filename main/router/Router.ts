import {
  duplicateComponent,
  loadComponent, renameComponent, updateComponentTag,
} from '@@/services/ComponentService';
import { createAsset } from '@@/services/AssetCreateService';
import { updateProjectColors } from '@@/services/ColorService';
import { getSettings, saveSettings } from '@@/services/settings.service';
import {
  checkFileExist,
  deleteFolder,
  getFilesInFolder,
} from '@@/services/FilesService';
import { createI18n } from '@@/services/LanguageService';
import { initProject } from '@@/services/project';
import {
  CHECK_FILE_EXIST,
  CREATE_I18N,
  CREATE_PROJECT_REQUEST,
  CREATE_ASSET_REQUEST,
  DELETE_COMPONENT,
  DUPLICATE_COMPONENT,
  GEN_COMPONENT_REQUEST,
  GET_FOLDER_FILES,
  LOAD_COMPONENT_REQUEST,
  GET_COLLIDER_SETTINGS_REQUEST,
  RE_NAME_COMPONENT,
  UPDATE_PROJECT_COLORS_REQUEST,
  SAVE_COLLIDER_SETTINGS_REQUEST
} from '@shared/constant.message';
import { IpcRequest, RequestMessage } from '@shared/types.message';
import { ipcMain } from 'electron';
import { basename, join } from 'path';

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
      return { error: true, message: error.message };
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
  addListener(CREATE_PROJECT_REQUEST, async ({ rootFolder, projectName }) => {
    const name = projectName.trim();
    if (!name || name !== basename(name) || name.includes('\\')) throw Error('Invalid project name.');
    const workspacePath = join(rootFolder, name);
    await initProject(workspacePath);
    return { success: true, workspacePath };
  });
  addListener(CREATE_ASSET_REQUEST, createAsset);
  addListener(UPDATE_PROJECT_COLORS_REQUEST, updateProjectColors);
  addListener(GET_COLLIDER_SETTINGS_REQUEST, getSettings);
  addListener(SAVE_COLLIDER_SETTINGS_REQUEST, ({ groupsList, colliderMatrix }) => saveSettings(groupsList, colliderMatrix));
}
