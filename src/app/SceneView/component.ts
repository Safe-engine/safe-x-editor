import { BoxCollider, CircleCollider, ComponentX, Node, PolygonCollider, SpineBonesControl } from '@safe-engine/sdl'
import { forEach } from 'lodash-es'
import { parseFloatFromValue, parseIntFromValue, parseNumbersArray, parsePoints, parseStringsArray, parseVec2Array } from 'helper/node'

type PreviewWidgetProps = {
  top?: number
  right?: number
  bottom?: number
  left?: number
  designWidth: number
  designHeight: number
}

class PreviewWidget extends ComponentX<PreviewWidgetProps> {
  top: number | null = null
  right: number | null = null
  bottom: number | null = null
  left: number | null = null
  designWidth = 0
  designHeight = 0

  onAwake() {
    this.top = this.props.top ?? null
    this.right = this.props.right ?? null
    this.bottom = this.props.bottom ?? null
    this.left = this.props.left ?? null
    this.designWidth = this.props.designWidth ?? 0
    this.designHeight = this.props.designHeight ?? 0
    this.applyInsets()
  }

  onUpdate() {
    this.applyInsets()
  }

  applyInsets() {
    if (!this.node) return
    const hasTop = this.top !== null
    const hasRight = this.right !== null
    const hasBottom = this.bottom !== null
    const hasLeft = this.left !== null

    if (hasLeft && hasRight) {
      this.node.width = Math.max(0, this.designWidth - this.left! - this.right!)
    }
    if (hasTop && hasBottom) {
      this.node.height = Math.max(0, this.designHeight - this.top! - this.bottom!)
    }

    if (hasLeft) {
      this.node.x = this.left! + this.node.width * this.node.anchorX
    } else if (hasRight) {
      this.node.x = this.designWidth - this.right! - this.node.width * (1 - this.node.anchorX)
    }

    if (hasTop) {
      this.node.y = this.top! + this.node.height * this.node.anchorY
    } else if (hasBottom) {
      this.node.y = this.designHeight - this.bottom! - this.node.height * (1 - this.node.anchorY)
    }
  }
}

export function getComponent(components = [], node: Node, designedResolution: { width: number; height: number }) {
  let component
  forEach(components, ({ tag, props = {} }) => {
    switch (tag) {
      case 'SpineBonesControl': {
        const { bonesName, posList } = props
        component = new SpineBonesControl({
          bonesName: parseStringsArray(bonesName),
          posList: parseVec2Array(posList),
        } as any)
        break
      }
      case 'Widget': {
        const top = parseIntFromValue(props.top)
        const right = parseIntFromValue(props.right)
        const bottom = parseIntFromValue(props.bottom)
        const left = parseIntFromValue(props.left)
        const { width: designWidth, height: designHeight } = designedResolution
        node.addComponent(PreviewWidget, { top, right, bottom, left, designWidth, designHeight })
        break
      }
      case 'PhysicsBoxCollider':
      case 'BoxCollider': {
        const { width, height, offset } = props
        component = new BoxCollider({
          width: parseFloatFromValue(width),
          height: parseFloatFromValue(height),
          offset: parseNumbersArray(offset),
        })
        break
      }
      case 'PhysicsCircleCollider':
      case 'CircleCollider': {
        const { radius, offset } = props
        component = new CircleCollider({
          radius: parseFloatFromValue(radius),
          offset: parseNumbersArray(offset),
        })
        break
      }
      case 'PhysicsPolygonCollider':
      case 'PolygonCollider': {
        const { points, offset } = props
        component = new PolygonCollider({
          points: parsePoints(points),
          offset: parseNumbersArray(offset),
        })
        break
      }
      default:
        break
    }
  })
  return component
}
