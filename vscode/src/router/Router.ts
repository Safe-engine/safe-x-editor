import * as vscode from 'vscode';
import { loadComponent, updateComponentTag } from '../services/ComponentService';
import { getFilesInFolder } from '../services/FilesService';
import { GEN_COMPONENT_REQUEST, GET_FOLDER_FILES, LOAD_COMPONENT_REQUEST } from '../shared/constant.message';

function getResponse(message, panel: vscode.WebviewPanel) {
  const { key, payload } = message;
  switch (key) {
    case LOAD_COMPONENT_REQUEST: {
      return loadComponent(payload)
    }
    case GET_FOLDER_FILES: {
      return getFilesInFolder(payload, panel)
    }
    case GEN_COMPONENT_REQUEST: {
      return updateComponentTag(payload)
    }
  }
}
export default function Router(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
  panel.webview.onDidReceiveMessage(
    async (message) => {
      const { messageId } = message;
      const data = await getResponse(message, panel);
      panel.webview.postMessage({
        messageId,
        data,
      });
    },
    undefined,
    context.subscriptions
  );
}
