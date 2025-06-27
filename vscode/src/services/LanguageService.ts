import fs from 'fs';
import { spliceString } from '../utils/StringHelper';

function writeToLastObjectString(file, value) {
  const content = fs.readFileSync(file, { encoding: 'utf8' });
  const lastIndex = content.lastIndexOf('}');
  const newContent = spliceString(content, lastIndex - 1, 0, value);
  fs.writeFileSync(file, newContent);
}

export async function createI18n(data) {
  const {
    i18nLine,
    engFile,
    viFile,
  } = data;
  writeToLastObjectString(engFile, i18nLine);
  writeToLastObjectString(viFile, i18nLine);
  return true;
}
