import * as vscode from 'vscode';
import { getEditorWebview } from './webview';

export function activate(context: vscode.ExtensionContext) {
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

        panel.webview.html = getEditorWebview(context);
        panel.webview.postMessage({
          data: uri.fsPath,
        });
        panel.webview.onDidReceiveMessage(
          async (message) => {
            const { command, payload, messageId } = message;
            let responseData;
            // handler
            panel.webview.postMessage({
              messageId,
              data: responseData,
            });
          },
          undefined,
          context.subscriptions
        );
      }
    )
  );
}
