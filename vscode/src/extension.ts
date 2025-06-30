import * as vscode from 'vscode';
import Router from './router/Router';
import { getEditorWebview } from './webview';

export function activate(context: vscode.ExtensionContext) {
  console.log("Activated safexEditor")
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'safexEditor.openSafex',
      async (uri: vscode.Uri) => {
        const panel = vscode.window.createWebviewPanel(
          'safexEditor',
          'Safex Editor',
          vscode.ViewColumn.One,
          { enableScripts: true }
        );
        panel.webview.html = getEditorWebview(context, uri.fsPath);
        Router(panel, context)
      }
    )
  );
}
