import { describe, expect, it } from 'bun:test';
import { parse } from '@typescript-eslint/typescript-estree';
import { convertComponentData, genReactComponentString } from '../utils/ParseData';
import { removeTextureMatchingNodeSize } from '../../src/helper/node';
import { removeTextureMatchingNodeSizes } from '../utils/NodeSize';

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

describe('SpineBonesControl', () => {
  it('round-trips static bones arrays as a TSX expression', async () => {
    const source = `const view = (
  <SpineSkeleton $push={this.snakesSkeleton} data={sp_snake_1} node={{ x: -94, y: 284, scaleX: 1, name: "snake1", rotation: -4 }} animation="Idle">
    <SpineBonesControl bones={[["1",-14,73],["2",-35,42],["3",7,11],["4",2,-27],["5",40,-62]]} />
  </SpineSkeleton>
);`;
    const parsed = parse(source, { jsx: true, range: true });
    const { treeData } = await convertComponentData(parsed, 'Spine.tsx', source);
    const { component } = genReactComponentString(treeData);

    expect(component).toContain(`node={{ x: -94, y: 284, scaleX: 1, name: 'snake1', rotation: -4 }}`);
    expect(component).toContain(`bones={[['1', -14, 73], ['2', -35, 42], ['3', 7, 11], ['4', 2, -27], ['5', 40, -62]]}`);

    expect(() => parse(`const view = (${component});`, { jsx: true, range: true })).not.toThrow();
  });
});

describe('Sprite', () => {
  it('writes spriteFrame asset names as JSX expressions', () => {
    const { component } = genReactComponentString({ tag: 'Sprite', props: { spriteFrame: 'sf_char_progress' } });

    expect(component).toBe('<Sprite spriteFrame={sf_char_progress} />');
  });

  it('writes an empty spriteFrame as an empty JSX expression', () => {
    const { component } = genReactComponentString({ tag: 'Sprite', props: { spriteFrame: '' } });

    expect(component).toBe('<Sprite spriteFrame={} />');
  });
});

describe('node texture size', () => {
  it('removes explicit dimensions that match the texture size', () => {
    expect(removeTextureMatchingNodeSize({ width: 64, height: 32, x: 10 }, { width: 64, height: 32 }))
      .toEqual({ x: 10 });
  });

  it('keeps dimensions when they differ from the texture size', () => {
    expect(removeTextureMatchingNodeSize({ width: 64, height: 24 }, { width: 64, height: 32 }))
      .toEqual({ width: 64, height: 24 });
  });

  it('removes matching Sprite and ProgressBar dimensions before saving', () => {
    const nodes = [
      { tag: 'Sprite', props: { spriteFrame: '{sf_icon}', node: { width: 64, height: 32 } } },
      { tag: 'ProgressBar', props: { spriteFrame: '{sf_icon}', node: { width: 64, height: 32 } } },
    ];

    removeTextureMatchingNodeSizes(nodes, [{ key: 'sf_icon', size: { width: 64, height: 32 } }]);

    expect(nodes.map((node) => node.props.node)).toEqual([{}, {}]);
  });
});
