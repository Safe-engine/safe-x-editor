import { getNodePosition, parseIntFromValue, parseStringFromValue } from "../../../helper/node"
import { SkeletonAnimation } from "../spine/CCSkeletonAnimation"
import { getDrawLayer } from "./cocos"
import { PixiDragonBonesSprite, SharedDragonBonesManager } from "./PixiDragonBonesSprite"

declare let PIXI: any
declare let dragonBones: any

interface AssetData {
  key: string
  value: string
}
interface SkeletonAnimationData {
  atlas: string
  skeleton: string
  texture: string
}
interface SkeletonAnimationAsset {
  key: string
  value: SkeletonAnimationData
}
export interface ProjectData {
  rootFolder: string
  assetsTextureList: AssetData[]
  fontAssets: AssetData[]
  spriteFramesAssets: AssetData[]
  dragonBonesAssets: SkeletonAnimationAsset[]
  spineAssets: SkeletonAnimationAsset[]
  componentsCache: { [key: string]: any }
  designResolution: { width: number; height: number }
}

function loadSprite(filePath: string): Promise<cc.Sprite> {
  return new Promise((resolve, reject) => {
    // console.log('loadSprite:', filePath);
    cc.loader.load(filePath, function (err, texture) {
      if (err) {
        cc.log('Failed to load file:', filePath, err)
        reject(err)
        return
      }
      var sprite = new cc.Sprite(texture[0])
      resolve(sprite)
    })
  })
}

function loadFont(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // console.log('loadFont:', filePath);
    cc.loader.load(filePath, function (err, font) {
      if (err) {
        cc.log('Failed to load file:', filePath, err)
        reject(err)
        return
      }
      resolve()
    })
  })
}

function loadDragonBones(dataName: string, animation, playTimes, dragonBonesAssets) {
  const key = parseStringFromValue(dataName)
  const data = dragonBonesAssets.find((item) => item.key === key)
  const { atlas, skeleton, texture } = data.value
  // console.log('loadDragonBones:', data, PIXI.Loader.shared.resources)
  return new Promise(async (resolve, reject) => {
    const loader = PIXI.Loader.shared
    await SharedDragonBonesManager.loadAssetsOnce(skeleton, atlas, texture)
    // console.log('resources:', resources)
    const dragon = new PixiDragonBonesSprite({
      ske: skeleton,
      texJson: atlas,
      texPng: texture,
      animationName: animation,
      playTimes,
    })
    resolve(dragon)
  })
}

async function parseChildren(root, parentNode, data: ProjectData, evalInit = '') {
  const { tag, props = {}, children = [], loop } = root
  const { rootFolder, assetsTextureList, fontAssets, spriteFramesAssets, componentsCache = {}, dragonBonesAssets, spineAssets } = data
  // console.log('parseChildren:', tag, props);
  let renderNode = new cc.Node()
  if (loop) {
    const { startIndex, startIndexSymbol, count } = loop
    parentNode.addChild(renderNode)
    for (let index = 0; index < count; index++) {
      const evalInit = `${startIndexSymbol}=${index + startIndex};`
      parseChildren({ tag, props, children }, renderNode, data, evalInit)
    }
    return
  }
  if (tag === 'SpriteRender' || tag === 'ProgressTimerComp') {
    const { spriteFrame } = props
    const frameName = parseStringFromValue(spriteFrame)
    const texture = assetsTextureList.find((item) => item.key === frameName)
    if (texture) {
      const sprite = await loadSprite(texture.value)
      renderNode = sprite
    } else {
      const spriteFrame = spriteFramesAssets.find((item) => item.key === frameName)
      const frame = cc.spriteFrameCache.getSpriteFrame(spriteFrame.value)
      renderNode = new cc.Sprite(frame)
    }
  } else if (tag === 'LabelComp' || 'RichTextComp' === tag) {
    const { string, font = '', size } = props
    let foundFont = fontAssets.find((item) => item.key === parseStringFromValue(font))
    if (!foundFont) {
      foundFont = fontAssets.find((item) => item.key === 'defaultFont')
    }
    const filePath = cc.path.join(rootFolder, 'res', `${foundFont.value}`)
    const fontName = cc.path.basename(filePath, '.ttf')
    await loadFont(foundFont.value)
    const fontSize = size ? parseIntFromValue(size) : 64
    const label = new ccui.Text(string, fontName, fontSize)
    // console.log('LabelComp:', fontSize, foundFont)
    label.setTextVerticalAlignment(cc.VERTICAL_TEXT_ALIGNMENT_BOTTOM)
    renderNode = label
  } else if (tag === 'SpineSkeleton') {
    const { data, skin, animation, loop = true, timeScale = 1 } = props
    const key = parseStringFromValue(data)
    const skelData = spineAssets.find((item) => item.key === key)
    // console.log('SpineSkeleton', skelData, key)
    const { atlas, skeleton } = skelData.value
    await new Promise((resolve) => {
      cc.loader.load([skeleton, atlas], () => { }, () => {
        // console.log('Cocos loaded spine assets', skeleton, atlas, timeScale);
        return resolve(null)
      })
    })
    const node = SkeletonAnimation.createWithJsonFile(skeleton, atlas, timeScale)
    if (skin) {
      node.setSkin(skin)
    }
    if (animation) {
      node.setAnimation(0, animation, loop)
    }
    renderNode = node
  } else if (tag === 'DragonBonesComp') {
    const { data, animation, playTimes = 0, timeScale = 1 } = props
    const node: any = await loadDragonBones(data, animation, playTimes, dragonBonesAssets)
    // console.log('loadDragonBones', node, timeScale);
    node._armatureDisplay.animation.timeScale = timeScale
    if (animation)
      node._armatureDisplay.animation.gotoAndPlayByTime(animation, 0, playTimes)
    renderNode = node
  } else if (tag === 'SceneComponent') {
    renderNode = parentNode
  } else {
    // console.log('componentsCache', componentsCache, tag)
    if (componentsCache[tag]) {
      renderNode = await parseChildren(componentsCache[tag], parentNode, data, evalInit)
    }
  }
  if (renderNode !== parentNode && !renderNode.parent) {
    parentNode.addChild(renderNode)
    const { node = {} } = props
    const { scaleX = 1, scaleY = 1, scale = 1, rotation = 0 } = node
    if (node.position || node.xy) {
      const { x, y } = getNodePosition(node, evalInit)
      renderNode.x = x
      renderNode.y = y
    }
    if (scale !== 1) {
      renderNode.scale = scale
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
  }
  // console.log('renderNode:', renderNode);
  for (let index = 0; index < children.length; index++) {
    const element = children[index]
    await parseChildren(element, renderNode, data, evalInit)
  }
  return renderNode
}

export async function loadSceneViewCocos(selectedEditingComponent = [], data: ProjectData) {
  const [root] = selectedEditingComponent
  if (!cc.director || !cc.director.getRunningScene() || !root) return
  const { designResolution } = data
  const drawLayer = getDrawLayer(designResolution)
  // console.log('loadSceneView:', selectedEditingComponent, parentNode)
  for (let index = 0; index < selectedEditingComponent.length; index++) {
    const element = selectedEditingComponent[index]
    await parseChildren(element, drawLayer, data)
  }
}
