import { Node } from '@safe-engine/sdl'

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
