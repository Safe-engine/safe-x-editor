export function parseEval(evalInit: string) {
  return (v: string) => eval(evalInit + v)
}

export function parseVec2(position = 'Vec2(0,0)', evalInit) {
  const [x = 0, y = 0] = position.replace('Vec2(', '').replace(')', '').split(',').map(parseEval(evalInit));
  return { x, y };
}

export function Vec2({ x = 0, y = 0 }) {
  return `Vec2(${x},${y})`;
}

export function getNodePosition(node, evalInit = '') {
  if (!node) return { x: 0, y: 0 };
  const { position, xy, x: nodeX, y: nodeY } = node;
  if (position) {
    const { x, y } = parseVec2(position, evalInit);
    return { x, y };
  } else if (xy) {
    // console.log('getNodePosition', xy, evalInit)
    const [x, y] = xy.map(parseEval(evalInit));
    return { x, y };
  } else if (nodeX !== undefined || nodeY !== undefined) {
    return {
      x: nodeX !== undefined ? parseEval(evalInit)(nodeX) : 0,
      y: nodeY !== undefined ? parseEval(evalInit)(nodeY) : 0,
    };
  }
  return { x: 0, y: 0 };
}

export function parseIntFromValue(value) {
  return parseInt(parseStringFromValue(value))
}

export function parseFloatFromValue(value) {
  return parseFloat(parseStringFromValue(value))
}

export function parseBoolFromValue(value) {
  if (typeof value === 'boolean') return value
  if (value === undefined || value === null) return undefined
  return parseStringFromValue(value) === 'true'
}

export function parseStringFromValue(value) {
  if (value === undefined || value === null) return value
  return String(value).replace('{', '').replace('}', '')
}

function splitValues(value) {
  if (Array.isArray(value)) return value
  return parseStringFromValue(value).split(',').map((item) => item.trim()).filter(Boolean)
}

export function parseNumbersArray(value) {
  return splitValues(value).map(Number)
}

export function parseStringsArray(value) {
  return splitValues(value).map(String)
}

export function parseVec2Array(value) {
  if (Array.isArray(value)) return value
  return parseStringFromValue(value)
    .split(';')
    .map((item) => parseVec2(item.trim(), ''))
}

export function parsePoints(value) {
  return parseVec2Array(value)
}

export function parseSize(value, evalInit = '') {
  if (!value) return { width: 0, height: 0 }
  if (typeof value === 'object') {
    return {
      width: value.width ?? value.x ?? 0,
      height: value.height ?? value.y ?? 0,
    }
  }
  const parsed = parseStringFromValue(value)
  if (parsed.startsWith('Size(')) {
    const [width = 0, height = 0] = parsed.replace('Size(', '').replace(')', '').split(',').map(parseEval(evalInit))
    return { width, height }
  }
  const [width = 0, height = 0] = parsed.split(',').map(parseEval(evalInit))
  return { width, height }
}

export function parseDirection(value) {
  if (value === undefined || value === null) return 0
  return parseIntFromValue(value)
}

export function parseOutline(value) {
  const [color = '', width = 0] = splitValues(value)
  return [color, Number(width)]
}

export function normalizeNodeProps(props) {
  const node = props?.node
  if (!node) return props
  if (node.position && !node.xy) {
    const { x, y } = parseVec2(node.position, '')
    node.xy = [x, y]
  }
  return props
}
