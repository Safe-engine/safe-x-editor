import { BoxCollider, CircleCollider, ComponentX, Node, PolygonCollider, SpineBonesControl } from '@safe-engine/sdl'
import { parseBoolFromValue, parseFloatFromValue, parseIntFromValue, parseNumbersArray, parsePoints, parseStringsArray } from 'helper/node'
import { forEach } from 'lodash-es'

type PreviewWidgetProps = {
  top?: number
  right?: number
  bottom?: number
  left?: number
  centerVertical?: boolean
  centerHorizon?: boolean
  designWidth: number
  designHeight: number
}

function normalizeInset(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

class PreviewWidget extends ComponentX<PreviewWidgetProps> {
  top: number | null = null
  right: number | null = null
  bottom: number | null = null
  left: number | null = null
  centerVertical = false
  centerHorizon = false
  designWidth = 0
  designHeight = 0

  onAwake() {
    this.setInsets(this.props)
    this.designWidth = this.props.designWidth ?? 0
    this.designHeight = this.props.designHeight ?? 0
    this.applyInsets()
  }

  setInsets(props: Pick<PreviewWidgetProps, 'top' | 'right' | 'bottom' | 'left' | 'centerVertical' | 'centerHorizon'>) {
    this.top = normalizeInset(props.top)
    this.right = normalizeInset(props.right)
    this.bottom = normalizeInset(props.bottom)
    this.left = normalizeInset(props.left)
    this.centerVertical = props.centerVertical === true
    this.centerHorizon = props.centerHorizon === true
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

    if (this.centerHorizon) {
      this.node.x = this.designWidth * 0.5 + this.node.width * (this.node.anchorX - 0.5)
    } else if (hasLeft) {
      this.node.x = this.left! + this.node.width * this.node.anchorX
    } else if (hasRight) {
      this.node.x = this.designWidth - this.right! - this.node.width * (1 - this.node.anchorX)
    }

    if (this.centerVertical) {
      this.node.y = this.designHeight * 0.5 + this.node.height * (this.node.anchorY - 0.5)
    } else if (hasTop) {
      this.node.y = this.top! + this.node.height * this.node.anchorY
    } else if (hasBottom) {
      this.node.y = this.designHeight - this.bottom! - this.node.height * (1 - this.node.anchorY)
    }
  }
}

export function refreshWidget(node: Node) {
  node.getComponent(PreviewWidget)?.applyInsets()
}

export function updatePreviewWidgetInsets(node: Node, props: Record<string, unknown>) {
  const widget = node.getComponent(PreviewWidget)
  if (!widget) return
  widget.setInsets({
    top: parseIntFromValue(props.top),
    right: parseIntFromValue(props.right),
    bottom: parseIntFromValue(props.bottom),
    left: parseIntFromValue(props.left),
    centerVertical: parseBoolFromValue(props.centerVertical),
    centerHorizon: parseBoolFromValue(props.centerHorizon),
  })
  widget.applyInsets()
}

export function getComponent(components = [], node: Node, designedResolution: { width: number; height: number }) {
  let component
  forEach(components, ({ tag, props = {} }) => {
    switch (tag) {
      case 'SpineBonesControl': {
        const { bonesName, posList } = props
        component = new SpineBonesControl({
          bonesName: parseStringsArray(bonesName),
          posList: parseNumbersArray(posList),
        } as any)
        break
      }
      case 'Widget': {
        const top = parseIntFromValue(props.top)
        const right = parseIntFromValue(props.right)
        const bottom = parseIntFromValue(props.bottom)
        const left = parseIntFromValue(props.left)
        const centerVertical = parseBoolFromValue(props.centerVertical)
        const centerHorizon = parseBoolFromValue(props.centerHorizon)
        const { width: designWidth, height: designHeight } = designedResolution
        node.addComponent(PreviewWidget, { top, right, bottom, left, centerVertical, centerHorizon, designWidth, designHeight })
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
