import {
  Color4B,
  director,
  GraphicsRender,
  instantiate,
  LabelComp,
  loader,
  log,
  NodeComp,
  NodeRender,
  p,
  RichTextComp,
  ScrollViewComp,
  Size,
  SpriteRender,
} from '@safe-engine/webgl'
import { DragonBonesComp } from '@safe-engine/webgl/dist/dragonbones'
import { TiledMapComp as JSONTiledMap } from '@safe-engine/webgl/dist/fasttiled/TiledMapComp'
import { SliderComp } from '@safe-engine/webgl/dist/gui/SliderComp'
import { SpineSkeleton } from '@safe-engine/webgl/dist/spine'
import { get } from 'lodash-es'
import { ProjectData } from '../../data/GloablState'
import {
  getNodePosition,
  parseDirection,
  parseEval,
  parseFloatFromValue,
  parseIntFromValue,
  parseNumbersArray,
  parseOutline,
  parseShadow,
  parseSize,
  parseStringFromValue,
} from '../../helper/node'
import { getComponent } from './component'
import { addQuotesToTernary } from './utils'

function loadSpriteFrame(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // console.log('loadSprite:', filePath)
    loader.load(filePath, function (err) {
      if (err) {
        log('Failed to load file:', filePath, err)
        reject(err)
        return
      }
      resolve()
    })
  })
}

function loadFont(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // console.log('loadFont:', filePath);
    loader.load(filePath, function (err) {
      if (err) {
        log('Failed to load file:', filePath, err)
        reject(err)
        return
      }
      resolve()
    })
  })
}

async function loadDragonBones(dataName: string, animation, playTimes, timeScale, dragonBonesAssets): Promise<NodeComp> {
  return new Promise((resolve, reject) => {
    const key = parseStringFromValue(dataName)
    const data = dragonBonesAssets.find((item) => item.key === key)
    const { atlas, skeleton, texture } = data.value
    loader.load([atlas, skeleton, texture], function (err) {
      if (err) {
        log('Failed to load file:', skeleton, err)
        reject(err)
        return
      }
      const dragon = instantiate(DragonBonesComp, { data: data.value, animation, playTimes, timeScale })
      resolve(dragon.node)
    })
  })
}

async function loadSpine(dataName: string, animation, loop = true, skin, timeScale, spineAssets): Promise<NodeComp> {
  return new Promise((resolve, reject) => {
    const key = parseStringFromValue(dataName)
    // console.log('loadSpine:', key)
    const data = spineAssets.find((item) => item.key === key)
    if (!data) return
    const { atlas, skeleton } = data.value
    loader.load([atlas, skeleton], function (err) {
      if (err) {
        console.log('Failed to load file:', skeleton, err)
        reject(err)
        return
      }
      const spine = instantiate(SpineSkeleton, { data: data.value, animation, loop, skin, timeScale })
      resolve(spine.node)
    })
  })
}

async function loadTiledMap(mapUrl: string, jsonAssets): Promise<NodeComp> {
  const key = parseStringFromValue(mapUrl)
  const data = jsonAssets.find((item) => item.key === key)
  const tileset = data.json.tilesets[0]
  const baseDir = data.value.split('/').slice(0, -1).join('/')
  // console.log('loadTiledMap', key, baseDir, tileset)
  const tilesetImageUrl = `${baseDir}/${tileset.image}`
  await loader.load([data.value, tilesetImageUrl])
  // const tiled = instantiate(TiledMapComp, { mapFile: data.value })
  const tiled = instantiate(JSONTiledMap, { mapFile: data.value })
  // console.log('tiled', tiled, tilesetImageUrl)
  return tiled.node
}

