export function spliceString(str, index, count, add) {
  // We cannot pass negative indexes directly to the 2nd slicing operation.
  let checkIndex = index;
  if (index < 0) {
    checkIndex = str.length + index;
    if (index < 0) {
      checkIndex = 0;
    }
  }

  return str.slice(0, checkIndex) + (add || '') + str.slice(checkIndex + count);
}

export const stringStyleToObject = (styleString = '') => {
  const styles = {};
  styleString.split(';').forEach(att => {
    const [key, value] = att.split(':');
    styles[key] = value;
  });
  return styles;
};
