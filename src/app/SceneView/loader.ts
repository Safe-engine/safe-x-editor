import { parseInt } from "lodash";

function loadSprite(filePath: string): Promise<cc.Sprite> {
  return new Promise((resolve, reject) => {
    console.log('loadSprite:', filePath);
    cc.loader.load(`file://${filePath}`, function (err, texture) {
      if (err) {
        cc.log("Failed to load file:", filePath, err);
        reject(err)
        return;
      }
      var sprite = new cc.Sprite(texture[0]);
      resolve(sprite)
    });
  });
}

function loadFont(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('loadFont:', filePath);
    cc.loader.load(`file://${filePath}`, function (err, font) {
      if (err) {
        cc.log("Failed to load file:", filePath, err);
        reject(err)
        return;
      }
      resolve()
    });
  });
}

async function parseChildren(root, parentNode, data) {
  const { tag, props, children } = root
  const { rootFolder, assetsTextureList, fontAssets } = data;
  // console.log('parseChildren:', tag, props);
  let renderNode: cc.Node;
  const { node } = props;
  const position = node?.position || 'Vec2(0,0)';
  const [x = 0, y = 0] = position.replace('Vec2(', '').replace(')', '').split(',').map(parseInt);
  if (tag === 'SpriteRender') {
    const { spriteFrame } = props;
    const frameName = spriteFrame.replace('{', '').replace('}', '');
    const texture = assetsTextureList.find(item => item.key === frameName);
    const filePath = `${rootFolder}/res/${texture.value}`;
    const sprite = await loadSprite(filePath);
    sprite.setPosition(x, y);
    console.log('SpriteRender:', x, y, filePath);
    parentNode.addChild(sprite);
    renderNode = sprite
  } else if (tag === 'LabelComp') {
    const { string, font, size = 64 } = props;
    let foundFont = fontAssets.find(item => item.key === font.replace('{', '').replace('}', ''));
    if (!foundFont) {
      foundFont = fontAssets.find(item => item.key === 'defaultFont');
    }
    const filePath = `${rootFolder}/res/${foundFont.value}`;
    const fontName = cc.path.basename(filePath, '.ttf')
    await loadFont(filePath);
    const label = new ccui.Text(string, fontName, size)
    console.log('LabelComp:', x, y, filePath);
    label.setTextVerticalAlignment(cc.VERTICAL_TEXT_ALIGNMENT_BOTTOM)
    label.setPosition(x, y);
    parentNode.addChild(label);
    renderNode = label
  } else if (tag === 'SceneComponent') {
    renderNode = parentNode
  }
  // console.log('renderNode:', renderNode);
  await Promise.all(children.map(async child => {
    await parseChildren(child, renderNode, data);
  }))
}

export async function loadSceneView(selectedEditingComponent = [], data) {
  const [root] = selectedEditingComponent
  if (!cc.director || !cc.director.getRunningScene()) return
  const parentNode = cc.director.getRunningScene().children[0]
  // console.log('loadSceneView:', parentNode)
  await parseChildren(root, parentNode, data)
}
