import { camelCase, capitalize, snakeCase } from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';

export function constantCase(str) {
  return snakeCase(str).toUpperCase()
}
const mustacheDir = path.resolve('./src/hbs');

Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

Handlebars.registerHelper('capitalize', function (str) {
  return capitalize(str);
});

Handlebars.registerHelper('camelCase', function (str) {
  return camelCase(str);
});

Handlebars.registerHelper('constantCase', function (str) {
  return constantCase(str);
});

export function readTemplateFile(subPath: string) {
  const filename = path.resolve(mustacheDir, subPath);
  return fs.readFileSync(filename, 'utf8');
}

export function renderMustacheFile(template: string, data: object) {
  // const template = readTemplateFile(`cpp/${name}.hbs`);
  return Handlebars.compile(template, { noEscape: true })(data);
}
