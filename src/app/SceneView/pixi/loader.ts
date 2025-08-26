import WebFont from 'webfontloader';
import { getNodePosition, parseIntFromValue, parseStringFromValue } from '../../../helper/node';
import { ProjectData } from "../cocos/loader";
declare let PIXI: any
declare let dragonBones: any
// declare let WebFont: any

function loadSprite(filePath: string) {
  // Function to load a sprite from a file path for pixi
  if (PIXI.Loader.shared.resources[filePath]) {
    const sprite = PIXI.Sprite.from(filePath)
    return sprite
  }
  return new Promise((resolve, reject) => {
    const loader = PIXI.Loader.shared
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

function loadFont(fontName: string, fontURL: string) {
  const style = document.createElement('style')
  style.textContent = `
@font-face {
  font-family: '${fontName}';
  src: url('${fontURL}') format('truetype');
  font-weight: normal;
  font-style: normal;
}
`
  document.head.appendChild(style)
  WebFont.load({
    custom: {
      families: [fontName],
    },
  });
}

function loadDragonBones(dataName: string, dragonBonesAssets) {
  const key = parseStringFromValue(dataName)
  const data = dragonBonesAssets.find((item) => item.key === key)
  const { atlas, skeleton, texture } = data.value
  // console.log('loadDragonBones:', data, PIXI.Loader.shared.resources)
  return new Promise((resolve, reject) => {
    const factory = dragonBones.PixiFactory.factory
    const loader = PIXI.Loader.shared
    if (!PIXI.Loader.shared.resources[`ske${key}`]) {
      loader.add(`ske${key}`, skeleton)
        .add(`texJson${key}`, atlas)
        .add(`texPng${key}`, texture)
    }
    loader.load((loader, resources) => {
      // console.log('resources:', resources)
      const dragonData = factory.parseDragonBonesData(resources[`ske${key}`].data, key)
      factory.parseTextureAtlasData(resources[`texJson${key}`].data, resources[`texPng${key}`].texture, key)
      const { armatureNames } = dragonData
      const armatureName = armatureNames[0]
      const armature = factory.buildArmatureDisplay(armatureName, key)
      // console.log('armature:', armature)
      resolve(armature)
    })
  })
}

async function parseChildren(root, parentNode, data: ProjectData, evalInit = '') {
  const { tag, props = {}, children = [], loop } = root
  const { assetsTextureList, fontAssets, spriteFramesAssets, componentsCache = {}, dragonBonesAssets, spineAssets } = data
  // console.log('parseChildren:', tag, props);
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
  // Handle different tags and create corresponding nodes
  if (tag === 'SpriteRender' || tag === 'ProgressTimerComp') {
    // Load sprite texture and create sprite node
    const { spriteFrame } = props
    const frameName = parseStringFromValue(spriteFrame)
    const texture = assetsTextureList.find((item) => item.key === frameName)
    if (texture) {
      const sprite = await loadSprite(texture.value)
      // console.log('Sprite loaded:', parentNode, sprite)
      renderNode = sprite
    } else {
      const spriteFrame = spriteFramesAssets.find((item) => item.key === frameName)
      // console.log('spriteFrame loaded:', PIXI.utils.TextureCache, PIXI.Loader.shared.resources)
      const texture = PIXI.utils.TextureCache[spriteFrame.value];
      renderNode = PIXI.Sprite.from(texture)
    }
  } else if (tag === 'LabelComp') {
    // Load font and apply to text node
    const { string, font = '', size } = props
    let foundFont = fontAssets.find((item) => item.key === parseStringFromValue(font))
    if (!foundFont) {
      foundFont = fontAssets.find((item) => item.key === 'defaultFont')
    }
    const fontName = foundFont.value.split('.')[0].split('/').pop().split('-')[0]
    await loadFont(fontName, foundFont.value)
    const fontSize = size ? parseIntFromValue(size) : 64
    // console.log('LabelComp:', fontSize, filePath)
    const label = new PIXI.Text(string, { fontFamily: fontName, fontSize, fill: '#ffffff' });
    renderNode = label
  } else if (tag === 'SpineSkeleton') {
    const { data, skin, animation, loop = true, timeScale = 1 } = props
  } else if (tag === 'DragonBonesComp') {
    const { data, animation, playTimes = 0, timeScale = 1 } = props
    renderNode = await loadDragonBones(data, dragonBonesAssets)
    renderNode.armature.animation.timeScale = timeScale
    if (animation)
      renderNode.animation.gotoAndPlayByTime(animation, 0, playTimes)
  } else if (tag === 'SceneComponent') {
    renderNode = parentNode
  } else {
    // console.log('componentsCache', componentsCache, tag)
    if (componentsCache[tag]) {
      renderNode = await parseChildren(componentsCache[tag], parentNode, data, evalInit)
    }
  }
  if (renderNode !== parentNode) {
    parentNode.addChild(renderNode)
    const { node = {} } = props
    if (node.position || node.xy) {
      const { x, y } = getNodePosition(node, evalInit)
      renderNode.x = x
      renderNode.y = y
    }
    const { scaleX = 1, scaleY = 1, scale = 1, rotation = 0, anchorX = 0.5, anchorY = 0.5 } = node
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
    if (renderNode.anchor) {
      renderNode.anchor.x = anchorX
      renderNode.anchor.y = anchorY
    }
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
    child.destroy()
  }
  // console.log('loadSceneView:', selectedEditingComponent, parentNode)
  for (let index = 0; index < selectedEditingComponent.length; index++) {
    const element = selectedEditingComponent[index]
    await parseChildren(element, parentNode, data)
  }
}
