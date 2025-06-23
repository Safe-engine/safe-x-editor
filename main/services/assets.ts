import { parseFile } from "@@/transform";
import ESTraverse from "estraverse";
import { readFileSync } from 'fs';
import { existsSync } from 'fs-extra';
import { join } from 'path';

export function parseAssets(parsed) {
  const ret = [];
  ESTraverse.traverse(parsed, {
    enter: function (node, parent) {
      if (node.type === 'VariableDeclarator') {
        if (node.id.type === 'Identifier' && node.init.type === 'Literal') {
          // console.log(node);
          // console.log(node.init.properties)
          const { name } = node.id;
          // const values = node.init.properties.map((v: any) => ({
          //   key: v.key.name,
          //   value: v.value.value
          // }));
          ret.push({
            key: name,
            value: node.init.value
          });
        }
      }
    },
    fallback: 'iteration'
  });
  return ret;
}

export function getAnimations(root: string, value: string): string[] {
  const filePathAssets = join(root, 'res', value);
  const json = JSON.parse(readFileSync(filePathAssets, 'utf-8'));
  return Object.keys(json.animations);
}

export function parseAssetsSrcFile(filePathAssets: string) {
  if (!existsSync(filePathAssets)) return [];
  const ast = parseFile(filePathAssets);
  return parseAssets(ast) as any;
}