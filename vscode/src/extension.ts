import * as vscode from 'vscode';
import Router from './router/Router';
import { startServer } from './server';
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
  startServer(uri.fsPath);
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
  vscode.workspace.onDidSaveTextDocument((document) => {
    if (panel) {
      // console.log('refresh', document.uri.fsPath)
      panel.webview.postMessage({ type: 'refresh' });
    }
  });
}
