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

        panel.webview.html = getEditorWebview(context, uri.fsPath);

        panel.webview.onDidReceiveMessage(
          async (msg) => {
            if (msg.command === 'export') {
              const selected: string[] = msg.layers;
              console.log('Selected layers:', selected);
              vscode.window.showInformationMessage(
                `✅ Edited scene`
              );
              panel.dispose();
            }
          },
          undefined,
          context.subscriptions
        );
      }
    )
  );
}
