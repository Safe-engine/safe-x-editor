export function onStart() {
  cc.view.setDesignResolutionSize(640, 1320, cc.ResolutionPolicy.FIXED_WIDTH)
  const newScene = new cc.Scene()
  const gray = cc.color(75, 85, 99, 255); // Màu xám (cool gray)
  const drawLayer = new cc.LayerColor(gray)
  drawLayer.setName('drawLayer')
  // Tạo một DrawNode để vẽ khung viền
  const border = new cc.DrawNode();
  const pink = cc.color(227, 11, 93, 255); // Màu hồng (hot pink)
  const lineWidth = 4; // Độ dày viền

  // Vẽ khung hình chữ nhật quanh layer
  border.drawRect(
    cc.p(0, 0),                   // Góc trái dưới
    cc.p(1280, 720),              // Góc phải trên
    gray,
    lineWidth,                     // Độ dày
    pink,                         // Màu viền
  );
  drawLayer.addChild(border);       // Thêm border vào layer
  newScene.addChild(drawLayer)
  drawLayer.scale = 0.33; // Giảm kích thước của layer xuống
  cc.director.runScene(newScene)
}