import { GlobalData } from '@@/parser/global';
import { afterEach, describe, expect, it } from 'bun:test';
import { parseValue } from '../parser/ast';

const memberExpression = {
  type: 'MemberExpression',
  object: { type: 'Identifier', name: 'node' },
  property: { type: 'Identifier', name: 'visible' },
  computed: false,
};

afterEach(() => {
  delete GlobalData.enumsName;
});

describe('parseValue member expressions', () => {
  it('parses a member expression when enum names are not initialized', () => {
    expect(parseValue(memberExpression)).toBe('node->visible');
  });

  it('preserves enum member parsing when enum names are initialized', () => {
    GlobalData.enumsName = ['node'];

    expect(parseValue(memberExpression)).toBe('node_visible');
  });
});
