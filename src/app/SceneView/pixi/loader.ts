import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { PixiFactory } from 'dragonbones-pixijs';
import { Assets, Container, Point, Sprite, Text } from 'pixi.js';
import WebFont from 'webfontloader';
import { getNodePosition, parseIntFromValue, parseStringFromValue } from '../../../helper/node';
import { ProjectData } from "../cocos/loader";
import { createPixiRoot } from './pixi';

async function loadSprite(filePath: string) {
  // Function to load a sprite from a file path for pixi
  // if (Assets.get(filePath)) {
  //   const sprite = Sprite.from(filePath)
  //   return sprite
  // }
  await Assets.load(filePath)
  return Sprite.from(filePath)
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

async function loadDragonBones(dataName: string, dragonBonesAssets) {
  const key = parseStringFromValue(dataName)
  const data = dragonBonesAssets.find((item) => item.key === key)
  const { atlas, skeleton, texture } = data.value
  const factory = PixiFactory.factory
  const resources = await Assets.load([skeleton, atlas, texture])
  // console.log('resources:', resources)
  const dragonData = factory.parseDragonBonesData(resources[skeleton], key)
  factory.parseTextureAtlasData(resources[atlas], resources[texture], key)
  const { armatureNames } = dragonData
  const armatureName = armatureNames[0]
  const armature = factory.buildArmatureDisplay(armatureName, key)
  // console.log('armature:', armature)
  return armature
}

async function loadPixiSpine(dataName: string, spinesAssets) {
  const key = parseStringFromValue(dataName)
  const data = spinesAssets.find((item) => item.key === key)
  const { atlas, skeleton, texture } = data.value
  // console.log('loadPixiSpine:', data)
  Assets.add({ alias: `ske${key}`, src: skeleton })
  Assets.add({ alias: `texJson${key}`, src: atlas })
  await Assets.load([`ske${key}`, `texJson${key}`, texture])
  // console.log('resources:', resources)
  const spine = Spine.from({ skeleton: `ske${key}`, atlas: `texJson${key}` })
  // console.log('spine:', spine)
  return spine
}

async function parseChildren(app, root, parentNode, data: ProjectData, evalInit = '') {
  const { tag, props = {}, children = [], loop } = root
  const { assetsTextureList, fontAssets, spriteFramesAssets, componentsCache = {}, dragonBonesAssets, spineAssets } = data
  // console.log('parseChildren:', tag, props);
  let renderNode = new Container()
  if (loop) {
    const { startIndex, startIndexSymbol, count } = loop
    parentNode.addChild(renderNode)
    for (let index = 0; index < count; index++) {
      const evalInit = `${startIndexSymbol}=${index + startIndex};`
      await parseChildren(app, { tag, props, children }, renderNode, data, evalInit)
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
      // console.log('spriteFrame loaded:', utils.TextureCache, Loader.shared.resources)
      // const texture = utils.TextureCache[spriteFrame.value];
      renderNode = Sprite.from(spriteFrame.value)
    }
  } else if (tag === 'LabelComp' || 'RichTextComp' === tag) {
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
    const label = new Text(string);
    // , { fontFamily: fontName, fontSize, fill: '#ffffff' }
    label.setSize(size)
    // label.string = string
    label.style.fill = '#ffffff'
    renderNode = label
  } else if (tag === 'SpineSkeleton') {
    const { data, skin, animation, loop = true, timeScale = 1 } = props
    const spine = await loadPixiSpine(data, spineAssets)
    spine.state.timeScale = timeScale
    if (animation)
      spine.state.setAnimation(0, animation, loop)
    renderNode = spine
  } else if (tag === 'DragonBonesComp') {
    const { data, animation, playTimes = 0, timeScale = 1 } = props
    const armatureDisplay = await loadDragonBones(data, dragonBonesAssets)
    armatureDisplay.armature.animation.timeScale = timeScale
    if (animation)
      armatureDisplay.animation.gotoAndPlayByTime(animation, 0, playTimes)
    renderNode = armatureDisplay
  } else if (tag === 'SceneComponent') {
    renderNode = parentNode
  } else {
    // console.log('componentsCache', componentsCache, tag)
    if (componentsCache[tag]) {
      renderNode = await parseChildren(app, componentsCache[tag], parentNode, data, evalInit)
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
      renderNode.scale = new Point(scale, scale)
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
    if (renderNode instanceof Sprite) {
      renderNode.anchor.x = anchorX
      renderNode.anchor.x = anchorY
    }
  }
  // console.log('renderNode:', renderNode);
  for (let index = 0; index < children.length; index++) {
    const element = children[index]
    await parseChildren(app, element, renderNode, data, evalInit)
  }
  return renderNode
}

export async function loadSceneViewPixi(app, selectedEditingComponent = [], data: ProjectData) {
  const [root] = selectedEditingComponent
  if (!app || !root) return
  app.stage.removeChildren()
  app.stage.sortDirty = true
  createPixiRoot(app, data.designResolution)
  const parentNode = app.stage.children[0]
  // console.log('loadSceneView:', selectedEditingComponent, parentNode)
  const { width, height } = data.designResolution
  const init = `const width = ${width};const height = ${height};`
  for (let index = 0; index < selectedEditingComponent.length; index++) {
    const element = selectedEditingComponent[index]
    await parseChildren(app, element, parentNode, data, init)
  }
}
