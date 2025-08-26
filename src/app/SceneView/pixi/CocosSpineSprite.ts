import { SkeletonAnimation } from "../spine/CCSkeletonAnimation";

declare let PIXI: any

export function createCocosSpineSprite(app, { skeleton, atlas, timeScale, animation, loop, skin }) {
  // Giả sử bạn đã có một canvas của Cocos2d
  const _canvas = document.createElement('CANVAS')
  document.body.appendChild(_canvas);
  _canvas.id = "spineCanvas" + Date.now();
  _canvas.style.display = 'none';
  _canvas.style.position = 'absolute';
  _canvas.style.backgroundColor = "transparent";
  cc.game.run({
    debugMode: 1,
    showFPS: true,
    frameRate: 20,
    id: _canvas.id,
    renderMode: 1
  }, () => {
    cc.view.setDesignResolutionSize(1024, 1024, cc.ResolutionPolicy.SHOW_ALL)
    const newScene = new cc.Scene()
    cc.loader.load([skeleton, atlas], () => { }, () => {
      console.log('Cocos loaded spine assets', skeleton, atlas, timeScale);
      const node = SkeletonAnimation.createWithJsonFile(skeleton, atlas, timeScale)
      node.x = 512
      node.y = 256
      if (skin) {
        node.setSkin(skin)
      }
      if (animation) {
        node.setAnimation(0, animation, loop)
      }
      newScene.addChild(node)
    })
    cc.director.runScene(newScene)
  });
  const texture = PIXI.Texture.from(_canvas);
  // Tạo sprite Pixi hiển thị nội dung Cocos
  const sprite = new PIXI.Sprite(texture);
  // Cập nhật mỗi frame để Pixi lấy frame mới từ Cocos
  app.ticker.add(() => {
    // console.log('Cocos loaded update texture');
    texture.update();
  });
  return sprite;
}