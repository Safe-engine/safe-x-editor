import { BoxCollider, CircleCollider, GridLayoutComp, instantiate, NodeComp, PolygonCollider } from '@safe-engine/webgl';
import { SpineBonesControl } from '@safe-engine/webgl/dist/spine';
import { forEach } from 'lodash-es';
import { parseFloatFromValue, parseIntFromValue, parseNumbersArray, parsePoints, parseStringsArray, parseVec2Array } from '../../helper/node';

export function getComponent(components = [], nodeComp: NodeComp, designedResolution: { width: number; height: number }) {
  let colliderComp
  forEach(components, ({ tag, props }) => {
    switch (tag) {
      case 'SpineBonesControl': {
        const { bonesName, posList } = props
        // console.log('SpineBonesControl props:', bonesName, parseStringsArray(bonesName), posList, parseVec2Array(posList))
        colliderComp = instantiate(SpineBonesControl, {
          bonesName: parseStringsArray(bonesName),
          posList: parseVec2Array(posList),
        })
        break
      }
      case 'GridLayoutComp': {
        const { columns, spaceX, spaceY, left, top } = props
        colliderComp = instantiate(GridLayoutComp, {
          columns: parseIntFromValue(columns),
          spaceX: parseFloatFromValue(spaceX),
          spaceY: parseFloatFromValue(spaceY),
          left: parseFloatFromValue(left),
          top: parseFloatFromValue(top),
        })
        break
      }
      case 'WidgetComp': {
        const top = parseIntFromValue(props.top)
        const right = parseIntFromValue(props.right)
        const bottom = parseIntFromValue(props.bottom)
        const left = parseIntFromValue(props.left)
        const { width: designWidth, height: designHeight } = designedResolution
        if (top !== undefined) {
          nodeComp.instance.y = designHeight - top - nodeComp.instance.height * (1 - nodeComp.instance.anchorY)
        }
        if (right !== undefined) {
          nodeComp.instance.x = designWidth - right - nodeComp.instance.width * (1 - nodeComp.instance.anchorX)
        }
        if (bottom !== undefined) {
          nodeComp.instance.y = bottom + nodeComp.instance.height * nodeComp.instance.anchorY
        }
        if (left !== undefined) {
          nodeComp.instance.x = left + nodeComp.instance.width * nodeComp.instance.anchorX
        }
        break
      }
      case 'PhysicsBoxCollider':
      case 'BoxCollider': {
        const { width, height, offset } = props
        colliderComp = instantiate(BoxCollider, {
          width: parseFloatFromValue(width),
          height: parseFloatFromValue(height),
          offset: parseNumbersArray(offset),
        })
        break
      }
      case 'PhysicsCircleCollider':
      case 'CircleCollider': {
        const { radius, offset } = props
        colliderComp = instantiate(CircleCollider, {
          radius: parseFloatFromValue(radius),
          offset: parseNumbersArray(offset),
        })
        break
      }
      case 'PhysicsPolygonCollider':
      case 'PolygonCollider': {
        const { points, offset } = props
        colliderComp = instantiate(PolygonCollider, {
          points: parsePoints(points),
          offset: parseNumbersArray(offset),
        })
        break
      }
      default:
        break
    }
  })
  return colliderComp
}
