import { parse as ESParser } from '@typescript-eslint/typescript-estree';
import { readFileSync } from "fs";
// import { preProcessCppCode } from "../parser/component.js";

export function parse(content) {
  return ESParser(content, {
    comment: false,
    jsx: true,
    loc: false,
    range: true,
  });
}

export function parseFile(filePath: string) {
  const code = readFileSync(filePath, 'utf-8')
  const ast = parse((code));
  // const name = path.basename(filePath)
  // const outputDir = path.resolve(process.cwd(), 'output')
  // ensureDirSync(outputDir)
  // const outputPath = path.join(outputDir, `${name}.json`)
  // ensureFileSync(outputPath)
  // writeFileSync(outputPath, JSON.stringify(ast, null, 2))
  return ast
}
