import * as vscode from 'vscode';
import Router from './router/Router';
import { getEditorWebview } from './webview';

export function activate(context: vscode.ExtensionContext) {
  console.log("Activated safexEditor")
  const panel = vscode.window.createWebviewPanel(
    'safexEditor',
    'Safex Editor',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'safexEditor.openSafex',
      async (uri: vscode.Uri) => {
        panel.webview.html = getEditorWebview(context, uri.fsPath);
        Router(panel, context)
      }
    )
  );
  vscode.workspace.onDidSaveTextDocument((document) => {
    if (panel) {
      // console.log('refresh', document.uri.fsPath)
      // Gửi message sang webview để xử lý (reload hoặc update)
      panel.webview.postMessage({ type: 'refresh' });
      // Hoặc reload toàn bộ nội dung HTML (ít khuyến khích)
      // currentPanel.webview.html = getWebviewContent();
      // panel.webview.html = getEditorWebview(context, document.uri.fsPath);
    }
  });
}
