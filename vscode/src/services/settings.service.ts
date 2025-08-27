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
  let newCode = code;
  // Traverse the AST to find replace the colliderMatrix
  ESTraverse.traverse(parsed, {
    enter: function (node: any) {
      // console.log(' traverse:', node);
      if (node.type === 'VariableDeclarator' && node.id.name === 'colliderMatrix') {
        // console.log(' traverse:', node.init);
        const newColliderMatrix = JSON.stringify(colliderMatrix);
        const [start, end] = node.init.range
        newCode = newCode.substring(0, start) + newColliderMatrix + newCode.substring(end);
      }
    },
    fallback: 'iteration',
  });
  // ESTraverse.traverse(parsed, {
  //   enter: function (node: any) {
  //     // console.log(' traverse:', node);
  //     if ('TSEnumBody' === node.type) {
  //       const newGroupsList = groupsList.map((g: string) => `${g},`).join('\n  ');
  //       const [start, end] = node.range
  //       newCode = newCode.substring(0, start + 1) + '\n  ' + newGroupsList + '\n' + newCode.substring(end - 1);
  //     }
  //   },
  //   fallback: 'iteration',
  // });
  // Write the modified code back to the file
  // console.log('New settings code:', newCode);
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
        console.log(' traverse:', node);
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
