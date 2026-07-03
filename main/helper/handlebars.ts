import Handlebars from 'handlebars';

const splitRegex = /\r\n|\n|\r/g;


export function filePosition(src = '') {
  const lines = src.split(splitRegex);

  return function getPosition(row = 0, col = 0) {
    let index = 0;
    for (let i = 0; i < lines.length; i++) {
      if (i !== row) {
        index += lines[i].length + 1;
        continue;
      }
      index += col;
      break;
    }
    return index;
  };
}

export function renderTemplate(template: string, data: object) {
  return Handlebars.compile(template, { noEscape: true })(data);
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-zA-Z])(\d)/g, '$1_$2')  // Thêm _ giữa chữ và số (e.g., "file1Name" -> "file1_name")
    .replace(/(\d)([a-zA-Z])/g, '$1_$2')  // Thêm _ giữa số và chữ (e.g., "version2Beta" -> "version2_beta")
    .replace(/([a-z])([A-Z])/g, '$1_$2')  // Thêm _ giữa chữ thường và chữ hoa (camelCase, PascalCase)
    .replace(/\s+/g, '_')                 // Thay khoảng trắng bằng _
    .replace(/-+/g, '_')                  // Thay dấu gạch ngang (-) bằng _
    .toLowerCase();                        // Chuyển về chữ thường
}
