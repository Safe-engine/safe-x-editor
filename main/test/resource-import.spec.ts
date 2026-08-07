import { afterEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { importResources } from '../services/ResourceImportService';

const folders: string[] = [];

afterEach(() => {
  folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true, force: true }));
});

describe('importResources', () => {
  it('copies dropped files into the selected resource folder and returns their synced key', () => {
    const rootFolder = mkdtempSync(join(tmpdir(), 'safe-x-editor-'));
    const sourceFolder = mkdtempSync(join(tmpdir(), 'safe-x-editor-source-'));
    folders.push(rootFolder, sourceFolder);
    mkdirSync(join(rootFolder, 'src', 'assets'), { recursive: true });
    writeFileSync(join(sourceFolder, 'hero.png'), 'png-data');

    const result = importResources({
      rootFolder,
      resourcePath: 'Texture',
      sourcePaths: [join(sourceFolder, 'hero.png')],
    }, () => {
      writeFileSync(join(rootFolder, 'src', 'assets', 'TextureAssets.ts'), "export const sf_hero = 'Texture/hero.png';\n");
    });

    expect(readFileSync(join(rootFolder, 'res', 'Texture', 'hero.png'), 'utf8')).toBe('png-data');
    expect(result).toEqual({ success: true, assets: [{ path: 'Texture/hero.png', key: 'sf_hero' }] });
  });

  it('does not overwrite an existing resource', () => {
    const rootFolder = mkdtempSync(join(tmpdir(), 'safe-x-editor-'));
    const sourceFolder = mkdtempSync(join(tmpdir(), 'safe-x-editor-source-'));
    folders.push(rootFolder, sourceFolder);
    mkdirSync(join(rootFolder, 'res', 'Texture'), { recursive: true });
    writeFileSync(join(rootFolder, 'res', 'Texture', 'hero.png'), 'existing');
    writeFileSync(join(sourceFolder, 'hero.png'), 'new');

    expect(() => importResources({ rootFolder, resourcePath: 'Texture', sourcePaths: [join(sourceFolder, 'hero.png')] }, () => undefined))
      .toThrow('hero.png already exists in this folder.');
    expect(existsSync(join(rootFolder, 'res', 'Texture', 'hero.png'))).toBeTrue();
  });
});
