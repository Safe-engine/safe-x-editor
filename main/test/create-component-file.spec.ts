import { afterEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createComponentFile } from '../services/ComponentService';

const tempDirectories: string[] = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('createComponentFile', () => {
  it('creates scenes with the Scene and Container imports', () => {
    const rootFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-x-editor-'));
    tempDirectories.push(rootFolder);
    const directory = path.join(rootFolder, 'src', 'scene');
    fs.mkdirSync(directory, { recursive: true });

    const result = createComponentFile({ rootFolder, directory, name: 'GameScene', kind: 'scene' });

    expect(result).toEqual({ success: true, path: path.join(directory, 'GameScene.tsx') });
    expect(fs.readFileSync(result.path, 'utf8')).toContain("import { Scene, Container } from '@safe-engine/sdl';");
  });
});
