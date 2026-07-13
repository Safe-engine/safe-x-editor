import { ComponentX } from "@safe-engine/sdl"
import { drawCircle } from "sdl3"

export class CircleRender extends ComponentX {
  onRender() {
    const radius = this.node.width * this.node.worldScaleX / 2
    drawCircle(this.node.worldX, this.node.worldY, radius, 34, 197, 94, 255, true)
    drawCircle(this.node.worldX, this.node.worldY, Math.max(0, radius - 2), 255, 255, 255, 255, true)
  }
}