export function parseEval(evalInit: string) {
  return (v: string) => eval(evalInit + v)
}

export function parseVec2(position = 'Vec2(0,0)', evalInit) {
  const [x = 0, y = 0] = position.replace('Vec2(', '').replace(')', '').split(',').map(parseEval(evalInit));
  return { x, y };
}

export function Vec2({ x = 0, y = 0 }) {
  return `Vec2(${Math.round(x)},${Math.round(y)})`;
}

export function getNodePosition(node, evalInit = '') {
  if (!node) return { x: 0, y: 0 };
  const { position, xy } = node;
  if (position) {
    const { x, y } = parseVec2(position, evalInit);
    return { x, y };
  } else if (xy) {
    // console.log('getNodePosition', xy, evalInit)
    const [x, y] = xy.map(parseEval(evalInit));
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