import { getLastSceneScale, getLastSceneX, getLastSceneY } from "../../../data/AppData"

export const onStart = (designResolution) => function () {
  console.log('Start create game scene', designResolution)
  const { width, height } = designResolution
  const policy = width > height ? cc.ResolutionPolicy.FIXED_HEIGHT : cc.ResolutionPolicy.FIXED_WIDTH
  cc.view.setDesignResolutionSize(width, height, policy)
  getDrawLayer(designResolution)
}

export function getDrawLayer(designResolution) {
  const newScene = new cc.Scene()
  const gray = cc.color(75, 85, 99, 255); // Màu xám (cool gray)
  const drawLayer = new cc.LayerColor(gray)
  // Tạo một DrawNode để vẽ khung viền
  const border = new cc.DrawNode();
  const pink = cc.color(227, 11, 93, 255); // Màu hồng (hot pink)
  const lineWidth = 4; // Độ dày viền
  const { width, height } = designResolution
  // Vẽ khung hình chữ nhật quanh layer
  border.drawRect(
    cc.p(0, 0),                   // Góc trái dưới
    cc.p(width, height),              // Góc phải trên
    gray,
    lineWidth,                     // Độ dày
    pink,                         // Màu viền
  );
  drawLayer.addChild(border);       // Thêm border vào layer
  const arrowContainer = new cc.Node();
  const arrowSpriteHorizon = new cc.Sprite('Ico_arrow.png');
  const arrowSpriteVertical = new cc.Sprite('Ico_arrow.png');
  arrowSpriteVertical.setAnchorPoint(0.5, 0);
  arrowSpriteHorizon.setAnchorPoint(0.5, 0);
  arrowSpriteVertical.color = cc.color(255, 0, 0, 255);
  arrowSpriteHorizon.setRotation(90);
  arrowContainer.addChild(arrowSpriteHorizon);
  arrowContainer.addChild(arrowSpriteVertical);
  drawLayer.setTag(1)
  arrowContainer.setTag(2);
  arrowSpriteHorizon.setTag(3);
  arrowSpriteVertical.setTag(4);
  newScene.addChild(drawLayer)
  drawLayer.setPosition(getLastSceneX(), getLastSceneY()); // Đặt vị trí của layer
  drawLayer.scale = getLastSceneScale(); // Giảm kích thước của layer xuống
  newScene.addChild(arrowContainer);
  cc.director.runScene(newScene)
  return drawLayer
}

export function getDrawNode() {
  return cc.director.getRunningScene().getChildByTag(1)
}

export function getArrowNode() {
  return cc.director.getRunningScene().getChildByTag(2)
}

export function getHorizonArrow() {
  return getArrowNode().getChildByTag(3)
}

export function getVerticalArrow() {
  return getArrowNode().getChildByTag(4)
}
