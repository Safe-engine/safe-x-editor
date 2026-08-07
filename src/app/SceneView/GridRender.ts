import { ComponentX } from '@safe-engine/sdl'
import { globalCommandBuffer } from '@safe-engine/sdl/lib/render/RenderCommandBuffer'

export class GridRender extends ComponentX {
  static readonly CELL_SIZE = 50
  static readonly MIN_SCREEN_SPACING = 12
  static readonly MAJOR_LINE_INTERVAL = 5

  onRender() {
    const canvas = document.querySelector<HTMLCanvasElement>('#sdl-canvas')
    const width = canvas?.width ?? window.innerWidth
    const height = canvas?.height ?? window.innerHeight
    const scale = Math.abs(this.node.worldScaleX)
    if (!scale) return

    const step = Math.max(1, Math.ceil(GridRender.MIN_SCREEN_SPACING / (GridRender.CELL_SIZE * scale)))
    const drawLines = (origin: number, size: number, isVertical: boolean) => {
      const firstIndex = Math.floor((-origin / scale) / (GridRender.CELL_SIZE * step)) * step
      for (let index = firstIndex; ; index += step) {
        const position = origin + index * GridRender.CELL_SIZE * scale
        if (position > size) return
        const isMajorLine = index % GridRender.MAJOR_LINE_INTERVAL === 0
        const alpha = isMajorLine ? 50 : 28
        if (isVertical) globalCommandBuffer.pushRect(position, 0, 1, height, 102, 102, 102, alpha)
        else globalCommandBuffer.pushRect(0, position, width, 1, 102, 102, 102, alpha)
      }
    }

    drawLines(this.node.worldX, width, true)
    drawLines(this.node.worldY, height, false)
  }
}
