import { afterEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { importResources } from '../services/ResourceImportService';
import { deleteFolder } from '../services/FilesService';

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

  it('imports multiple files and folders in a single batch', () => {
    const rootFolder = mkdtempSync(join(tmpdir(), 'safe-x-editor-'));
    const sourceFolder = mkdtempSync(join(tmpdir(), 'safe-x-editor-source-'));
    folders.push(rootFolder, sourceFolder);
    mkdirSync(join(rootFolder, 'src', 'assets'), { recursive: true });

    // Create multiple files
    writeFileSync(join(sourceFolder, 'img1.png'), 'img1-data');
    writeFileSync(join(sourceFolder, 'img2.png'), 'img2-data');

    // Create subfolder with nested files
    const subFolder = join(sourceFolder, 'sub');
    mkdirSync(subFolder, { recursive: true });
    writeFileSync(join(subFolder, 'nested.json'), '{"nested":true}');

    const result = importResources({
      rootFolder,
      resourcePath: 'res',
      sourcePaths: [join(sourceFolder, 'img1.png'), join(sourceFolder, 'img2.png'), subFolder],
    }, () => {
      writeFileSync(
        join(rootFolder, 'src', 'assets', 'TextureAssets.ts'),
        "export const sf_img1 = 'img1.png';\nexport const sf_img2 = 'img2.png';\n"
      );
    });

    expect(readFileSync(join(rootFolder, 'res', 'img1.png'), 'utf8')).toBe('img1-data');
    expect(readFileSync(join(rootFolder, 'res', 'img2.png'), 'utf8')).toBe('img2-data');
    expect(readFileSync(join(rootFolder, 'res', 'sub', 'nested.json'), 'utf8')).toBe('{"nested":true}');
    expect(result.success).toBeTrue();
    expect(result.assets).toHaveLength(3);
  });

  it('resolves destination folder when dropping onto an existing file path', () => {
    const rootFolder = mkdtempSync(join(tmpdir(), 'safe-x-editor-'));
    const sourceFolder = mkdtempSync(join(tmpdir(), 'safe-x-editor-source-'));
    folders.push(rootFolder, sourceFolder);
    mkdirSync(join(rootFolder, 'src', 'assets'), { recursive: true });
    mkdirSync(join(rootFolder, 'res', 'Texture'), { recursive: true });
    writeFileSync(join(rootFolder, 'res', 'Texture', 'existing.png'), 'existing');
    writeFileSync(join(sourceFolder, 'dropped.png'), 'dropped-data');

    const result = importResources({
      rootFolder,
      resourcePath: 'Texture/existing.png',
      sourcePaths: [join(sourceFolder, 'dropped.png')],
    }, () => {
      writeFileSync(join(rootFolder, 'src', 'assets', 'TextureAssets.ts'), "export const sf_dropped = 'Texture/dropped.png';\n");
    });

    expect(readFileSync(join(rootFolder, 'res', 'Texture', 'dropped.png'), 'utf8')).toBe('dropped-data');
    expect(result.success).toBeTrue();
  });
});

describe('deleteFolder', () => {
  it('deletes a single file with path or folderPath', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'safe-x-delete-test-'));
    folders.push(tempDir);
    const file1 = join(tempDir, 'file1.txt');
    writeFileSync(file1, 'hello');
    expect(existsSync(file1)).toBeTrue();

    await deleteFolder({ path: file1 });
    expect(existsSync(file1)).toBeFalse();
  });

  it('deletes a directory recursively', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'safe-x-delete-test-'));
    folders.push(tempDir);
    const subDir = join(tempDir, 'nested');
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, 'subfile.txt'), 'nested content');
    expect(existsSync(subDir)).toBeTrue();

    await deleteFolder({ folderPath: subDir });
    expect(existsSync(subDir)).toBeFalse();
  });

  it('deletes multiple files and folders in a batch with paths array', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'safe-x-delete-test-'));
    folders.push(tempDir);
    const fileA = join(tempDir, 'a.png');
    const fileB = join(tempDir, 'b.png');
    const dirC = join(tempDir, 'folderC');
    mkdirSync(dirC, { recursive: true });
    writeFileSync(fileA, 'data-a');
    writeFileSync(fileB, 'data-b');
    writeFileSync(join(dirC, 'inside.json'), '{}');

    expect(existsSync(fileA)).toBeTrue();
    expect(existsSync(fileB)).toBeTrue();
    expect(existsSync(dirC)).toBeTrue();

    await deleteFolder({ paths: [fileA, fileB, dirC] });

    expect(existsSync(fileA)).toBeFalse();
    expect(existsSync(fileB)).toBeFalse();
    expect(existsSync(dirC)).toBeFalse();
  });
});