async function parseChildren(root, parentNode: NodeComp, data: ProjectData, evalInit = '', baseProps = {}) {
  if (Array.isArray(root)) {
    for (let index = 0; index < root.length; index++) {
      await parseChildren(root[index], parentNode, data, evalInit, baseProps)
    }
    return parentNode
  }
  const { tag, props: originProps = {}, components = [], children = [], loop } = root
  const {
    assetsTextureList,
    fontAssets,
    spriteFramesAssets,
    componentsCache = {},
    dragonBonesAssets,
    spineAssets,
    jsonAssets,
    designedResolution,
    jsonCaches,
    staticPropsMap,
    enumsList,
  } = data
  const props = { ...originProps }
  // console.log('baseProps:', tag, props, evalInit)
  let renderNode: NodeComp = instantiate(NodeRender).node
  if (loop) {
    const { startIndex, startIndexSymbol, count, mapFrom, itemSymbol } = loop
    parentNode.addChild(renderNode)
    if (!mapFrom.includes('Array(')) {
      if (mapFrom.includes('JsonCache')) {
        const [, cacheKey, ...rest] = mapFrom.split('.')
        const arrayData = get(jsonCaches[cacheKey].json, rest.join('.'), [])
        for (let index = 0; index < arrayData.length; index++) {
          const loopInit = `const ${startIndexSymbol}=${index};const ${itemSymbol}=${JSON.stringify(arrayData[index])};${evalInit}`
          // console.log('loop:', loop, loopInit)
          await parseChildren({ tag, props, children, components }, renderNode, data, loopInit, baseProps)
        }
      } else {
        const arrayData = staticPropsMap[mapFrom]
        if (arrayData) {
          for (let index = 0; index < arrayData.length; index++) {
            const loopInit = `const ${startIndexSymbol}=${index};const ${itemSymbol}=${JSON.stringify(arrayData[index])};${evalInit}`
            // console.log('loop:', loop, loopInit)
            await parseChildren({ tag, props, children, components }, renderNode, data, loopInit, baseProps)
          }
        }
      }
    } else {
      for (let index = 0; index < count; index++) {
        const loopInit = `const ${startIndexSymbol}=${index + startIndex};${evalInit}`
        // console.log('loopInit:', index, loopInit)
        await parseChildren({ tag, props, children, components }, renderNode, data, loopInit, baseProps)
      }
    }
    setTimeout(() => {
      const colliderComp = Object.keys(parentNode.entity.components).find((name) => ['GridLayoutComp', 'WidgetComp'].includes(name))
      // console.log('colliderComp:', colliderComp, Object.keys(parentNode.entity.components))
      if (colliderComp) {
        renderNode.addComponent(parentNode.entity.components[colliderComp])
      }
    }, 100)
    return
  }
  const initWithProps = `const baseProps=${JSON.stringify(baseProps)};${evalInit}`

  Object.entries(props).forEach(([key, val]) => {
    if (typeof val === 'string') {
      if (val.includes('this.props')) {
        // console.log('replace prop:', key, val, baseProps)
        // if (val?.includes('?')) {
        const propName = val.replace('{this.props', 'baseProps').replace('}', '')
        const transform = key === 'spriteFrame' ? addQuotesToTernary : undefined
        const finalExpr = transform ? transform(propName) : propName
        const spriteFrameVal = `const baseProps=${JSON.stringify(baseProps)};${evalInit}${finalExpr}`
        // console.log('spriteFrame conditional:', spriteFrameVal)
        props[key] = eval(spriteFrameVal)
        // } else {
        //   const propName = val.replace('{this.props.', '').replace('}', '')
        //   props[key] = baseProps[propName]
        // }
      } else {
        const varString = parseStringFromValue(val)
        const enumVal = get(enumsList, varString)
        if (enumVal !== undefined) props[key] = enumVal
        // console.log('replace prop:', key, varString, '=>', props[key])
      }
    }
  })
  // console.log('parseChildren:', tag, props, baseProps)
  function getLabelText(string = '') {
    // console.log('getLabelText', string)
    if (string.includes('[')) {
      const staticKey = parseStringFromValue(string).split('[')[0]
      const staticProps = staticPropsMap[staticKey]
      // console.log('getLabelText staticKey', staticKey, staticProps)
      if (staticProps) {
        const arrayIndexStr = string.replace(staticKey, 'staticData')
        const finalLabel = eval(`const staticData = ${JSON.stringify(staticProps)};${evalInit}${arrayIndexStr}`)
        // console.log('getLabelText finalLabel', finalLabel, arrayIndexStr)
        return finalLabel
      }
    } else if (string.includes('`')) {
      const key = string.substring(1, string.length - 1)
      // console.log('tryGetValue getLabelText', key)
      return tryGetValue(key)
    }
    if (string.includes('.')) return eval(`${evalInit}${string}`)
    return string
  }

  async function getTexture(spriteFrame: string) {
    // console.log('getTexture(', spriteFrame, props, evalInit)
    if (!spriteFrame) return
    const frameName = parseStringFromValue(spriteFrame)
    if (frameName.includes('[')) {
      const staticKey = frameName.split('[')[0]
      const staticProps = staticPropsMap[staticKey]
      if (staticProps) {
        const arrayIndexStr = frameName.replace(staticKey, 'staticData')
        const finalFrameName = eval(`const staticData = ${JSON.stringify(staticProps)};${evalInit}${arrayIndexStr}`)
        // console.log('getTexture finalFrameName', finalFrameName, arrayIndexStr, staticProps)
        return getTexture(finalFrameName)
      }
    }
    const texture = assetsTextureList.find((item) => item.key === frameName)
    if (texture) {
      await loadSpriteFrame(texture.value)
      return texture.value
    } else {
      const spriteFrame = spriteFramesAssets.find((item) => item.key === frameName)
      return spriteFrame.value
    }
  }
  function tryGetValue(key: string) {
    try {
      return parseEval(initWithProps)(key)
    } catch (error) {
      error.message = `Failed to parse value with eval: ${key}`
      // console.error('tryGetValue error:', error)
      return key
    }
  }
  function getColor(colorStr: string) {
    const found = data.colors.find((v) => v.key === colorStr)
    return Color4B(...found.value)
  }
  function getOutline(outline: string): [Color4B, number] {
    if (!outline) return
    const [color, width] = parseOutline(outline)
    return [getColor(color), width]
  }
  function getShadow(shadow: string): [Color4B, number, Size] {
    if (!shadow) return
    const [color, blur, width, height] = parseShadow(shadow)
    return [getColor(color), blur, Size(width, height)]
  }
  if (tag === 'SpriteRender' || tag === 'ProgressTimerComp' || tag === 'ButtonComp') {
    const { spriteFrame, capInsets, tiledSize } = props
    const frame = await getTexture(spriteFrame)
    // console.log('tiledSize', spriteFrame, frame, spriteFrameCache.getSpriteFrame(frame))
    const sprite = instantiate(SpriteRender, {
      spriteFrame: frame,
      capInsets: capInsets && parseNumbersArray(capInsets),
      tiledSize: tiledSize && parseSize(tiledSize, evalInit),
    })
    renderNode = sprite.node
    // } else if (tag === 'ProgressTimerComp') {
    //   const { spriteFrame, fillCenter, fillRange, fillType, isReverse } = props
    //   const progress = instantiate(ProgressTimerComp, {
    //     spriteFrame: await getTexture(spriteFrame),
    //     fillCenter: fillCenter && (parseVec2(fillCenter, '') as Vec2),
    //     fillRange: fillRange ? parseFloatFromValue(fillRange) : 1,
    //     fillType,
    //     isReverse: parseBoolFromValue(isReverse),
    //   })
    //   renderNode = progress.node
  } else if (tag === 'LabelComp') {
    const { string, font = '', size, outline, shadow } = props
    // console.log('LabelComp:', props)
    const foundFont = fontAssets.find((item) => item.key === parseStringFromValue(font))
    // if (!foundFont) {
    //   foundFont = fontAssets.find((item) => item.key === 'defaultFont')
    // }
    // const filePath = path.join(rootFolder, 'res', `${foundFont.value}`)
    // const fontName = path.basename(filePath, '.ttf')
    if (foundFont) await loadFont(foundFont.value)
    const fontSize = size ? parseIntFromValue(size) : 64
    const label = instantiate(LabelComp, {
      string: getLabelText(string),
      font: foundFont ? foundFont.path : undefined,
      size: fontSize,
      outline: getOutline(outline),
      shadow: getShadow(shadow),
    })
    // console.log('LabelComp:', fontSize, foundFont)
    renderNode = label.node
  } else if ('RichTextComp' === tag) {
    const { string, font = '', size } = props
    const foundFont = fontAssets.find((item) => item.key === parseStringFromValue(font))
    // if (!foundFont) {
    //   foundFont = fontAssets.find((item) => item.key === 'defaultFont')
    // }
    if (foundFont) await loadFont(foundFont.value)
    const fontSize = parseIntFromValue(size) ?? 64
    const rich = instantiate(RichTextComp, { string, font: foundFont ? foundFont.path : undefined, size: fontSize })
    renderNode = rich.node
  } else if ('SliderComp' === tag) {
    const { barBackground, normalBall = '', pressedBall, disabledBall, percent } = props
    const slider = instantiate(SliderComp, {
      barBackground: await getTexture(barBackground),
      normalBall: await getTexture(normalBall),
      pressedBall: await getTexture(pressedBall),
      disabledBall: await getTexture(disabledBall),
      percent: parseFloatFromValue(percent),
      onChange: () => {
        // console.log('Slider onChange:', value)
      },
    })
    renderNode = slider.node
  } else if ('ScrollViewComp' === tag || 'ListViewComp' === tag) {
    const { viewSize, contentSize, direction, isScrollToTop } = props
    if (data.previewScrollView) {
      const scroll = instantiate(ScrollViewComp, {
        viewSize: parseSize(viewSize, evalInit),
        contentSize: parseSize(contentSize, evalInit),
        direction: parseDirection(direction),
        isScrollToTop,
      })
      renderNode = scroll.node
    } else {
      const drawNode = instantiate(GraphicsRender, {})
      const { width, height } = parseSize(contentSize, evalInit)
      drawNode.node.instance.drawRect(p(0, 0), p(width, height), Color4B(175, 85, 255, 155), 0, Color4B(227, 11, 93, 0))
      {
        const { width, height } = parseSize(viewSize, evalInit)
        drawNode.node.instance.drawRect(p(0, 0), p(width, height), Color4B(255, 185, 199, 55), 4, Color4B(227, 11, 93, 255))
      }
      renderNode = drawNode.node
    }
  } else if (tag === 'SpineSkeleton') {
    const { data, skin, animation, loop = true, timeScale = 1 } = props
    const node = await loadSpine(data, animation, loop, skin, timeScale, spineAssets)
    renderNode = node
  } else if (tag === 'DragonBonesComp') {
    const { data, animation, playTimes = 0, timeScale = 1 } = props
    const node = await loadDragonBones(data, animation, playTimes, timeScale, dragonBonesAssets)
    // console.log('loadDragonBones', node, timeScale);
    renderNode = node
  } else if (tag === 'TiledMapComp') {
    const { mapFile } = props
    const node = await loadTiledMap(mapFile, jsonAssets)
    renderNode = node
  } else if (tag === 'SceneComponent') {
    renderNode = parentNode
  } else {
    // console.log('componentsCache', componentsCache, tag)
    if (componentsCache[tag]) {
      // console.log('componentProps', componentsCache[tag], tag, props)
      renderNode = await parseChildren(componentsCache[tag], parentNode, data, evalInit, { ...baseProps, ...props })
    }
  }
  if (renderNode !== parentNode && !renderNode.parent) {
    parentNode.addChild(renderNode)
  }
  const { node = {} } = props
  const { scaleX = 1, scaleY = 1, scale = 1, rotation = 0, w, h, color, active, anchorX, anchorY } = node
  // console.log('node', node, tag)
  if (node.position || node.xy) {
    const { x, y } = getNodePosition(node, initWithProps)
    renderNode.posX = x
    renderNode.posY = y
  }
  if (scale !== 1) {
    renderNode.scale = parseEval(initWithProps)(scale)
  }
  if (scaleX !== 1) {
    renderNode.scaleX = parseEval(initWithProps)(scaleX)
  }
  if (scaleY !== 1) {
    renderNode.scaleY = parseEval(initWithProps)(scaleY)
  }
  if (anchorX !== undefined) {
    renderNode.anchorX = parseEval(initWithProps)(anchorX)
  }
  if (anchorY !== undefined) {
    renderNode.anchorY = parseEval(initWithProps)(anchorY)
  }
  if (rotation !== 0) {
    renderNode.rotation = parseEval(initWithProps)(rotation)
  }
  if (w) {
    renderNode.w = parseEval(initWithProps)(w)
  }
  if (h) {
    renderNode.h = parseEval(initWithProps)(h)
  }
  if (active !== undefined) {
    renderNode.active = parseEval(initWithProps)(active)
  }
  if (color) {
    renderNode.color = getColor(tryGetValue(color))
  }
  for (let index = 0; index < children.length; index++) {
    const element = children[index]
    // console.log('parseChildren loop:', index, children.length, element)
    await parseChildren(element, renderNode, data, evalInit, baseProps)
  }
  const colliderComp = getComponent(components, renderNode, designedResolution)
  if (colliderComp) {
    renderNode.addComponent(colliderComp)
    // console.log('colliderComp:', colliderComp)
  }
  return renderNode
}

export async function loadSceneViewCocos(componentData, data: ProjectData, drawLayer: NodeComp) {
  const root = componentData.treeData
  if (!director || !director.getRunningScene() || !root) return
  const { designedResolution, defaultProps } = data
  // console.log('loadSceneView:', defaultProps[root.tag], componentData)
  const { width, height } = designedResolution
  const init = `const width = ${width};const height = ${height};`
  await parseChildren(root, drawLayer, data, init, defaultProps[componentData.name])
}
