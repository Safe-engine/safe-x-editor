import ESTraverse from "estraverse";
import { globSync } from "glob";
import { join } from "path";
import { parseFile } from "../transform/index";
import { GlobalData } from "./global";
import { getTypeAnnotation } from "./helper";

function parseValue(className) {
  console.log('parseValue className', className);
  return className.name
}

export async function getClassesMetaData(srcDir: string, idDebug = false) {
  const allComps = globSync(`**/*.tsx`, { cwd: srcDir })
  for (let index = 0; index < allComps.length; index++) {
    const file = allComps[index];
    if (idDebug) {
      console.log('getClassesMetaData', file)
    }
    const filePath = join(srcDir, file)
    const parsed: any = parseFile(filePath)
    ESTraverse.traverse(parsed, {
      enter: function (node, parent) {
        if (node.type === 'ClassDeclaration') {
          const { superClass, id, body } = node
          const { name: className } = id
          if (parseValue(superClass) === 'NoRenderComponentX') {
            GlobalData.customNoRenderComponents.push(className)
          }
          body.body.forEach(d => {
            const { type } = d
            if (type === 'MethodDefinition') {
              const { key, value } = d
              const { name } = key as any
              const { params } = value as any
              if (name === 'create' && params.length) {
                params.forEach(p => {
                  const { properties } = p
                  GlobalData.defaultPropsMap[className] = {}
                  GlobalData.templatesMap[className] = properties.map(p => {
                    const { key, value } = p
                    if (value.name !== key.name) {
                      GlobalData.defaultPropsMap[className][key.name] = parseValue(value)
                    }
                    return `{{${key.name}}}`
                  }).join(', ')
                })
                // log(GlobalData.defaultPropsMap)
              } else if ('start' === name) {
                GlobalData.hasStartMap[className] = true
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
}
