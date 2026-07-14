import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseJsonCache } from '../services/assets';

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
