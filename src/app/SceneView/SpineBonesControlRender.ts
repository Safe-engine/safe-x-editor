import { ComponentX } from '@safe-engine/sdl'
import { drawCircle } from 'sdl3'

export type SpineBoneControlPoint = { x: number; y: number }

export class SpineBonesControlRender extends ComponentX<{ getPoints: () => SpineBoneControlPoint[] }> {
  onRender() {
    this.props.getPoints().forEach((point) => {
      drawCircle(point.x, point.y, 7, 34, 197, 94, 255, true)
      drawCircle(point.x, point.y, 5, 255, 255, 255, 255, true)
    })
  }
}
