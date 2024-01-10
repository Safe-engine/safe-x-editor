import { parse as ESParser } from '@typescript-eslint/typescript-estree';
import { readFileSync, writeFileSync } from "fs";
import { ensureFileSync } from "fs-extra";
import path from "path";
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
  const name = path.basename(filePath)
  ensureFileSync(`output/${name}.json`)
  writeFileSync(`output/${name}.json`, JSON.stringify(ast, null, 2))
  return ast
}
