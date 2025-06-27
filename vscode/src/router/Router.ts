import * as vscode from 'vscode';
import { loadComponent } from '../services/ComponentService';
import { LOAD_COMPONENT_REQUEST } from '../shared/constant.message';

// const addedListeners = [];
// const addListener = (name: RequestMessage, listener) => {
//   if (addedListeners.indexOf(name) !== -1) return;
//   addedListeners.push(name);
//   ipcMain.handle(name, async (event, data: IpcRequest) => {
//     try {
//       // console.log('addedListeners', name, event, data)
//       const response = await listener(data);
//       // console.log('console res: ', name, response);
//       // ipcMain.emit(name, response);
//       return response
//     } catch (error) {
//       console.log('ERROR res: ', error);
//       // ipcMain.emit('ERROR', error.message);
//     }
//   });
// };

export default function Router(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
  // addListener(CHECK_FILE_EXIST, checkFileExist);
  // addListener(GET_FOLDER_FILES, getFilesInFolder);
  // addListener(LOAD_COMPONENT_REQUEST, loadComponent);
  // addListener(RE_NAME_COMPONENT, renameComponent);
  // addListener(DUPLICATE_COMPONENT, duplicateComponent);
  // addListener(DELETE_COMPONENT, deleteFolder);
  // addListener(GEN_COMPONENT_REQUEST, updateComponentTag);
  // addListener(CREATE_I18N, createI18n);
  panel.webview.onDidReceiveMessage(
    async (message) => {
      const { key, payload, messageId } = message;
      let responseData;
      // handler
      switch (key) {
        case LOAD_COMPONENT_REQUEST: {
          return loadComponent(payload)
        }
      }
      panel.webview.postMessage({
        messageId,
        data: responseData,
      });
    },
    undefined,
    context.subscriptions
  );
}
