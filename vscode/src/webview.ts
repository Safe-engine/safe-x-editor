import { readFileSync } from "fs";
import path from "path";
import * as vscode from 'vscode';

export function getEditorWebview(context: vscode.ExtensionContext, filePath: string, panel: vscode.WebviewPanel) {
  // console.log('getEditorWebview', filePath)
  const folders = vscode.workspace.workspaceFolders;
  const rootProject = folders[0].uri.fsPath
  const indexHtml = path.join(context.extensionPath, 'media', 'index.html')
  const arrowPng = path.join(context.extensionPath, 'media', 'Ico_arrow.png')
  const html = readFileSync(indexHtml, 'utf-8')
  return html.replace('REPLACE_FILE_PATH', filePath)
    .replace('REPLACE_ROOT_PROJECT', rootProject)
    .replace('Ico_arrow.png', panel.webview.asWebviewUri(vscode.Uri.file(arrowPng)).toString())
}
