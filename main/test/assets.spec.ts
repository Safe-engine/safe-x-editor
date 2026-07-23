import { afterEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GlobalData } from '../parser/global';
import { parseAssetsSrcFile, parseJsonCache } from '../services/assets';

const folders: string[] = [];

afterEach(() => {
  folders.splice(0).forEach(folder => rmSync(folder, { recursive: true, force: true }));
});

describe('parseJsonCache', () => {
  it('ignores non-call assignments while reading JSON cache entries', () => {
    const folder = mkdtempSync(join(tmpdir(), 'safe-x-editor-'));
    folders.push(folder);
    const cacheFile = join(folder, 'JsonCache.ts');
    writeFileSync(cacheFile, `
      class JsonCache {
        load() {
          this.isLoaded = true;
          this.empty = loadJsonFromCache();
          this.settings = loadJsonFromCache(SettingsJson);
        }
      }
    `);
    const settings = { key: 'SettingsJson' };

    expect(parseJsonCache(cacheFile, [settings])).toEqual({ settings });
  });
});

describe('parseAssetsSrcFile', () => {
  it('reads SVG dimensions from its viewBox', () => {
    const folder = mkdtempSync(join(tmpdir(), 'safe-x-editor-'));
    folders.push(folder);
    GlobalData.rootProject = folder;
    mkdirSync(join(folder, 'res'), { recursive: true });
    mkdirSync(join(folder, 'src', 'assets'), { recursive: true });
    writeFileSync(join(folder, 'res', 'icon.svg'), '<svg viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg"/>');
    const assetsFile = join(folder, 'src', 'assets', 'TextureAssets.ts');
    writeFileSync(assetsFile, 'export const icon = "icon.svg";');
    const panel = { webview: { asWebviewUri: (uri) => uri.toString() } } as any;

    expect(parseAssetsSrcFile(assetsFile, panel)).toEqual([
      expect.objectContaining({ key: 'icon', path: 'icon.svg', size: { width: 512, height: 256 } }),
    ]);
  });
});
