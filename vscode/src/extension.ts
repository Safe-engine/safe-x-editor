import { join } from 'path';
import * as vscode from 'vscode';
import Router from './router/Router';
import { getSettings, saveSettings } from './services/settings.service';
import { getSettingsWebview } from './settings.html';
import { getEditorWebview } from './webview';
let panel: vscode.WebviewPanel | undefined;

function createOrShowWebview(context: vscode.ExtensionContext, uri: vscode.Uri) {
  if (panel) {
    // Nếu đã tồn tại thì chỉ cần hiện lại
    panel.webview.postMessage({ type: 'changeFilePath', filePath: uri.fsPath });
    return;
  }
  // Nếu chưa có thì tạo mới
  panel = vscode.window.createWebviewPanel(
    'safexEditor',
    'Safex Editor',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getEditorWebview(context, uri.fsPath);
  Router(panel, context)
  // startServer(uri.fsPath); // test only
  // Khi panel bị dispose (user đóng), set biến về undefined
  panel.onDidDispose(() => {
    panel = undefined;
  });
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Activated safex Editor")
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'safexEditor.openSafex',
      async (uri: vscode.Uri) => {
        createOrShowWebview(context, uri);
      }
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'safex.editSettings',
      async (uri: vscode.Uri) => {
        const panel = vscode.window.createWebviewPanel(
          'editSettings',
          `Edit Project Settings`,
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            localResourceRoots: [
              vscode.Uri.file(join(context.extensionPath, 'media')),
            ],
          }
        );

        const scriptUri = panel.webview.asWebviewUri(
          vscode.Uri.file(
            join(context.extensionPath, 'media', 'settings.js')
          )
        );

        const cssUri = panel.webview.asWebviewUri(
          vscode.Uri.file(
            join(context.extensionPath, 'media', 'style.css')
          )
        );

        const { groupsList, colliderMatrix } = await getSettings()

        panel.webview.html = getSettingsWebview(
          scriptUri,
          cssUri,
          groupsList,
          colliderMatrix,
        );
        panel.webview.onDidReceiveMessage(async (message) => {
          if (message.command === 'saveSettings') {
            try {
              const { groupsList, colliderMatrix, } = message;
              console.log('Received image message:', message);
              const response = await saveSettings(groupsList, colliderMatrix);
              console.log('Response from saveSettings:', response);
            } catch (err) {
              console.error(err);
            }
          }
        });
      }
    )
  );
  vscode.workspace.onDidSaveTextDocument((document) => {
    if (panel) {
      // console.log('refresh', document.uri.fsPath)
      panel.webview.postMessage({ type: 'reLoad' });
    }
  });
}
