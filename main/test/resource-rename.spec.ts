import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { renameResource, replaceAssetKeyReferences } from '../services/ResourceRenameService';

const folders: string[] = [];

afterEach(() => {
  folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true, force: true }));
});

describe('replaceAssetKeyReferences', () => {
  it('updates resource identifiers in every source-code file', () => {
    const source = mkdtempSync(join(tmpdir(), 'safe-x-editor-'));
    folders.push(source);
    mkdirSync(join(source, 'nested'), { recursive: true });
    writeFileSync(join(source, 'Scene.tsx'), 'import { sf_hero } from "./assets";\nconst sprite = sf_hero;');
    writeFileSync(join(source, 'nested', 'data.ts'), 'export const texture = sf_hero;');
    writeFileSync(join(source, 'notes.txt'), 'sf_hero');

    expect(replaceAssetKeyReferences(source, 'sf_hero', 'sf_knight')).toBe(2);
    expect(readFileSync(join(source, 'Scene.tsx'), 'utf8')).toContain('sf_knight');
    expect(readFileSync(join(source, 'nested', 'data.ts'), 'utf8')).toContain('sf_knight');
    expect(readFileSync(join(source, 'notes.txt'), 'utf8')).toBe('sf_hero');
  });
});

describe('renameResource', () => {
  it('renames the resource, regenerates its key, and updates source references', () => {
    const rootFolder = mkdtempSync(join(tmpdir(), 'safe-x-editor-'));
    folders.push(rootFolder);
    mkdirSync(join(rootFolder, 'res'), { recursive: true });
    mkdirSync(join(rootFolder, 'src', 'assets'), { recursive: true });
    writeFileSync(join(rootFolder, 'res', 'hero.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLx4QAAAABJRU5ErkJggg==', 'base64'));
    writeFileSync(join(rootFolder, 'src', 'assets', 'TextureAssets.ts'), "export const sf_hero = 'hero.png';\n");
    writeFileSync(join(rootFolder, 'src', 'Scene.tsx'), "import { sf_hero } from './assets/TextureAssets';\nconst sprite = sf_hero;\n");

    const result = renameResource({
      rootFolder,
      resourcePath: 'hero.png',
      resourceKey: 'sf_hero',
      newName: 'knight.png',
    }, () => {
      writeFileSync(join(rootFolder, 'src', 'assets', 'TextureAssets.ts'), "export const sf_knight = 'knight.png';\n");
    });

    expect(result).toEqual({ success: true, oldKey: 'sf_hero', newKey: 'sf_knight', replacedFiles: 1 });
    expect(readFileSync(join(rootFolder, 'src', 'Scene.tsx'), 'utf8')).toContain('sf_knight');
    expect(readFileSync(join(rootFolder, 'res', 'knight.png'))).toHaveLength(70);
  });
});
