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
  // Traverse the AST to find the designed resolution
  ESTraverse.traverse(parsed, {
    enter: function (node: any) {
      // console.log(' traverse:', node);
      if (node.type === 'VariableDeclarator' && node.id.name === 'designedResolution') {
        // console.log(' traverse:', node.init);
        if (node.init.type === 'ObjectExpression') {
          const widthProp = node.init.properties.find(prop => prop.key.name === 'width');
          const heightProp = node.init.properties.find(prop => prop.key.name === 'height');
          if (widthProp && heightProp) {
            width = widthProp.value.value;
            height = heightProp.value.value;
            console.log('Found width, height:', width, height);
          }
        }
        this.break(); // Stop traversing further once we find the designedResolution
      }
    },
    fallback: 'iteration',
  });
  return {
    width,
    height,
  };
}

