import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path/posix';
import { parse } from '../transform';

type ProjectColor = {
  key: string;
  originalKey?: string;
  value: number[];
};

function colorDeclaration(key: string, value: number[], factory = 'Color4F') {
  const channels = value
    .map((channel) => factory === 'Color4F' ? Number((channel / 255).toFixed(6)) : channel)
    .join(', ');
  return `export const ${key} = ${factory}(${channels});`;
}

function validateColors(colors: ProjectColor[]) {
  const keys = new Set<string>();
  return colors.map((color) => {
    const key = color.key?.trim();
    if (!/^[A-Za-z_$][\w$]*$/.test(key)) throw Error(`Invalid color name: ${color.key}`);
    if (keys.has(key)) throw Error(`Color "${key}" already exists.`);
    if (!Array.isArray(color.value) || color.value.length !== 4 || color.value.some((value) => !Number.isFinite(value) || value < 0 || value > 255)) {
      throw Error(`Color "${key}" must have four channels between 0 and 255.`);
    }
    keys.add(key);
    return { ...color, key, value: color.value.map(Number) };
  });
}

function getColorStatements(source: string) {
  const ast: any = parse(source);
  return ast.body
    .map((statement) => {
      const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
      const declarator = declaration?.type === 'VariableDeclaration' && declaration.declarations.length === 1 ? declaration.declarations[0] : undefined;
      const factory = declarator?.init?.callee?.name;
      if (declarator?.id?.type !== 'Identifier' || declarator.init?.type !== 'CallExpression' || !['Color4F', 'Color4B'].includes(factory)) {
        return undefined;
      }
      return { key: declarator.id.name, factory, range: statement.range };
    })
    .filter(Boolean);
}

export async function updateProjectColors({ rootFolder, colors }: { rootFolder: string; colors: ProjectColor[] }) {
  if (!rootFolder) throw Error('No project is loaded.');

  const filePath = join(rootFolder, 'src', 'helper', 'constant.ts');
  if (!existsSync(filePath)) throw Error('Project color constants file was not found.');

  const source = readFileSync(filePath, 'utf-8');
  const statements = getColorStatements(source);
  const colorsToSave = validateColors(colors || []);
  const statementsByKey = new Map(statements.map((statement) => [statement.key, statement]));
  const submittedOriginalKeys = new Set<string>();
  const replacements: Array<{ start: number; end: number; value: string }> = [];
  const additions: string[] = [];

  colorsToSave.forEach((color) => {
    if (!color.originalKey) {
      if (statementsByKey.has(color.key)) throw Error(`Color "${color.key}" already exists.`);
      additions.push(colorDeclaration(color.key, color.value, statements[0]?.factory));
      return;
    }

    const statement = statementsByKey.get(color.originalKey);
    if (!statement) throw Error(`Color "${color.originalKey}" no longer exists.`);
    if (submittedOriginalKeys.has(color.originalKey)) throw Error(`Color "${color.originalKey}" was submitted more than once.`);
    submittedOriginalKeys.add(color.originalKey);
    replacements.push({ start: statement.range[0], end: statement.range[1], value: colorDeclaration(color.key, color.value, statement.factory) });
  });

  statements.forEach((statement) => {
    if (!submittedOriginalKeys.has(statement.key)) replacements.push({ start: statement.range[0], end: statement.range[1], value: '' });
  });

  const updated = replacements
    .sort((left, right) => right.start - left.start)
    .reduce((content, replacement) => content.slice(0, replacement.start) + replacement.value + content.slice(replacement.end), source);
  const suffix = additions.length ? `${updated.endsWith('\n') ? '' : '\n'}${additions.join('\n')}\n` : '';
  writeFileSync(filePath, `${updated}${suffix}`, 'utf-8');
  return { success: true };
}
