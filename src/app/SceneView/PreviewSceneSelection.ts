import { MeshAttachment, RegionAttachment } from '@esotericsoftware/spine-core'
import { Node, Scene, SpineSkeleton } from '@safe-engine/sdl'
import { first } from 'lodash-es'
import { getCurrentNode } from './utils'

export abstract class PreviewSceneSelection extends Scene {
  static readonly ARROW_HIT_RADIUS = 32
  static readonly RESIZE_EDGE_HIT_SIZE = 8
  static readonly ROTATION_HANDLE_OFFSET = 30

  declare arrowContainerNode: Node
  declare arrowSpriteHorizonNode: Node
  declare arrowSpriteVerticalNode: Node
  declare selectionBorderNode: Node
  declare selectionAnchorNode: Node
  declare selectionCornerNodes: Node[]
  declare rotationHandleNode: Node
  declare drawNode: Node
  declare editingPaths: string[]
  declare editingComponent: any[]
  declare marqueeSelection?: MarqueeSelection

  abstract getChildrenIndex(editingPath?: string): number[]

  getCombinedBoundsFromPaths(paths: string[]) {
    let combinedBounds: SelectionBounds | undefined
    paths.forEach((path) => {
      const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(path))
      const nodeBounds = this.getNodeBounds(currentNode)
      if (!nodeBounds) return
      if (!combinedBounds) {
        combinedBounds = { ...nodeBounds }
        return
      }
      combinedBounds.left = Math.min(combinedBounds.left, nodeBounds.left)
      combinedBounds.top = Math.min(combinedBounds.top, nodeBounds.top)
      combinedBounds.right = Math.max(combinedBounds.right, nodeBounds.right)
      combinedBounds.bottom = Math.max(combinedBounds.bottom, nodeBounds.bottom)
    })
    return combinedBounds
  }

  updateArrowPosition() {
    if (this.marqueeSelection?.active || !this.editingPaths[0]) {
      this.arrowContainerNode.active = false
      return
    }
    if (this.editingPaths.length > 1) {
      this.selectionCornerNodes.forEach((corner) => (corner.active = false))
      this.rotationHandleNode.active = false
      const combinedBounds = this.getCombinedBoundsFromPaths(this.editingPaths)
      if (!combinedBounds) {
        this.arrowContainerNode.active = false
        return
      }
      this.arrowContainerNode.active = true
      this.arrowContainerNode.x = (combinedBounds.left + combinedBounds.right) / 2
      this.arrowContainerNode.y = (combinedBounds.top + combinedBounds.bottom) / 2
      this.selectionBorderNode.width = combinedBounds.right - combinedBounds.left
      this.selectionBorderNode.height = combinedBounds.bottom - combinedBounds.top
      this.selectionBorderNode.anchorX = 0.5
      this.selectionBorderNode.anchorY = 0.5
      this.selectionBorderNode.scaleX = 1
      this.selectionBorderNode.scaleY = 1
      return
    }
    const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(this.editingPaths[0]))
    this.arrowContainerNode.active = true
    this.arrowContainerNode.x = currentNode.worldX
    this.arrowContainerNode.y = currentNode.worldY
    this.selectionBorderNode.width = currentNode.width
    this.selectionBorderNode.height = currentNode.height
    this.selectionBorderNode.anchorX = currentNode.anchorX
    this.selectionBorderNode.anchorY = currentNode.anchorY
    this.selectionBorderNode.scaleX = currentNode.worldScaleX ?? 1
    this.selectionBorderNode.scaleY = currentNode.worldScaleY ?? 1
    const bounds = this.getNodeBounds(currentNode)
    if (!bounds) return
    this.rotationHandleNode.active = true
    this.rotationHandleNode.x = (bounds.left + bounds.right) / 2 - this.arrowContainerNode.x
    this.rotationHandleNode.y = bounds.top - this.arrowContainerNode.y - PreviewSceneSelection.ROTATION_HANDLE_OFFSET
    const cornerPositions = [
      [bounds.left, bounds.top],
      [bounds.right, bounds.top],
      [bounds.left, bounds.bottom],
      [bounds.right, bounds.bottom],
    ]
    this.selectionCornerNodes.forEach((corner, index) => {
      corner.active = true
      corner.x = cornerPositions[index][0] - this.arrowContainerNode.x
      corner.y = cornerPositions[index][1] - this.arrowContainerNode.y
    })
  }

  getSelectionBounds(x1: number, y1: number, x2: number, y2: number): SelectionBounds {
    return { left: Math.min(x1, x2), top: Math.min(y1, y2), right: Math.max(x1, x2), bottom: Math.max(y1, y2) }
  }

  getNodeBounds(node: Node): SelectionBounds | undefined {
    if (!node.active) return undefined
    if (node.width && node.height) {
      const scaleX = node.worldScaleX ?? 1
      const scaleY = node.worldScaleY ?? 1
      const radians = (node.worldRotation * Math.PI) / 180
      const cosine = Math.cos(radians)
      const sine = Math.sin(radians)
      const left = -node.anchorX * node.width
      const top = -node.anchorY * node.height
      const corners = [[left, top], [left + node.width, top], [left, top + node.height], [left + node.width, top + node.height]].map(([x, y]) => ({
        x: node.worldX + x * scaleX * cosine - y * scaleY * sine,
        y: node.worldY + x * scaleX * sine + y * scaleY * cosine,
      }))
      return this.getSelectionBounds(Math.min(...corners.map((corner) => corner.x)), Math.min(...corners.map((corner) => corner.y)), Math.max(...corners.map((corner) => corner.x)), Math.max(...corners.map((corner) => corner.y)))
    }
    return this.getSpineSkeletonBounds(node)
  }

  getSpineSkeletonBounds(node: Node): SelectionBounds | undefined {
    const skeleton = node.getComponent(SpineSkeleton)?.skeleton
    if (!skeleton) return undefined
    const radians = (node.worldRotation * Math.PI) / 180
    const cosine = Math.cos(radians)
    const sine = Math.sin(radians)
    const scaleX = node.worldScaleX ?? 1
    const scaleY = node.worldScaleY ?? 1
    let result: SelectionBounds | undefined
    const includeVertices = (vertices: Float32Array) => {
      for (let index = 0; index < vertices.length; index += 2) {
        const scaledX = vertices[index] * scaleX
        const scaledY = vertices[index + 1] * scaleY
        const x = node.worldX + scaledX * cosine - scaledY * sine
        const y = node.worldY + scaledX * sine + scaledY * cosine
        if (!result) result = { left: x, top: y, right: x, bottom: y }
        else { result.left = Math.min(result.left, x); result.top = Math.min(result.top, y); result.right = Math.max(result.right, x); result.bottom = Math.max(result.bottom, y) }
      }
    }
    skeleton.drawOrder.forEach((slot) => {
      const attachment = slot.getAttachment()
      if (!slot.bone.active || !attachment) return
      if (attachment instanceof RegionAttachment) {
        const vertices = new Float32Array(8)
        attachment.computeWorldVertices(slot, vertices, 0, 2)
        includeVertices(vertices)
      } else if (attachment instanceof MeshAttachment) {
        const vertices = new Float32Array(attachment.worldVerticesLength)
        attachment.computeWorldVertices(slot, 0, attachment.worldVerticesLength, vertices, 0, 2)
        includeVertices(vertices)
      }
    })
    return result
  }

  isNodeInsideSelectionBounds(node: Node, bounds: SelectionBounds) {
    const nodeBounds = this.getNodeBounds(node)
    return Boolean(nodeBounds && nodeBounds.left >= bounds.left && nodeBounds.right <= bounds.right && nodeBounds.top >= bounds.top && nodeBounds.bottom <= bounds.bottom)
  }

  isPointInsideNode(node: Node, x: number, y: number) {
    if (node.width && node.height && node.worldScaleX && node.worldScaleY) {
      const radians = (-node.worldRotation * Math.PI) / 180
      const cosine = Math.cos(radians)
      const sine = Math.sin(radians)
      const dx = x - node.worldX
      const dy = y - node.worldY
      const localX = (dx * cosine - dy * sine) / node.worldScaleX
      const localY = (dx * sine + dy * cosine) / node.worldScaleY
      const left = -node.anchorX * node.width
      const top = -node.anchorY * node.height
      return localX >= left && localX <= left + node.width && localY >= top && localY <= top + node.height
    }
    const bounds = this.getNodeBounds(node)
    return Boolean(bounds && x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom)
  }

  findSelectionPathInNode(node: Node, path: string[], x: number, y: number): string | undefined {
    if (!node.active) return undefined
    for (let index = node.children.length - 1; index >= 0; index--) {
      const childPath = this.findSelectionPathInNode(node.children[index], [...path, `${index}`], x, y)
      if (childPath) return childPath
    }
    return this.isPointInsideNode(node, x, y) ? path.join('-') : undefined
  }

  findSelectionPath(x: number, y: number) {
    const pathPrefix = first<any>(this.editingComponent)?.tag === 'SceneComponent' ? ['0'] : []
    for (let index = this.drawNode.children.length - 1; index >= 0; index--) {
      const childPath = this.findSelectionPathInNode(this.drawNode.children[index], [...pathPrefix, `${index}`], x, y)
      if (childPath) return childPath
    }
  }

  collectSelectionPathsInNode(node: Node, path: string[], bounds: SelectionBounds, selectedPaths: string[]) {
    if (!node.active) return
    let hasSelectedChild = false
    node.children.forEach((child, index) => {
      const previousCount = selectedPaths.length
      this.collectSelectionPathsInNode(child, [...path, `${index}`], bounds, selectedPaths)
      hasSelectedChild ||= selectedPaths.length > previousCount
    })
    if (!hasSelectedChild && this.isNodeInsideSelectionBounds(node, bounds)) selectedPaths.push(path.join('-'))
  }

  findSelectionPathsInBounds(bounds: SelectionBounds) {
    const pathPrefix = first<any>(this.editingComponent)?.tag === 'SceneComponent' ? ['0'] : []
    const selectedPaths: string[] = []
    this.drawNode.children.forEach((child, index) => this.collectSelectionPathsInNode(child, [...pathPrefix, `${index}`], bounds, selectedPaths))
    return selectedPaths
  }

  getActiveArrowAxis(x: number, y: number) {
    const anchorX = this.arrowContainerNode.x + this.selectionAnchorNode.x
    const anchorY = this.arrowContainerNode.y + this.selectionAnchorNode.y
    if (Math.abs(x - anchorX) <= this.selectionAnchorNode.width / 2 && Math.abs(y - anchorY) <= this.selectionAnchorNode.height / 2) return 'anchor' as const
    const radius = PreviewSceneSelection.ARROW_HIT_RADIUS
    if (Math.abs(x - (this.arrowContainerNode.x + this.arrowSpriteHorizonNode.x)) <= radius && Math.abs(y - (this.arrowContainerNode.y + this.arrowSpriteHorizonNode.y)) <= radius) return 'x' as const
    if (Math.abs(x - (this.arrowContainerNode.x + this.arrowSpriteVerticalNode.x)) <= radius && Math.abs(y - (this.arrowContainerNode.y + this.arrowSpriteVerticalNode.y)) <= radius) return 'y' as const
  }

  getActiveResizeEdge(x: number, y: number) {
    if (this.editingPaths.length !== 1) return undefined
    const bounds = this.getNodeBounds(getCurrentNode(this.drawNode, this.getChildrenIndex(this.editingPaths[0])))
    if (!bounds) return undefined
    const hitSize = PreviewSceneSelection.RESIZE_EDGE_HIT_SIZE
    if (Math.abs(x - bounds.left) <= hitSize && Math.abs(y - bounds.top) <= hitSize) return 'top-left' as const
    if (Math.abs(x - bounds.right) <= hitSize && Math.abs(y - bounds.top) <= hitSize) return 'top-right' as const
    if (Math.abs(x - bounds.left) <= hitSize && Math.abs(y - bounds.bottom) <= hitSize) return 'bottom-left' as const
    if (Math.abs(x - bounds.right) <= hitSize && Math.abs(y - bounds.bottom) <= hitSize) return 'bottom-right' as const
    if (y >= bounds.top - hitSize && y <= bounds.bottom + hitSize) {
      if (Math.abs(x - bounds.left) <= hitSize) return 'left' as const
      if (Math.abs(x - bounds.right) <= hitSize) return 'right' as const
    }
    if (x >= bounds.left - hitSize && x <= bounds.right + hitSize) {
      if (Math.abs(y - bounds.top) <= hitSize) return 'top' as const
      if (Math.abs(y - bounds.bottom) <= hitSize) return 'bottom' as const
    }
  }

  getActiveRotationHandle(x: number, y: number) {
    return this.editingPaths.length === 1 && this.rotationHandleNode.active && Math.hypot(x - this.rotationHandleNode.worldX, y - this.rotationHandleNode.worldY) <= this.rotationHandleNode.width / 2 + 4
  }
}
