import { Assets } from "pixi.js"
import { getNodePosition, parseDirection, parseIntFromValue, parseSize, parseStringFromValue } from "../../../helper/node"
import { getDrawLayer } from "./cocos"
import { HtmlTextParser } from "./html-text-parser"
import { PixiDragonBonesSprite } from "./PixiDragonBonesSprite"
import { PixiSpineSprite } from "./PixiSpineSprite"

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
  previewScrollView?: boolean
}
const _htmlTextParser = new HtmlTextParser()

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

async function loadDragonBones(dataName: string, animation, playTimes, dragonBonesAssets) {
  const key = parseStringFromValue(dataName)
  const data = dragonBonesAssets.find((item) => item.key === key)
  const { atlas, skeleton, texture } = data.value
  await Assets.load([skeleton, atlas, texture])
  // console.log('resources:', resources)
  const dragon = new PixiDragonBonesSprite({
    key,
    skeleton,
    atlas,
    texture,
    animationName: animation,
    playTimes,
  })
  return dragon
}

async function loadSpine(dataName: string, animation, loop, skin, timeScale, spineAssets) {
  const key = parseStringFromValue(dataName)
  const data = spineAssets.find((item) => item.key === key)
  const { atlas, skeleton, texture } = data.value
  Assets.add({ alias: `ske${key}`, src: skeleton })
  Assets.add({ alias: `texJson${key}`, src: atlas })
  await Assets.load([`ske${key}`, `texJson${key}`])
  console.log('resources:', texture)
  const spineSprite = new PixiSpineSprite({
    key,
    skeleton,
    atlas,
    texture,
    animationName: animation,
    loop,
    skin,
    timeScale
  })
  const node = new cc.Node()
  node.addChild(spineSprite)
  return node
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
  } else if (tag === 'LabelComp') {
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
    label.ignoreContentAdaptWithSize(false)
    renderNode = label
  } else if ('RichTextComp' === tag) {
    const { string, font = '', size } = props
    let foundFont = fontAssets.find((item) => item.key === parseStringFromValue(font))
    if (!foundFont) {
      foundFont = fontAssets.find((item) => item.key === 'defaultFont')
    }
    const filePath = cc.path.join(rootFolder, 'res', `${foundFont.value}`)
    const fontName = cc.path.basename(filePath, '.ttf')
    await loadFont(foundFont.value)
    const fontSize = size ? parseIntFromValue(size) : 64
    const rich = new ccui.RichText()
    const newTextArray = _htmlTextParser.parse(string)
    // console.log(newTextArray)
    for (let index = 0; index < newTextArray.length; index++) {
      const { style = {}, text } = newTextArray[index]
      // const fontName = cc.path.basename(this.props.font || foundFont.value, '.ttf')
      if (style.outline) {
        // console.log('richText', richText, (ccui as any).RichElementCustomNode)
        const label = new ccui.Text(text, fontName, fontSize)
        label.enableOutline(cc.hexToColor(style.outline.color), style.outline.width || 3)
        const customElem = new (ccui as any).RichElementCustomNode.create(1, cc.color(255, 0, 0), 255, label)
        rich.pushBackElement(customElem)
      } else {
        const color = style.color ? cc.hexToColor(style.color) : cc.Color.WHITE
        const richText = ccui.RichElementText.create(index, color, 255, text, fontName, fontSize)
        rich.pushBackElement(richText)
      }
    }
    // console.log('RichComp:', fontSize, foundFont)
    rich.ignoreContentAdaptWithSize(false)
    renderNode = rich
  } else if ('ScrollViewComp' === tag) {
    const { viewSize, contentSize, direction, isScrollToTop } = props
    // console.log('ScrollViewComp', props)
    // console.log('viewSize', parseSize(viewSize))
    // console.log('contentSize', parseSize(contentSize))
    // console.log('direction', parseDirection(direction))
    if (data.previewScrollView) {
      const node = new cc.ScrollView(parseSize(viewSize))
      node.setContentSize(parseSize(contentSize))
      node.setViewSize(parseSize(viewSize))
      node.setDirection(parseDirection(direction))
      if (isScrollToTop)
        node.setContentOffset(cc.p(0, parseSize(viewSize).height - parseSize(contentSize).height))
      renderNode = node
    } else {
      const drawNode = new cc.DrawNode()
      const { width, height } = parseSize(contentSize)
      drawNode.drawRect(
        cc.p(0, 0),
        cc.p(width, height),
        cc.color(175, 85, 255, 155),
        0,
        cc.color(227, 11, 93, 0),
      )
      {
        const { width, height } = parseSize(viewSize)
        drawNode.drawRect(
          cc.p(0, 0),
          cc.p(width, height),
          cc.color(255, 185, 199, 55),
          4,
          cc.color(227, 11, 93, 255),
        )
      }
      renderNode = drawNode
    }
  } else if (tag === 'SpineSkeleton') {
    const { data, skin, animation, loop = true, timeScale = 1 } = props
    const node = await loadSpine(data, animation, loop, skin, timeScale, spineAssets)
    renderNode = node
  } else if (tag === 'DragonBonesComp') {
    const { data, animation, playTimes = 0, timeScale = 1 } = props
    const node = await loadDragonBones(data, animation, playTimes, dragonBonesAssets)
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
    const { scaleX = 1, scaleY = 1, scale = 1, rotation = 0, w, h } = node
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
    if (w) {
      renderNode.width = w
    }
    if (h) {
      renderNode.height = h
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
  const { width, height } = designResolution
  const init = `const width = ${width};const height = ${height};`
  for (let index = 0; index < selectedEditingComponent.length; index++) {
    const element = selectedEditingComponent[index]
    await parseChildren(element, drawLayer, data, init)
  }
}
