import ESTraverse from "estraverse";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";
import { parse } from "../transform";

function getSettingsFile() {
  const folderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!folderPath) throw Error('No project is loaded.');
  const settingsFile = join(folderPath, 'src', 'settings.ts');
  if (!existsSync(settingsFile)) throw Error(`Settings file not found at ${settingsFile}`);
  return settingsFile;
}

function getMainFile() {
  const folderPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!folderPath) throw Error('No project is loaded.');
  const mainFile = join(folderPath, 'src', 'main.ts');
  if (!existsSync(mainFile)) throw Error(`Main file not found at ${mainFile}`);
  return mainFile;
}

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

export function getProjectSettings() {
  const settingsFile = getSettingsFile();
  const code = readFileSync(settingsFile, 'utf-8');
  const parsed: any = parse(code);
  const mainCode = readFileSync(getMainFile(), 'utf-8');
  const mainParsed: any = parse(mainCode);
  const settings = { designedWidth: 1920, designedHeight: 1080, colliderMatrix: '[]', defaultFont: '', defaultFontSize: 48, groupsList: [] as string[] };

  ESTraverse.traverse(parsed, {
    enter(node: any) {
      if (node.type === 'TSEnumDeclaration' && (node.id.name === 'Group' || settings.groupsList.length === 0)) {
        settings.groupsList = node.body.members.map((member: any) => member.id.name);
      }
      if (node.type !== 'VariableDeclarator' || !node.init) return;
      const [start, end] = node.init.range;
      if (node.id.name === 'DESIGNED_WIDTH' && typeof node.init.value === 'number') settings.designedWidth = node.init.value;
      if (node.id.name === 'DESIGNED_HEIGHT' && typeof node.init.value === 'number') settings.designedHeight = node.init.value;
      if (node.id.name === 'colliderMatrix') settings.colliderMatrix = code.slice(start, end);
    },
    fallback: 'iteration',
  });

  ESTraverse.traverse(mainParsed, {
    enter(node: any) {
      if (node.type !== 'AssignmentExpression' || node.left?.type !== 'MemberExpression' || node.left.object?.name !== 'Label') return;
      if (node.left.property?.name === 'defaultFont') settings.defaultFont = mainCode.slice(...node.right.range);
      if (node.left.property?.name === 'defaultSize' && typeof node.right.value === 'number') settings.defaultFontSize = node.right.value;
    },
    fallback: 'iteration',
  });
  return settings;
}

export function saveProjectSettings({ designedWidth, designedHeight, groupsList, colliderMatrix, defaultFont, defaultFontSize }: {
  designedWidth: number;
  designedHeight: number;
  groupsList: string[];
  colliderMatrix: unknown[];
  defaultFont: string;
  defaultFontSize: number;
}) {
  if (!Number.isInteger(designedWidth) || designedWidth <= 0 || !Number.isInteger(designedHeight) || designedHeight <= 0) {
    throw Error('Designed width and height must be positive integers.');
  }
  if (!Array.isArray(colliderMatrix)) throw Error('Collider matrix must be an array.');
  const groups = groupsList.map((group) => group.trim());
  if (groups.some((group) => !group)) throw Error('Group names cannot be empty.');
  if (groups.some((group) => !/^[A-Za-z_$][\w$]*$/.test(group))) throw Error('Group names must be valid identifiers.');
  if (new Set(groups).size !== groups.length) throw Error('Group names must be unique.');
  if (!defaultFont.trim()) throw Error('Default font is required.');
  if (!Number.isInteger(defaultFontSize) || defaultFontSize <= 0) throw Error('Default font size must be a positive integer.');
  const fontExpression = parse(`const __defaultFont = ${defaultFont.trim()}`);
  if (fontExpression.body.length !== 1 || fontExpression.body[0]?.type !== 'VariableDeclaration') {
    throw Error('Default font must be a valid TypeScript expression.');
  }

  const settingsFile = getSettingsFile();
  const code = readFileSync(settingsFile, 'utf-8');
  const parsed: any = parse(code);
  const values = {
    DESIGNED_WIDTH: String(designedWidth),
    DESIGNED_HEIGHT: String(designedHeight),
    colliderMatrix: JSON.stringify(colliderMatrix),
  };
  const replacements: Array<{ start: number; end: number; value: string }> = [];
  const found = new Set<string>();
  let groupEnumFound = false;

  ESTraverse.traverse(parsed, {
    enter(node: any) {
      if (node.type !== 'VariableDeclarator' || !node.init || !(node.id.name in values)) return;
      const [start, end] = node.init.range;
      replacements.push({ start, end, value: values[node.id.name] });
      found.add(node.id.name);
    },
    fallback: 'iteration',
  });

  ESTraverse.traverse(parsed, {
    enter(node: any) {
      if (node.type !== 'TSEnumDeclaration' || node.id.name !== 'Group') return;
      const [start, end] = node.body.range;
      replacements.push({ start, end, value: `{\n  ${groups.join(',\n  ')}\n}` });
      groupEnumFound = true;
    },
    fallback: 'iteration',
  });

  const missing = Object.keys(values).filter((name) => !found.has(name));
  if (missing.length) throw Error(`Project settings not found: ${missing.join(', ')}.`);
  if (!groupEnumFound) throw Error('Group enum not found.');

  const newCode = replacements
    .sort((left, right) => right.start - left.start)
    .reduce((content, replacement) => content.slice(0, replacement.start) + replacement.value + content.slice(replacement.end), code);
  const mainFile = getMainFile();
  const mainCode = readFileSync(mainFile, 'utf-8');
  const mainParsed: any = parse(mainCode);
  const mainReplacements: Array<{ start: number; end: number; value: string }> = [];
  const foundMainSettings = new Set<string>();

  ESTraverse.traverse(mainParsed, {
    enter(node: any) {
      if (node.type !== 'AssignmentExpression' || node.left?.type !== 'MemberExpression' || node.left.object?.name !== 'Label') return;
      if (node.left.property?.name === 'defaultFont') {
        mainReplacements.push({ start: node.right.range[0], end: node.right.range[1], value: defaultFont.trim() });
        foundMainSettings.add('defaultFont');
      }
      if (node.left.property?.name === 'defaultSize') {
        mainReplacements.push({ start: node.right.range[0], end: node.right.range[1], value: String(defaultFontSize) });
        foundMainSettings.add('defaultFontSize');
      }
    },
    fallback: 'iteration',
  });

  const missingMainSettings = ['defaultFont', 'defaultFontSize'].filter((name) => !foundMainSettings.has(name));
  if (missingMainSettings.length) throw Error(`Label settings not found in main.ts: ${missingMainSettings.join(', ')}.`);
  const newMainCode = mainReplacements
    .sort((left, right) => right.start - left.start)
    .reduce((content, replacement) => content.slice(0, replacement.start) + replacement.value + content.slice(replacement.end), mainCode);
  writeFileSync(settingsFile, newCode, 'utf-8');
  writeFileSync(mainFile, newMainCode, 'utf-8');
  return { success: true };
}
