import { createAsset } from '@@/services/AssetCreateService';
import { createSpriteImageAsset, generateSpriteImages, getAiImageSettings, replaceSpriteImage, saveAiImageSettings } from '@@/services/AiImageService';
import { updateProjectColors } from '@@/services/ColorService';
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
import { installDependencies, syncResConst } from '@@/services/TerminalService';
import { initProject } from '@@/services/project';
import { getSettings, saveSettings } from '@@/services/settings.service';
import {
  CHECK_FILE_EXIST,
  CREATE_ASSET_REQUEST,
  CREATE_SPRITE_IMAGE_ASSET_REQUEST,
  GENERATE_SPRITE_IMAGES_REQUEST,
  GET_AI_IMAGE_SETTINGS_REQUEST,
  CREATE_I18N,
  CREATE_PROJECT_REQUEST,
  DELETE_COMPONENT,
  DUPLICATE_COMPONENT,
  GEN_COMPONENT_REQUEST,
  GET_COLLIDER_SETTINGS_REQUEST,
  GET_FOLDER_FILES,
  LOAD_COMPONENT_REQUEST,
  RE_NAME_COMPONENT,
  REPLACE_SPRITE_IMAGE_REQUEST,
  SAVE_COLLIDER_SETTINGS_REQUEST,
  SAVE_AI_IMAGE_SETTINGS_REQUEST,
  SYNC_RES_REQUEST,
  UPDATE_PROJECT_COLORS_REQUEST
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
    await installDependencies(workspacePath);
    await syncResConst(workspacePath);
    return { success: true, workspacePath };
  });
  addListener(CREATE_ASSET_REQUEST, createAsset);
  addListener(GENERATE_SPRITE_IMAGES_REQUEST, generateSpriteImages);
  addListener(REPLACE_SPRITE_IMAGE_REQUEST, replaceSpriteImage);
  addListener(CREATE_SPRITE_IMAGE_ASSET_REQUEST, createSpriteImageAsset);
  addListener(GET_AI_IMAGE_SETTINGS_REQUEST, getAiImageSettings);
  addListener(SAVE_AI_IMAGE_SETTINGS_REQUEST, saveAiImageSettings);
  addListener(UPDATE_PROJECT_COLORS_REQUEST, updateProjectColors);
  addListener(GET_COLLIDER_SETTINGS_REQUEST, getSettings);
  addListener(SAVE_COLLIDER_SETTINGS_REQUEST, ({ groupsList, colliderMatrix }) => saveSettings(groupsList, colliderMatrix));
  addListener(SYNC_RES_REQUEST, ({ rootFolder }) => {
    syncResConst(rootFolder);
    return { success: true };
  });
}
