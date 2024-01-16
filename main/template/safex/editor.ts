import { CollideSystem, GameWorld, initWorld } from '../src/lib/safex'
import { settings } from '../src/settings'
import { EditingScene } from './EditingScene'

if (module.hot) {
  module.hot.accept()
}

class EditorScene extends cc.Scene {
  constructor() {
    // 1. super init first
    super()
    super.ctor() // always call this for compatibility with cocos2dx JS Javascript class system
  }
  onEnter() {
    super.onEnter()
    const collideSystem = GameWorld.Instance.systems.get(CollideSystem)
    collideSystem.toggleDebugDraw(true)
    EditingScene.create()
  }
}

window.onload = function () {
  cc._isContextMenuEnable = true
  cc.game.onStart = function onStart() {
    const { designedResolution } = settings
    const { width, height } = designedResolution
    // if (!cc.sys.isNative && document.getElementById('cocosLoading')) {
    //   // If referenced loading.js, please remove it
    //   const loadingNode: any = document.getElementById('cocosLoading');
    //   document.body.removeChild(loadingNode);
    // }

    // Pass true to enable retina display, disabled by default to improve performance
    cc.view.enableRetina(cc.sys.os === cc.sys.OS_IOS)
    // Adjust viewport meta
    cc.view.adjustViewPort(true)
    // Setup the resolution policy and design resolution size
    cc.view.setDesignResolutionSize(width, height, cc.ResolutionPolicy.SHOW_ALL)
    // The game will be resized when browser size change
    cc.view.resizeWithBrowserSize(true)

    initWorld()
    cc.director.runScene(new EditorScene())
  }
  cc.game.run()
}
