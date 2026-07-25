import { ComponentX } from '@safe-engine/sdl';
import { globalCommandBuffer } from '@safe-engine/sdl/lib/render/RenderCommandBuffer';

export type SpineBoneControlPoint = { x: number; y: number }

export class SpineBonesControlRender extends ComponentX<{ getPoints: () => SpineBoneControlPoint[] }> {
  onRender() {
    this.props.getPoints().forEach((point) => {
      globalCommandBuffer.pushCircle(point.x, point.y, 7, 239, 68, 68, 255, true)
      globalCommandBuffer.pushCircle(point.x, point.y, 5, 255, 255, 255, 255, true)
    })
  }
}
