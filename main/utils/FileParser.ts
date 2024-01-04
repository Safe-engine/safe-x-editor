import { parse } from '@typescript-eslint/typescript-estree';
import fs from 'fs';


export const loadSvgFromFile = (file): any => {
  console.log('loadSvgFromFile', file);
  const input = fs.readFileSync(file, { encoding: 'utf8' });
  const parsed = parse(input, { jsx: true, range: true });
  // fs.writeFileSync./gen/('svg.parsed.json', JSON.stringify(parsed));
  return parsed;
};

export const loadScssFromFile = (file) => {
  console.log('loadScssFromFile', file);
};
