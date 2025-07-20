import { getNodePosition, parseStringFromValue } from "helper/node"
import { ProjectData } from "../loader"
declare let PIXI: any

function loadSprite(filePath: string) {
  // Function to load a sprite from a file path for pixi
  return new Promise((resolve, reject) => {
    const loader = new PIXI.Loader()
    loader.add(filePath)
      .load((loader, resources) => {
        // console.log('loadSprite:', filePath, loader, resources)
        if (resources[filePath]) {
          const sprite = PIXI.Sprite.from(filePath)
          resolve(sprite)
        } else {
          reject(new Error(`Failed to load sprite from ${filePath}`))
        }
      })
  })
}

async function parseChildren(root, parentNode, data: ProjectData, evalInit = '') {
  const { tag, props = {}, children = [], loop } = root
  const { rootFolder, assetsTextureList, fontAssets, spriteFramesAssets, componentsCache } = data
  console.log('parseChildren:', tag, props);
  let renderNode = new PIXI.Container()
  if (loop) {
    const { startIndex, startIndexSymbol, count } = loop
    parentNode.addChild(renderNode)
    for (let index = 0; index < count; index++) {
      const evalInit = `${startIndexSymbol}=${index + startIndex};`
      await parseChildren({ tag, props, children }, renderNode, data, evalInit)
    }
    return
  }
  const { node } = props
  const { x, y } = getNodePosition(node, evalInit)
  const { scaleX = 1, scaleY = 1, scale = 1, rotation = 0 } = node || {}

  // Handle different tags and create corresponding nodes
  if (tag === 'SpriteRender') {
    // Load sprite texture and create sprite node
    const { spriteFrame } = props
    const frameName = parseStringFromValue(spriteFrame)
    const texture = assetsTextureList.find((item) => item.key === frameName)
    const filePath = `file://${rootFolder}/res/${texture.value}`
    const sprite = await loadSprite(filePath)
    // console.log('Sprite loaded:', parentNode, sprite)
    renderNode = sprite
    // renderNode.addComponent(cc.Sprite).spriteFrame = sprite.spriteFrame;
    renderNode.x = x
    renderNode.y = y
    // renderNode.scale = new PIXI.Point(scaleX, scaleY);
    // renderNode.angle = rotation;
    if (parentNode) parentNode.addChild(renderNode)
  } else if (tag === 'FontRender') {
    // Load font and apply to text node
    // loadFont(fontAssets.find(asset => asset.key === props.font)?.value || '')
    //   .then(() => {
    //     const label = renderNode.addComponent(cc.Label);
    //     label.string = props.text || '';
    //     label.fontSize = props.fontSize || 20;
    //     label.lineHeight = props.lineHeight || 24;
    //     label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
    //     label.verticalAlign = cc.Label.VerticalAlign.CENTER;
    //     renderNode.setPosition(x * scaleX, y * scaleY);
    //     renderNode.setScale(scaleX * scale, scaleY * scale);
    //     renderNode.angle = rotation;
    //     parentNode.addChild(renderNode);
    //   })
    //   .catch(err => cc.log('Error loading font:', err));
  }
  if (!renderNode) return
  if (scale !== 1) {
    renderNode.scale = new PIXI.Point(scale, scale)
  }
  if (scaleX !== 1) {
    renderNode.scaleX = scaleX
  }
  if (scaleY !== 1) {
    renderNode.scaleY = scaleY
  }
  if (rotation !== 0) {
    renderNode.rotation = rotation
  }
  // console.log('renderNode:', renderNode);
  for (let index = 0; index < children.length; index++) {
    const element = children[index]
    await parseChildren(element, renderNode, data, evalInit)
  }
  return renderNode
}

export async function loadSceneViewPixi(app, selectedEditingComponent = [], data: ProjectData) {
  const [root] = selectedEditingComponent
  if (!app || !root) return
  const parentNode = app.stage.children[0]
  for (let i = 1; i < parentNode.children.length; i++) {
    const child = parentNode.children[i]
    // child.removeFromParent()
  }
  // console.log('loadSceneView:', selectedEditingComponent, parentNode)
  for (let index = 0; index < selectedEditingComponent.length; index++) {
    const element = selectedEditingComponent[index]
    await parseChildren(element, parentNode, data)
  }
}
