import { parse } from "@typescript-eslint/typescript-estree";
import ESTraverse from "estraverse";
import { readFileSync } from "fs";
import { globSync } from "glob";
import { join } from "path";
import { convertComponentData } from "../utils/ParseData";
import { parseValue } from "./ast";
import { GlobalData } from "./global";
import { getTypeAnnotation } from "./helper";

export async function getClassesMetaData(srcDir: string, idDebug = false) {
  const allComps = globSync(`**/*.tsx`, { cwd: srcDir })
  const res = {}
  for (let index = 0; index < allComps.length; index++) {
    const file = allComps[index];
    if (idDebug) {
      console.log('getClassesMetaData', file)
    }
    const filePath = join(srcDir, file)
    const input = readFileSync(filePath, { encoding: 'utf8' });
    const parsed: any = parse(input, { jsx: true, range: true });
    const { name, treeData } = await convertComponentData(parsed, filePath, input)
    res[name] = treeData;
    ESTraverse.traverse(parsed, {
      enter: function (node, parent) {
        if (node.type === 'ExportDefaultDeclaration') {
          if (node.declaration.type === 'ClassDeclaration') {
            const { id } = node.declaration
            const { name: className } = id
            GlobalData.importPaths[className] = `import ${className} from '../${file}'`
          }
        } else if (node.type === 'ExportNamedDeclaration') {
          if (node.declaration.type === 'ClassDeclaration') {
            const { id } = node.declaration
            const { name: className } = id
            GlobalData.importPaths[className] = `import { ${className} } from '../${file}'`
          }
        } else if (node.type === 'ClassDeclaration') {
          const { superClass, id, body } = node
          const { name: className } = id
          body.body.forEach(d => {
            const { type } = d
            if (type === 'MethodDefinition') {
              const { key, value } = d
              const { name } = key as any
              const { params } = value as any
              GlobalData.componentsMap[className] = { properties: {}, method: {} }
              if (name === 'create' && params.length) {
                GlobalData.customHasRenderComponents.push(className)
                params.forEach(p => {
                  const { properties } = p
                  GlobalData.componentsMap[className] = properties.map(p => {
                    const { key, value } = p
                    return { name: key.name, value: parseValue(value) }
                  })
                })
                // log(GlobalData.defaultPropsMap)
              }
            }
          })
        }
      },
      leave(node: any, parent) {
        if (node.type === 'VariableDeclarator') {
          // console.log(node)
          const { id, init } = node;
          const { name, typeAnnotation, type } = id;
          GlobalData.objectTypeMap[parseValue(id)] = getTypeAnnotation(typeAnnotation);
        }
      },
      fallback: 'iteration'
    });
  }
  // const logOutput = join(genFolder, 'components.global.json');
  // writeFileSync(logOutput, JSON.stringify(GlobalData.componentsMap, null, 2));
}
