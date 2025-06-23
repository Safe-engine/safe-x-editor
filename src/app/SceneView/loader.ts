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
      console.log('winSize:', cc.winSize);
      var sprite = new cc.Sprite(texture[0]);
      resolve(sprite)
    });
  });
}

async function parseChildren(root, parentNode, rootFolder, assetsTextureList) {
  const { tag, props, children } = root
  console.log('parseChildren:', tag, parentNode);
  let renderNode: cc.Node;
  if (tag === 'SpriteRender') {
    const { spriteFrame, node } = props;
    const position = node?.position || 'Vec2(0,0)';
    const [x = 0, y = 0] = position.replace('Vec2(', '').replace(')', '').split(',').map(parseInt);
    const frameName = spriteFrame.replace('{', '').replace('}', '');
    const texture = assetsTextureList.find(item => item.key === frameName);
    const filePath = `${rootFolder}/res/${texture.value}`;
    const sprite = await loadSprite(filePath);
    sprite.setPosition(x, y);
    console.log('SpriteRender:', x, y, filePath);
    parentNode.addChild(sprite);
    renderNode = sprite
  } else if (tag === 'SceneComponent') {
    renderNode = parentNode
  }
  console.log('renderNode:', renderNode);
  await Promise.all(children.map(async child => {
    await parseChildren(child, renderNode, rootFolder, assetsTextureList);
  }))
}

export async function loadSceneView(selectedEditingComponent = [], rootFolder: string, assetsTextureList = []) {
  const [root] = selectedEditingComponent
  if (!cc.director || !cc.director.getRunningScene()) return
  const parentNode = cc.director.getRunningScene().children[0]
  console.log('loadSceneView:', parentNode)
  await parseChildren(root, parentNode, rootFolder, assetsTextureList)
}
