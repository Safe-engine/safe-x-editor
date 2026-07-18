import ESTraverse from "estraverse";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";
import { parse } from "../transform";

export function saveSettings(groupsList = [], colliderMatrix = []) {
  const folderPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  const settingsFile = join(folderPath, 'src', 'settings.ts');
  if (!existsSync(settingsFile)) {
    console.warn(`Settings file not found at ${settingsFile}`);
    return;
  }
  const code = readFileSync(settingsFile, 'utf-8')
  const parsed: any = parse((code));
  // console.log('Parsed settings:', parsed);
  const replacements: Array<{ start: number; end: number; value: string }> = [];
  // Traverse the AST to find replace the colliderMatrix
  ESTraverse.traverse(parsed, {
    enter: function (node: any) {
      // console.log(' traverse:', node);
      if (node.type === 'VariableDeclarator' && node.id.name === 'colliderMatrix') {
        // console.log(' traverse:', node.init);
        const newColliderMatrix = JSON.stringify(colliderMatrix);
        const [start, end] = node.init.range
        replacements.push({ start, end, value: newColliderMatrix });
      } else if (node.type === 'TSEnumBody') {
        const groupNames = groupsList.map((group: string) => group.trim()).filter(Boolean);
        if (groupNames.some((group: string) => !/^[A-Za-z_$][\w$]*$/.test(group))) {
          throw Error('Group names must be valid identifiers.');
        }
        const [start, end] = node.range;
        replacements.push({ start, end, value: `{\n  ${groupNames.join(',\n  ')}\n}` });
      }
    },
    fallback: 'iteration',
  });
  const newCode = replacements
    .sort((left, right) => right.start - left.start)
    .reduce((content, replacement) => content.slice(0, replacement.start) + replacement.value + content.slice(replacement.end), code);
  writeFileSync(settingsFile, newCode, 'utf-8');
  return { success: true };
}

export function getSettings() {
  const folderPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  const settingsFile = join(folderPath, 'src', 'settings.ts');
  if (!existsSync(settingsFile)) {
    console.warn(`Settings file not found at ${settingsFile}`);
    return;
  }
  const code = readFileSync(settingsFile, 'utf-8')
  const parsed: any = parse((code));
  // console.log('Parsed settings:', parsed);
  let colliderMatrix = '[]';
  let groupsList = '';
  // Traverse the AST to find the designed resolution
  ESTraverse.traverse(parsed, {
    enter: function (node: any) {
      // console.log(' traverse:', node);
      if (node.type === 'VariableDeclarator' && node.id.name === 'colliderMatrix') {
        // console.log(' traverse:', node);
        const [start, end] = node.init.range
        colliderMatrix = code.substring(start, end);
      } else if ('TSEnumBody' === node.type) {
        // console.log(' traverse:', node.members.map((m: any) => m.id.name));
        groupsList = node.members.map((m: any) => `"${m.id.name}"`).join(',');
      }
    },
    fallback: 'iteration',
  });
  return {
    groupsList,
    colliderMatrix,
  };
}
