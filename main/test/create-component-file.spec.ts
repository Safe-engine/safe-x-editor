import { afterEach, describe, expect, it } from 'bun:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createComponentFile, renameComponent } from '../services/ComponentService';

const tempDirectories: string[] = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('renameComponent', () => {
  it('renames the file, exported class, and source references', async () => {
    const rootFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-x-editor-'));
    tempDirectories.push(rootFolder);
    const componentsDirectory = path.join(rootFolder, 'src', 'components');
    const sceneDirectory = path.join(rootFolder, 'src', 'scene');
    fs.mkdirSync(componentsDirectory, { recursive: true });
    fs.mkdirSync(sceneDirectory, { recursive: true });
    const created = createComponentFile({ rootFolder, directory: componentsDirectory, name: 'OldComponent', kind: 'component' });
    const scenePath = path.join(sceneDirectory, 'GameScene.tsx');
    fs.writeFileSync(scenePath, "import { OldComponent } from '../components/OldComponent';\nconst node = new OldComponent();\n");

    const result = await renameComponent({ rootFolder, componentPath: created.path, newName: 'NewComponent.tsx' });

    expect(result).toEqual({ success: true, path: path.join(componentsDirectory, 'NewComponent.tsx'), replacedFiles: 2 });
    expect(fs.existsSync(created.path)).toBe(false);
    expect(fs.readFileSync(result.path, 'utf8')).toContain('export class NewComponent');
    expect(fs.readFileSync(scenePath, 'utf8')).toContain("import { NewComponent } from '../components/NewComponent';");
  });
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
