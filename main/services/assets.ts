import { GlobalData } from "@@/parser/global";
import ESTraverse from "estraverse";
import { readFileSync } from 'fs';
import { existsSync } from 'fs-extra';
import sizeOf from 'image-size';
import { get } from "lodash";
import { join } from 'path';
import { Uri, WebviewView, workspace } from "vscode";
import { parseValue } from "../parser/ast";
import { parseFile } from "../transform";

export function getViewPath(panel: WebviewView, relativePath?: Uri) {
  return relativePath && panel ? panel.webview.asWebviewUri(relativePath).toString() : undefined;
}

function getJsonData(filePath: string, absolutePath: string) {
  console.log('getJsonData', filePath, absolutePath);
  if (filePath.endsWith('.json')) { return JSON.parse(readFileSync(absolutePath, 'utf-8')); }
  return undefined;
}

function getTexturePath(base, relativePath: string) {
  if (!relativePath) { return undefined; }
  if (relativePath.endsWith('.json')) { return Uri.joinPath(base, 'res', relativePath.replace('.json', '.png')); }
  if (relativePath.endsWith('.plist')) { return Uri.joinPath(base, 'res', relativePath.replace('.plist', '.png')); }
}

export function parseAssets(parsed, panel?: WebviewView, isColor = false) {
  const ret = [];
  const base = GlobalData.rootProject;
  ESTraverse.traverse(parsed, {
    enter: function (node, parent) {
      if (node.type === 'VariableDeclarator') {
        const { name } = node.id as any;
        if (node.id.type === 'Identifier' && node.init.type === 'Literal') {
          if (isColor) { return; }
          // console.log(node.init.properties)
          const relativePath = node.init.value as string;
          const fileUri = join(base, 'res', relativePath);
          let size;
          if (relativePath.endsWith('.png') || relativePath.endsWith('.jpg')) {
            if (existsSync(fileUri)) {
              const { width, height } = sizeOf(readFileSync(fileUri));
              // console.log(fileUri, width, height);
              size = { width, height };
            }
          }
          if (!panel) {
            ret.push({
              size,
              path: relativePath,
              key: name,
              json: getJsonData(relativePath, fileUri),
              value: relativePath
            });
            return;
          }
          const texturePath = getTexturePath(base, relativePath);
          ret.push({
            size,
            path: relativePath,
            json: getJsonData(relativePath, fileUri),
            key: name,
            texture: getViewPath(panel, texturePath),
            value: fileUri
          });
        } else if ('CallExpression' === node.init.type) {
          ret.push({
            key: name,
            value: node.init.arguments.map((a: any) => {
              if ("Color4F" === get(node, 'init.callee.name')) { return a.value * 255; }
              return a.value;
            })
          });
        } else if ('ObjectExpression' === node.init.type) {
          if (isColor) { return; }
          const obj = {};
          let path;
          node.init.properties.forEach((p: any) => {
            if (p.type === 'Property' && p.value.type === 'Literal') {
              const key = p.key.value ?? p.key.name;
              if (!key) { return; }
              const base = workspace.workspaceFolders[0].uri;
              const fileUri = Uri.joinPath(base, 'res', p.value.value as string);
              // console.log('ObjectExpression asset:', key, fileUri.fsPath);
              obj[key] = panel ? getViewPath(panel, fileUri) : fileUri.fsPath;
              if (key === 'atlas') {
                path = p.value.value as string;
              }
            }
          });
          ret.push({
            path,
            key: name,
            value: obj
          });
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

export function parseAssetsSrcFile(filePathAssets: string, panel?: WebviewView, isColor = false) {
  filePathAssets = filePathAssets.replace(/\\/g, '/')
  if (!existsSync(filePathAssets)) { return []; }
  const ast = parseFile(filePathAssets);
  return parseAssets(ast, panel, isColor);
}

export function parseJsonCache(cacheFile, jsonAssets) {
  const varsList = {};
  if (!existsSync(cacheFile)) { return varsList; }
  const ast: any = parseFile(cacheFile);
  ESTraverse.traverse(ast, {
    leave(node: any, parent) {
      if (node.type === 'AssignmentExpression') {
        const { left, right } = node;
        // console.log('JsonCache', node);
        const name = parseValue(left.property);
        varsList[name] = jsonAssets.find(a => a.key === right.arguments[0].name);
        // } else if (node.type === 'MethodDefinition') {
        // console.log(node.value.body)
      }
    },
    fallback: 'iteration',
  });
  return varsList;
}

export function parseEnums(cacheFile, jsonAssets) {
  const ast: any = parseFile(cacheFile);
  const varsList = {};
  ESTraverse.traverse(ast, {
    leave(node: any, parent) {
      if (node.type === 'TSEnumDeclaration') {
        const { id, members } = node;
        // console.log('parseEnums', node);
        varsList[id.name] = {}
        members.map((a, i) => {
          varsList[id.name][a.id.name] = a.initializer ? parseValue(a.initializer) : i;
        });
      }
    },
    fallback: 'iteration',
  });
  return varsList;
}
