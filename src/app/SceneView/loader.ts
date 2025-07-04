import { getNodePosition, parseIntFromValue, parseStringFromValue } from "helper/node";

function loadSprite(filePath: string): Promise<cc.Sprite> {
  return new Promise((resolve, reject) => {
    // console.log('loadSprite:', filePath);
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
    // console.log('loadFont:', filePath);
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
  const { tag, props, children = [] } = root
  const { rootFolder, assetsTextureList, fontAssets, spriteFramesAssets } = data;
  // console.log('parseChildren:', tag, props);
  let renderNode: cc.Node;
  const { node } = props;
  const { x, y } = getNodePosition(node);
  const { scaleX = 1, scaleY = 1, scale = 1, rotation = 0 } = node || {};
  if (tag === 'SpriteRender') {
    const { spriteFrame } = props;
    const frameName = parseStringFromValue(spriteFrame);
    const texture = assetsTextureList.find(item => item.key === frameName);
    if (texture) {
      const filePath = `${rootFolder}/res/${texture.value}`;
      const sprite = await loadSprite(filePath);
      renderNode = sprite
    } else {
      const spriteFrame = spriteFramesAssets.find(item => item.key === frameName);
      const frame = cc.spriteFrameCache.getSpriteFrame(spriteFrame)
      renderNode = new cc.Sprite(frame)
    }
    renderNode.setPosition(x, y);
    // console.log('SpriteRender:', x, y, filePath);
    if (parentNode)
      parentNode.addChild(renderNode);
  } else if (tag === 'LabelComp') {
    const { string, font = '', size } = props;
    let foundFont = fontAssets.find(item => item.key === parseStringFromValue(font));
    if (!foundFont) {
      foundFont = fontAssets.find(item => item.key === 'defaultFont');
    }
    const filePath = `${rootFolder}/res/${foundFont.value}`;
    const fontName = cc.path.basename(filePath, '.ttf')
    await loadFont(filePath);
    const fontSize = size ? parseIntFromValue(size) : 64
    const label = new ccui.Text(string, fontName, fontSize)
    console.log('LabelComp:', fontSize, filePath);
    label.setTextVerticalAlignment(cc.VERTICAL_TEXT_ALIGNMENT_BOTTOM)
    label.setPosition(x, y);
    parentNode.addChild(label);
    renderNode = label
  } else if (tag === 'SceneComponent') {
    renderNode = parentNode
  }
  if (scale !== 1) {
    renderNode.scale = scale;
  }
  if (scaleX !== 1) {
    renderNode.scaleX = scaleX;
  }
  if (scaleY !== 1) {
    renderNode.scaleY = scaleY;
  }
  if (rotation !== 0) {
    renderNode.rotation = rotation;
  }
  // console.log('renderNode:', renderNode);
  for (let index = 0; index < children.length; index++) {
    const element = children[index];
    await parseChildren(element, renderNode, data);
  }
}

export async function loadSceneView(selectedEditingComponent = [], data) {
  const [root] = selectedEditingComponent
  if (!cc.director || !cc.director.getRunningScene() || !root) return
  const parentNode = cc.director.getRunningScene().children[0]
  for (let i = 1; i < parentNode.childrenCount; i++) {
    const child = parentNode.children[i];
    child.removeFromParent()
  }
  // console.log('loadSceneView:', parentNode)
  for (let index = 0; index < selectedEditingComponent.length; index++) {
    const element = selectedEditingComponent[index];
    await parseChildren(element, parentNode, data)
  }
}
