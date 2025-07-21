import { getNodePosition, parseIntFromValue, parseStringFromValue } from "helper/node"
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

function loadFont(filePath: string): Promise<void> {
  // Function to load a font from a file path for pixi
  return new Promise((resolve, reject) => {
    const loader = new PIXI.Loader()
    loader.add(filePath)
      .load((loader, resources) => {
        if (resources[filePath]) {
          // Assuming PIXI supports the font loading in a similar way
          // console.log('loadFont:', filePath, loader, resources)
          resolve()
        } else {
          reject(new Error(`Failed to load font from ${filePath}`))
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
  } else if (tag === 'LabelComp') {
    // Load font and apply to text node
    const { string, font = '', size } = props
    let foundFont = fontAssets.find((item) => item.key === parseStringFromValue(font))
    if (!foundFont) {
      foundFont = fontAssets.find((item) => item.key === 'defaultFont')
    }
    const filePath = `file://${rootFolder}/res/${foundFont.value}`
    await loadFont(filePath)
    const fontSize = size ? parseIntFromValue(size) : 64
    // console.log('LabelComp:', fontSize, filePath)
    const label = new PIXI.Text(string, { fontFamily: filePath, fontSize });
    label.x = x
    label.y = y
    renderNode = label
    parentNode.addChild(label)
  } else if (tag === 'SceneComponent') {
    renderNode = parentNode
  } else {
    // console.log(componentsCache, tag)
    if (componentsCache[tag]) {
      renderNode = await parseChildren(componentsCache[tag], parentNode, data, evalInit)
    }
  }
  if (!renderNode) return
  if (scale !== 1) {
    renderNode.scale = new PIXI.Point(scale, scale)
  }
  if (scaleX !== 1) {
    renderNode.scale.x = scaleX
  }
  if (scaleY !== 1) {
    renderNode.scale.y = scaleY
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
