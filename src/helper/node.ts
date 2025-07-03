import { parseInt } from "lodash";

export function parseVec2(position = 'Vec2(0,0)') {
  const [x = 0, y = 0] = position.replace('Vec2(', '').replace(')', '').split(',').map(parseInt);
  return { x, y };
}

export function Vec2({ x = 0, y = 0 }) {
  return `Vec2(${x},${y})`;
}

export function getNodePosition(node) {
  if (!node) return { x: 0, y: 0 };
  const { position, xy } = node;
  if (position) {
    const { x, y } = parseVec2(position);
    return { x, y };
  } else if (xy) {
    const [x, y] = xy.map(parseInt);
    return { x, y };
  }
  return { x: 0, y: 0 };
}

export function parseIntFromValue(value) {
  return parseInt(parseStringFromValue(value))
}

export function parseStringFromValue(value) {
  return value.replace('{', '').replace('}', '')
}