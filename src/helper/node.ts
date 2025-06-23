import { parseInt } from "lodash";

export function parseVec2(position = 'Vec2(0,0)') {
  const [x = 0, y = 0] = position.replace('Vec2(', '').replace(')', '').split(',').map(parseInt);
  return { x, y };
}

export function Vec2({x = 0, y = 0}) {
  return `Vec2(${x},${y})`;
}
