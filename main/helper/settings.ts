import { parseFile } from "@@/transform";
import ESTraverse from "estraverse";
import { existsSync } from 'fs';
import { join } from 'path';

export function getResolutionSettings(folderPath: string) {
  const settingsFile = join(folderPath, 'src', 'settings.ts');
  if (!existsSync(settingsFile)) {
    console.warn(`Settings file not found at ${settingsFile}`);
    return;
  }
  const parsed: any = parseFile(settingsFile);
  // console.log('Parsed settings:', parsed);
  let width = 1920;
  let height = 1080;
  let designedWidth: number | undefined;
  let designedHeight: number | undefined;
  // Traverse the AST to find the designed dimensions.
  ESTraverse.traverse(parsed, {
    enter: function (node: any) {
      // console.log(' traverse:', node);
      if (node.type !== 'VariableDeclarator') return;

      if (node.id.name === 'DESIGNED_WIDTH' && node.init?.type === 'Literal' && typeof node.init.value === 'number') {
        designedWidth = node.init.value;
      }

      if (node.id.name === 'DESIGNED_HEIGHT' && node.init?.type === 'Literal' && typeof node.init.value === 'number') {
        designedHeight = node.init.value;
      }

      if (node.id.name === 'designedResolution' && node.init?.type === 'ObjectExpression') {
        const widthProp = node.init.properties.find(prop => prop.key.name === 'width');
        const heightProp = node.init.properties.find(prop => prop.key.name === 'height');
        if (widthProp?.value?.type === 'Literal' && heightProp?.value?.type === 'Literal') {
          width = widthProp.value.value;
          height = heightProp.value.value;
        }
      }
    },
    fallback: 'iteration',
  });
  if (designedWidth !== undefined && designedHeight !== undefined) {
    width = designedWidth;
    height = designedHeight;
  }
  return {
    width,
    height,
  };
}
