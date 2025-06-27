import { readFileSync } from "fs";
import path from "path";
import * as vscode from 'vscode';

export function getEditorWebview(context: vscode.ExtensionContext, filePath: string) {
  // console.log('getEditorWebview', filePath)
  // const indexHtml = path.join(context.extensionPath, 'media', 'index.html')
  const indexHtml = path.join(context.extensionPath, '..', 'dist', 'index.html')
  const html = readFileSync(indexHtml, 'utf-8')
  return html.replace('REPLACE_FILE_PATH', filePath)
}
