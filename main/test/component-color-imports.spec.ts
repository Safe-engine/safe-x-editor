import { afterEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GlobalData } from '../parser/global';
import { updateComponentTag } from '../services/ComponentService';

const folders: string[] = [];

afterEach(() => {
  folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true, force: true }));
});

describe('updateComponentTag color imports', () => {
  it('imports color constants selected in saved props', () => {
    const folder = mkdtempSync(join(tmpdir(), 'safe-x-editor-'));
    folders.push(folder);
    GlobalData.rootProject = folder;
    mkdirSync(join(folder, 'src', 'helper'), { recursive: true });
    mkdirSync(join(folder, 'src', 'components'), { recursive: true });
    writeFileSync(join(folder, 'src', 'helper', 'colors.ts'), 'export const Accent = Color4F(1, 1, 1, 1);\n');
    const componentPath = join(folder, 'src', 'components', 'Example.tsx');
    writeFileSync(componentPath, `import { ComponentX, Container, Panel } from '@safe-engine/sdl';

export class Example extends ComponentX {
  __view() {
    <Container><Panel /></Container>
  }
}
`);

    updateComponentTag({
      filePath: componentPath,
      nodesData: {
        tag: 'Container',
        props: {},
        components: [],
        children: [{ tag: 'Panel', props: { color: 'Accent' }, components: [], children: [] }],
      },
    });

    const saved = readFileSync(componentPath, 'utf8');
    expect(saved).toContain("import { Accent } from '../helper/colors';");
    expect(saved).toContain('<Panel color={Accent} />');
  });

  it('imports texture assets selected as sprite frames', () => {
    const folder = mkdtempSync(join(tmpdir(), 'safe-x-editor-'));
    folders.push(folder);
    GlobalData.rootProject = folder;
    mkdirSync(join(folder, 'src', 'assets'), { recursive: true });
    mkdirSync(join(folder, 'src', 'components'), { recursive: true });
    writeFileSync(join(folder, 'src', 'assets', 'TextureAssets.ts'), 'export const sf_Hero = "hero.png";\n');
    const componentPath = join(folder, 'src', 'components', 'Example.tsx');
    writeFileSync(componentPath, `import { ComponentX, Container, Sprite } from '@safe-engine/sdl';

export class Example extends ComponentX {
  __view() {
    <Container><Sprite /></Container>
  }
}
`);

    updateComponentTag({
      filePath: componentPath,
      nodesData: {
        tag: 'Container',
        props: {},
        components: [],
        children: [{ tag: 'Sprite', props: { spriteFrame: 'sf_Hero' }, components: [], children: [] }],
      },
    });

    const saved = readFileSync(componentPath, 'utf8');
    expect(saved).toContain("import { sf_Hero } from '../assets';");
    expect(saved).toContain('<Sprite spriteFrame={sf_Hero} />');
  });

  it('imports JSON assets selected as diced sprite data', () => {
    const folder = mkdtempSync(join(tmpdir(), 'safe-x-editor-'));
    folders.push(folder);
    GlobalData.rootProject = folder;
    mkdirSync(join(folder, 'src', 'assets'), { recursive: true });
    mkdirSync(join(folder, 'src', 'components'), { recursive: true });
    writeFileSync(join(folder, 'src', 'assets', 'JsonAssets.ts'), 'export const pet_choang_coc_json = "pet.json";\n');
    const componentPath = join(folder, 'src', 'components', 'Example.tsx');
    writeFileSync(componentPath, `import { ComponentX, Container, DicedSprite } from '@safe-engine/sdl';

export class Example extends ComponentX {
  __view() {
    <Container><DicedSprite /></Container>
  }
}
`);

    updateComponentTag({
      filePath: componentPath,
      nodesData: {
        tag: 'Container',
        props: {},
        components: [],
        children: [{ tag: 'DicedSprite', props: { data: 'pet_choang_coc_json', animation: 'idle' }, components: [], children: [] }],
      },
    });

    const saved = readFileSync(componentPath, 'utf8');
    expect(saved).toContain("import { pet_choang_coc_json } from '../assets/JsonAssets';");
    expect(saved).toContain('<DicedSprite data={pet_choang_coc_json} animation="idle" />');
  });
});
