import ESTraverse from "estraverse";
import { readFileSync } from 'fs';
import { existsSync } from 'fs-extra';
import { join } from 'path';
import { Uri, WebviewPanel, workspace } from "vscode";
import { parseFile } from "../transform";

export function getViewPath(panel: WebviewPanel, relativePath?: Uri) {
  return relativePath ? panel.webview.asWebviewUri(relativePath).toString() : undefined
}

export function parseAssets(parsed, panel?: WebviewPanel) {
  const ret = [];
  ESTraverse.traverse(parsed, {
    enter: function (node, parent) {
      if (node.type === 'VariableDeclarator') {
        // console.log(node);
        const { name } = node.id as any;
        if (node.id.type === 'Identifier' && node.init.type === 'Literal') {
          // console.log(node.init.properties)
          const relativePath = node.init.value as string
          if (!panel) {
            ret.push({
              key: name,
              value: relativePath
            });
            return
          }
          const base = workspace.workspaceFolders[0].uri
          const fileUri = Uri.joinPath(base, 'res', relativePath);
          const texturePath = relativePath.endsWith('.json') ? Uri.joinPath(base, 'res', relativePath.replace('.json', '.png')) : undefined
          ret.push({
            key: name,
            texture: getViewPath(panel, texturePath),
            value: panel.webview.asWebviewUri(fileUri).toString()
          });
        } else if ('ObjectExpression' === node.init.type) {
          const obj = {}
          node.init.properties.forEach((p: any) => {
            if (p.type === 'Property' && p.value.type === 'Literal') {
              const base = workspace.workspaceFolders[0].uri
              const fileUri = Uri.joinPath(base, 'res', p.value.value as string);
              // console.log(fileUri.fsPath);
              obj[p.key.value] = getViewPath(panel, fileUri)
            }
          })
          ret.push({
            key: name,
            value: obj
          })

        }
      }
    },
    fallback: 'iteration'
  });
  return ret;
}

export function getAnimations(root: string, value: string): string[] {
  const filePathAssets = join(root, 'res', value);
  const json = JSON.parse(readFileSync(filePathAssets, 'utf-8'));
  return Object.keys(json.animations);
}

export function parseAssetsSrcFile(filePathAssets: string, panel?: WebviewPanel) {
  if (!existsSync(filePathAssets)) return [];
  const ast = parseFile(filePathAssets);
  return parseAssets(ast, panel) as any;
}