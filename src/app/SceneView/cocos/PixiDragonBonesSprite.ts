declare let PIXI: any
declare let dragonBones: any

export const SharedDragonBonesManager = {
  isLoaded: false,
  factory: dragonBones.PixiFactory.factory,
  assets: {},

  loadAssetsOnce: function (key, texJsonUrl, texPngUrl) {
    if (this.assets[key]) {
      return
    }
    return new Promise((resolve) => {
      const loader = new PIXI.Loader()
      loader
        .add(`ske${key}`, key)
        .add(`texJson${key}`, texJsonUrl)
        .add(`texPng${key}`, texPngUrl)
        .load((loader, resources) => {
          const dragonData = this.factory.parseDragonBonesData(resources[`ske${key}`].data, key)
          this.factory.parseTextureAtlasData(resources[`texJson${key}`].data, resources[`texPng${key}`].texture, key)
          this.assets[key] = {
            dragonData,
            texture: resources[`texPng${key}`].texture,
          }
          resolve(this.assets[key])
        })
    })
  },

  buildArmatureDisplay: function (key) {
    // console.log(this.assets[key])
    const { armatureNames } = this.assets[key].dragonData
    const armatureName = armatureNames[0]
    return this.factory.buildArmatureDisplay(armatureName, key)
  },
}

export const PixiDragonBonesSprite: any = cc.Sprite.extend({
  ctor: function (config) {
    this._super()

    this._canvas = document.createElement('canvas')
    this._canvas.width = config.width || 1024
    this._canvas.height = config.height || 1024

    this._pixiApp = new PIXI.Application({
      view: this._canvas,
      width: this._canvas.width,
      height: this._canvas.height,
      backgroundAlpha: 0, // nền trong suốt
      transparent: true, // bắt buộc để alpha hoạt động
      clearBeforeRender: true, // xoá trước khi vẽ frame mới
      preserveDrawingBuffer: true, // giúp lấy ảnh từ canvas
      antialias: true,
    })

    this._texture = new cc.Texture2D()
    this._texture.initWithElement(this._canvas)
    this._texture.handleLoadedTexture()
    this.initWithTexture(this._texture)

    this._config = config
    this._armatureDisplay = null
    this._setupArmature()

    // this.schedule(this.updateTexture, 1 / 30);
  },

  _setupArmature: function () {
    const display = SharedDragonBonesManager.buildArmatureDisplay(this._config.ske)

    if (!display) {
      console.error('Không thể build armature:', this._config.armatureName)
      return
    }

    display.animation.play(this._config.animationName, 0, this._config.playTimes)
    display.x = this._canvas.width / 2
    display.y = this._canvas.height / 2
    display.scale.set(this._config.scale || 1)

    this._pixiApp.stage.addChild(display)
    this._armatureDisplay = display
  },

  updateTexture: function () {
    if (this._armatureDisplay) {
      this._pixiApp.renderer.render(this._pixiApp.stage)
      this._texture.initWithElement(this._canvas)
      this._texture.handleLoadedTexture()
      this.setTexture(this._texture)
    }
  },

  onExit: function () {
    // this.unschedule(this.updateTexture);
    this._pixiApp.destroy(true, { children: true })
    this._canvas.remove()
    this._super()
  },
})
