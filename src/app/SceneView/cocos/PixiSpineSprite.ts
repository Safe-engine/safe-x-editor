import { Spine } from "@esotericsoftware/spine-pixi-v8"
import { Application } from "pixi.js"

export class PixiSpineSprite extends cc.Sprite {
  _canvas: any
  _pixiApp: Application
  _texture: cc.Texture2D
  _config
  _armatureDisplay: Spine
  constructor(config) {
    super()
    super.ctor() // always call this for compatibility with cocos2dx JS Javascript class system
    this.scheduleUpdate()
    this._canvas = document.createElement('canvas')
    this._canvas.width = config.width || 1024
    this._canvas.height = config.height || 1024

    this._pixiApp = new Application()
    this._pixiApp.init({
      view: this._canvas,
      width: this._canvas.width,
      height: this._canvas.height,
      backgroundAlpha: 0, // nền trong suốt
      // transparent: true, // bắt buộc để alpha hoạt động
      clearBeforeRender: true, // xoá trước khi vẽ frame mới
      preserveDrawingBuffer: true, // giúp lấy ảnh từ canvas
      antialias: true,
    })

    this._texture = new cc.Texture2D()
    this._texture.initWithElement(this._canvas as any)
    this._texture.handleLoadedTexture()
    this.initWithTexture(this._texture)

    this._config = config
    this._armatureDisplay = null
    this._setupArmature()

    // this.schedule(this.updateTexture, 1 / 30);
  }

  _setupArmature() {
    const { key, skeleton, atlas, texture, loop, skin, timeScale, animationName } = this._config
    const display = Spine.from({ skeleton: `ske${key}`, atlas: `texJson${key}` })
    if (!display) {
      console.error('Cannot build armature:', key)
      return
    }
    if (skin) {
      display.skeleton.setSkin(skin)
    }
    display.state.setAnimation(0, animationName, loop)
    display.x = this._canvas.width / 2
    display.y = this._canvas.height
    display.state.timeScale = timeScale

    this._pixiApp.stage.addChild(display)
    this._armatureDisplay = display
  }

  updateTexture() {
    if (this._armatureDisplay) {
      this._pixiApp.renderer.render(this._pixiApp.stage)
      this._texture.initWithElement(this._canvas)
      this._texture.handleLoadedTexture()
      this.setTexture(this._texture)
    }
  }

  onExit() {
    // this.unschedule(this.updateTexture);
    this._pixiApp.destroy(true, { children: true })
    this._canvas.remove()
    super.onExit()
  }
}
