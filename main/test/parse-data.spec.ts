import { describe, expect, it } from 'bun:test';
import { parse } from '@typescript-eslint/typescript-estree';
import { convertComponentData, genReactComponentString } from '../utils/ParseData';

const source = `const view = (
  <Container>
    {/* Outer Panel Container */}
    <Sprite spriteFrame={sf_button}>
      {/* Section 1: Emoji Picker Icons */}
      <Label string="Emoji picker" />
      {/* Emoji Row 1 */}
    </Sprite>
  </Container>
);`;

describe('JSX comments', () => {
  it('preserves comments when a component is parsed and written', async () => {
    const parsed = parse(source, { jsx: true, range: true });
    const { treeData } = await convertComponentData(parsed, 'ChatPanel.tsx', source);
    const { component } = genReactComponentString(treeData);

    expect(component).toContain('{/* Outer Panel Container */}');
    expect(component).toContain('{/* Section 1: Emoji Picker Icons */}');
    expect(component).toContain('{/* Emoji Row 1 */}');

    const written = `const view = (${component});`;
    const reparsed = parse(written, { jsx: true, range: true });
    const roundTripped = await convertComponentData(reparsed, 'ChatPanel.tsx', written);

    expect(roundTripped.treeData.comments).toEqual([
      { index: 0, source: '{/* Outer Panel Container */}' },
    ]);
    expect(roundTripped.treeData.children[0].comments).toEqual([
      { index: 0, source: '{/* Section 1: Emoji Picker Icons */}' },
      { index: 1, source: '{/* Emoji Row 1 */}' },
    ]);
  });
});
