import { getLastSceneScale, getLastSceneX, getLastSceneY } from "../../../data/AppData";

declare let PIXI: any

export function createPixiApp(options: any = {}) {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const width = options.width || 800;
  const height = options.height || 600;
  const app = new PIXI.Application({
    view: canvas,
    width,
    height,
    backgroundColor: options.backgroundColor || 0x4b5560, // Cool gray
    resolution: options.resolution || window.devicePixelRatio || 1,
    ...options
  });

  // Enable interaction
  app.stage.interactive = true;

  // Tạo drawLayer (Container)
  const drawLayer = new PIXI.Container();
  drawLayer.name = 'drawLayer';

  // Tạo border (Graphics)
  const border = new PIXI.Graphics();
  const lineWidth = 4;
  const pink = 0xe30b5d; // Hot pink

  // Vẽ khung viền hình chữ nhật
  border.lineStyle(lineWidth, pink, 1);
  border.drawRect(0, 0, width, height);

  drawLayer.addChild(border);
  app.stage.addChild(drawLayer);
  drawLayer.x = getLastSceneX(); // Đặt vị trí của layer
  drawLayer.y = getLastSceneY(); // Đặt vị trí của layer
  drawLayer.scale = new PIXI.Point(getLastSceneScale(), getLastSceneScale()); // Giảm kích thước của layer xuống
  const arrowContainer = new PIXI.Container();
  const arrowSpriteHorizon = PIXI.Sprite.from('Ico_arrow.png');
  const arrowSpriteVertical = PIXI.Sprite.from('Ico_arrow.png');
  arrowSpriteVertical.anchor.x = 0.5;
  arrowSpriteHorizon.anchor.x = 0.5;
  arrowSpriteVertical.anchor.y = 1;
  arrowSpriteHorizon.anchor.y = 1;
  arrowSpriteVertical.tint = 0xff0000;
  arrowSpriteHorizon.rotation = Math.PI / 2;
  arrowContainer.addChild(arrowSpriteHorizon);
  arrowContainer.addChild(arrowSpriteVertical);
  app.stage.addChild(arrowContainer);
  return app;
}
