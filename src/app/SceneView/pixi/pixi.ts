import { Application, Container, Graphics, Point, Sprite } from 'pixi.js';
import { getLastSceneScale, getLastSceneX, getLastSceneY } from "../../../data/AppData";

export async function createPixiApp(options: any = {}) {
  const canvas = document.getElementById(options.canvasId || 'gameCanvas') as HTMLCanvasElement;
  const width = options.width || 800;
  const height = options.height || 600;
  const app = new Application()
  await app.init({
    canvas,
    width,
    height,
    resizeTo: window,
    eventFeatures: {
      move: true,
      /** disables the global move events which can be very expensive in large scenes */
      globalMove: false,
      click: true,
      wheel: false,
    },
    backgroundColor: options.backgroundColor || 0x4b5560, // Cool gray
    resolution: options.resolution || window.devicePixelRatio || 1,
    ...options
  });

  // Enable interaction
  app.stage.interactive = true;
  return app;
}

export function createPixiRoot(app, designResolution) {
  // Tạo drawLayer (Container)
  const drawLayer = new Container();
  drawLayer.label = 'drawLayer';

  // Tạo border (Graphics)
  const border = new Graphics();
  const lineWidth = 5;
  const pink = 0xe30b5d; // Hot pink

  // Vẽ khung viền hình chữ nhật
  const { width, height } = designResolution
  border.rect(0, 0, width, height);
  border.stroke({ width: lineWidth, color: pink })

  drawLayer.addChild(border);
  app.stage.addChild(drawLayer);
  drawLayer.x = getLastSceneX(); // Đặt vị trí của layer
  drawLayer.y = getLastSceneY(); // Đặt vị trí của layer
  drawLayer.scale = new Point(getLastSceneScale(), getLastSceneScale()); // Giảm kích thước của layer xuống
  const arrowContainer = new Container();
  const arrowSpriteHorizon = Sprite.from((window as any).arrowPng);
  const arrowSpriteVertical = Sprite.from((window as any).arrowPng);
  arrowSpriteVertical.anchor.x = 0.5;
  arrowSpriteHorizon.anchor.x = 0.5;
  arrowSpriteVertical.anchor.y = 1;
  arrowSpriteHorizon.anchor.y = 1;
  arrowSpriteVertical.tint = 0xff0000;
  arrowSpriteHorizon.rotation = Math.PI / 2;
  arrowContainer.addChild(arrowSpriteHorizon);
  arrowContainer.addChild(arrowSpriteVertical);
  app.stage.addChild(arrowContainer);
}
