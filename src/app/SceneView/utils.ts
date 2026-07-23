import { Node } from '@safe-engine/sdl'
import { GlobalState } from 'data/GloablState'
import { first, set } from 'lodash-es'

export function getCurrentNode(node: Node, childrenIndex: number[]) {
  let currentNode = node
  childrenIndex.forEach((index) => {
    if (currentNode?.children?.[index]) {
      currentNode = currentNode.children[index]
    }
  })
  return currentNode
}

export function addQuotesToTernary(expression: string) {
  return expression.replace(/:\s*([^?:"'\s][^?:]*)/g, (_match, value) => {
    const trimmed = value.trim()
    if (/^[\d.[{]/.test(trimmed) || ['true', 'false', 'undefined', 'null'].includes(trimmed)) return `: ${trimmed}`
    return `: '${trimmed}'`
  })
}

export const KEY = {
  shift: 'ShiftLeft',
  shiftR: 'ShiftRight',
  dash: 'Minus',
  equal: 'Equal',
  x: 'KeyX',
  y: 'KeyY',
  h: 'KeyH',
  c: 'KeyC',
  s: 'KeyS',
  r: 'KeyR',
  a: 'KeyA',
  z: 'KeyZ',
  backspace: 'Backspace',
  delete: 'Delete',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
}

export function createNode(name: string) {
  return new Node(name)
}

export function getComponentChildrenNum(tag: string) {
  const component = GlobalState.data.componentsCache[tag]
  return Array.isArray(component) ? component.length : (component?.children?.length ?? 0)
}

export function getEditingRoot(editingComponent: any, indexes: number[]) {
  if (!Array.isArray(editingComponent) || !editingComponent.length) return undefined
  const isSceneNode = first<any>(editingComponent)?.tag === 'SceneComponent'
  if (isSceneNode) {
    indexes.shift()
    return first(editingComponent)
  }
  return editingComponent[indexes.shift() ?? 0] ?? first(editingComponent)
}

export function setNodePositionProps(props: { node?: Record<string, unknown> }, x: number, y: number) {
  const node = props?.node
  if (node?.position !== undefined) {
    set(props, 'node.position', `Vec2(${x},${y})`)
    delete props.node.x
    delete props.node.y
    delete props.node.xy
    return
  }
  if (node?.x !== undefined || node?.y !== undefined) {
    set(props, 'node.x', x)
    set(props, 'node.y', y)
    delete props.node.position
    delete props.node.xy
    return
  }
  set(props, 'node.xy', [x, y])
  delete props.node.position
  delete props.node.x
  delete props.node.y
}
