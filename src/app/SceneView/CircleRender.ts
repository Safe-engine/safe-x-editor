import { ComponentX } from "@safe-engine/sdl"
import { globalCommandBuffer } from '@safe-engine/sdl/lib/render/RenderCommandBuffer'

export class CircleRender extends ComponentX {
  onRender() {
    const radius = this.node.width * this.node.worldScaleX / 2
    globalCommandBuffer.pushCircle(this.node.worldX, this.node.worldY, radius, 34, 197, 94, 255, true)
    globalCommandBuffer.pushCircle(this.node.worldX, this.node.worldY, Math.max(0, radius - 2), 255, 255, 255, 255, true)
  }
}
