import React from 'react';
import {
  beginPropText, bgTypes, borderTypes,
  textAlignsList,
  colorsList, textSizesList
} from './constants';
import { getBorderKey, isNumeric } from './utils';

interface DataType {
  tag?: string;
  name?: string;
  items?: Array<any>;
  title?: string;
}

export const getElementFromData = (
  data: DataType = {},
  root = '',
  props: { className?: string; key?: string } = {}
) => {
  // console.log(data)
  if (Array.isArray(data)) {
    return data.map((child) => getElementFromData(child, root));
  }
  if (typeof data === 'string') {
    return data;
  }
  const { tag, name = '', items } = data;
  if (!tag) {
    return name;
  }
  if (!Object.prototype.hasOwnProperty.call(props, 'className')) {
    props.className = name;
  }
  if (!items) {
    return React.createElement(tag, props);
  }
  return React.createElement(
    tag,
    props,
    ...items.map((child, id) =>
      getElementFromData(child, root, { key: `e_${id}` })
    )
  );
};

export function classNameToObject(name = '') {
  const styles = name.split(/\s+/g);
  const res: any = {};
  styles.forEach((style) => {
    const begin = beginPropText.find(begin => style.startsWith(`${begin}-`));
    if (begin) {
      res[begin] = style;
    } else if (bgTypes.includes(style)) {
      res.gradientType = style;
    } else if (colorsList.some((color) => style.startsWith(`text-${color}`))) {
      res.textColor = style;
    } else if (textSizesList.find((size) => style === `text-${size}`)) {
      res.textSize = style;
    } else if (textAlignsList.find((align) => style === `text-${align}`)) {
      res.textAlign = style;
    } else if (colorsList.some((color) => style.startsWith(`border-${color}`))) {
      res.borderColor = style;
    } else if (borderTypes.includes(style)) {
      res[getBorderKey(style)] = style;
    } else {
      const borderType = borderTypes.find((bt) => style.startsWith(`${bt}-`));
      if (borderType) {
        // console.log(borderType, getBorderKey(borderType),
        //   style.replace(`${borderType}-`, ''),
        //   isNumeric(style.replace(`${borderType}-`, '')));
        if (isNumeric(style.replace(`${borderType}-`, '')))
          res[getBorderKey(borderType)] = style;
        else
          res[`${getBorderKey(borderType)}c`] = style;
      }
    }
  });
  console.log(name, res);
  return res;
}

export function objectToClassName(obj) {
  return Object.values(obj).join(' ');
}
