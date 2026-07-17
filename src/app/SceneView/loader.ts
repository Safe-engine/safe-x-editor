import { AssetManager, ComponentX, Label, Node, ScrollView, SpineSkeleton, Sprite, TiledMap, UILayout } from '@safe-engine/sdl'
import { DragonBones } from '@safe-engine/sdl/lib/dragonbones'
import { getLastRootFolder } from 'data/AppData'
import { ProjectData } from 'data/GloablState'
import {
  getNodePosition,
  parseBoolFromValue,
  parseDirection,
  parseEval,
  parseIntFromValue,
  parseOutline,
  parseSize,
  parseStringFromValue,
} from 'helper/node'
import { get } from 'lodash-es'
import { drawRect } from 'sdl3'
import { getComponent } from './component'
import { addQuotesToTernary } from './utils'

type SdlColor = { r: number; g: number; b: number; a?: number }

function projectAssetUrl(path: string) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path
  const normalized = path.replace(/\\/g, '/').replace(/^res\//, '')
  const absolutePath = normalized.startsWith('/') ? normalized : `${getLastRootFolder()}/res/${normalized}`
  return `file://${absolutePath.split('/').map(encodeURIComponent).join('/')}`
}

export class RectRender extends ComponentX<{ fillColor?: SdlColor; strokeColor?: SdlColor; lineWidth?: number }> {
  fillColor: SdlColor | undefined
  strokeColor: SdlColor | undefined
  lineWidth = 1

  onAwake() {
    this.fillColor = this.props.fillColor
    this.strokeColor = this.props.strokeColor
    this.lineWidth = this.props.lineWidth ?? 1
  }

  onRender() {
    const node = this.node
    const x = node.worldX - node.anchorX * node.width * node.worldScaleX
    const y = node.worldY - node.anchorY * node.height * node.worldScaleY
    const width = node.width * node.worldScaleX
    const height = node.height * node.worldScaleY
    if (this.fillColor) {
      drawRect(x, y, width, height, this.fillColor.r, this.fillColor.g, this.fillColor.b, this.fillColor.a ?? 255)
    }
    if (this.strokeColor && this.lineWidth > 0) {
      const line = this.lineWidth
      const color = this.strokeColor
      drawRect(x, y, width, line, color.r, color.g, color.b, color.a ?? 255)
      drawRect(x, y + height - line, width, line, color.r, color.g, color.b, color.a ?? 255)
      drawRect(x, y, line, height, color.r, color.g, color.b, color.a ?? 255)
      drawRect(x + width - line, y, line, height, color.r, color.g, color.b, color.a ?? 255)
    }
  }
}

function makeNode(name = 'Node') {
  const node = new Node(name)
  return node
}

async function parseChildren(root, parentNode: Node, data: ProjectData, evalInit = '', baseProps = {}) {
  if (Array.isArray(root)) {
    for (let index = 0; index < root.length; index++) {
      await parseChildren(root[index], parentNode, data, evalInit, baseProps)
    }
    return parentNode
  }
  const { tag, props: originProps = {}, components = [], children = [], loop } = root
  const {
    assetsTextureList = [],
    fontAssets = [],
    spriteFramesAssets = [],
    componentsCache = {},
    designedResolution,
    jsonCaches = {},
    staticPropsMap = {},
    enumsList = {},
  } = data
  const props = { ...originProps }
  const initWithProps = `const baseProps=${JSON.stringify(baseProps)};${evalInit}`

  Object.entries(props).forEach(([key, val]) => {
    if (typeof val === 'string') {
      if (val.includes('this.props')) {
        const propName = val.replace('{this.props', 'baseProps').replace('}', '')
        const transform = key === 'spriteFrame' ? addQuotesToTernary : undefined
        const finalExpr = transform ? transform(propName) : propName
        props[key] = eval(`const baseProps=${JSON.stringify(baseProps)};${evalInit}${finalExpr}`)
      } else {
        const varString = parseStringFromValue(val)
        const enumVal = get(enumsList, varString)
        if (enumVal !== undefined) props[key] = enumVal
      }
    }
  })

  let renderNode = makeNode(tag)
  if (loop) {
    const { startIndex, startIndexSymbol, count, mapFrom, itemSymbol } = loop
    parentNode.addChild(renderNode)
    if (!mapFrom?.includes('Array(')) {
      const arrayData = mapFrom?.includes('JsonCache')
        ? get(jsonCaches[mapFrom.split('.')[1]]?.json, mapFrom.split('.').slice(2).join('.'), [])
        : staticPropsMap[mapFrom]
      for (let index = 0; index < (arrayData?.length ?? 0); index++) {
        const loopInit = `const ${startIndexSymbol}=${index};const ${itemSymbol}=${JSON.stringify(arrayData[index])};${evalInit}`
        await parseChildren({ tag, props, children, components }, renderNode, data, loopInit, baseProps)
      }
    } else {
      for (let index = 0; index < count; index++) {
        const loopInit = `const ${startIndexSymbol}=${index + startIndex};${evalInit}`
        await parseChildren({ tag, props, children, components }, renderNode, data, loopInit, baseProps)
      }
    }
    return renderNode
  }

  function tryGetValue(key: string) {
    try {
      return parseEval(initWithProps)(key)
    } catch (error) {
      error.message = `Failed to parse value with eval: ${key}`
      return key
    }
  }

  function getColor(colorStr: string): SdlColor {
    const found = data.colors?.find((v) => v.key === colorStr)
    const [r = 255, g = 255, b = 255, a = 255] = found?.value ?? [255, 255, 255, 255]
    return { r, g, b, a }
  }

  function getOutline(outline: string): [SdlColor, number] {
    if (!outline) return
    const [color, width] = parseOutline(outline)
    return [getColor(color), width]
  }

  function getShadow(shadow): [SdlColor, number, { width: number; height: number }] {
    if (!shadow) return
    const values = Array.isArray(shadow)
      ? shadow
      : parseStringFromValue(shadow).replace(/^\[|\]$/g, '').split(',').map((value) => value.trim())
    const [color = '', width = 0, ...offset] = values
    return [getColor(color), Number(width), parseSize(Array.isArray(shadow) ? offset[0] : offset.join(','))]
  }

  async function getTexture(spriteFrame: string) {
    if (!spriteFrame) return undefined
    const frameName = parseStringFromValue(spriteFrame)
    if (frameName?.includes('[')) {
      const staticKey = frameName.split('[')[0]
      const staticProps = staticPropsMap[staticKey]
      if (staticProps) {
        const arrayIndexStr = frameName.replace(staticKey, 'staticData')
        const finalFrameName = eval(`const staticData = ${JSON.stringify(staticProps)};${evalInit}${arrayIndexStr}`)
        return getTexture(finalFrameName)
      }
    }
    const texture = assetsTextureList.find((item) => item.key === frameName)
    if (texture) return texture.value
    const spriteFrameAsset = spriteFramesAssets.find((item) => item.key === frameName)
    return spriteFrameAsset?.value
  }

  function getLabelText(string = '') {
    if (string.includes('[')) {
      const staticKey = parseStringFromValue(string).split('[')[0]
      const staticProps = staticPropsMap[staticKey]
      if (staticProps) {
        const arrayIndexStr = string.replace(staticKey, 'staticData')
        return eval(`const staticData = ${JSON.stringify(staticProps)};${evalInit}${arrayIndexStr}`)
      }
    } else if (string.includes('`')) {
      return tryGetValue(string.substring(1, string.length - 1))
    }
    if (string.includes('.')) return eval(`${evalInit}${string}`)
    return parseStringFromValue(string) ?? string
  }

  if (tag === 'Sprite' || tag === 'Button' || tag === 'ProgressBar' || tag === 'CircleProgressBar') {
    const texture = await getTexture(props.spriteFrame)
    if (texture) renderNode.addComponent(new Sprite({ spriteFrame: texture, tiled: props.tiled ?? false }))
  } else if (tag === 'ProgressBar') {
    const texture = await getTexture(props.spriteFrame)
    // SDL's ProgressBar preview does not match Sprite frame rendering closely enough for editor preview.
    // Render the authored sprite frame directly so the visual matches layout assets exactly.
    if (texture) renderNode.addComponent(new Sprite({ spriteFrame: texture }))
  } else if (tag === 'Label' || tag === 'RichText') {
    const { string, font = '', size, outline, shadow, align, verticalAlign } = props
    const foundFont =
      fontAssets.find((item) => item.key === parseStringFromValue(font)) ?? fontAssets.find((item) => item.key === 'defaultFont')
    const label = new Label({
      string: getLabelText(string),
      font: foundFont?.value,
      size: size ? parseIntFromValue(size) : Label.defaultSize,
      outline: getOutline(outline),
      shadow: getShadow(shadow),
      align,
      verticalAlign
    })
    renderNode.addComponent(label)
  } else if (tag === 'ScrollView' || tag === 'ListView') {
    const { viewSize, contentSize, direction } = props
    const size = parseSize(viewSize ?? contentSize, evalInit)
    renderNode.width = size.width
    renderNode.height = size.height
    if (data.previewScrollView) {
      const scroll = new ScrollView({
        contentSize: parseSize(contentSize, evalInit),
        viewSize: parseSize(viewSize, evalInit),
        horizontal: [1, 3].includes(parseDirection(direction)),
        vertical: [2, 3].includes(parseDirection(direction))
      })
      renderNode.addComponent(scroll)
    } else {
      const content = parseSize(contentSize, evalInit)
      renderNode.addComponent(
        new RectRender({ fillColor: { r: 255, g: 185, b: 199, a: 55 }, strokeColor: { r: 227, g: 11, b: 93, a: 255 }, lineWidth: 4 }),
      )
      const contentNode = makeNode('ScrollViewContentPreview')
      contentNode.width = content.width
      contentNode.height = content.height
      // contentNode.anchorX = 0
      // contentNode.anchorY = 0
      contentNode.addComponent(new RectRender({ fillColor: { r: 175, g: 85, b: 255, a: 155 } }))
      renderNode.addChild(contentNode)
    }
  } else if (tag === 'SpineSkeleton') {
    const { data: spineData, atlas: spineAtlas, skin, animation, loop = true, timeScale = 1 } = props
    const key = parseStringFromValue(spineData)
    const spineAsset = data.spineAssets?.find((item) => item.key === key)
    const atlasKey = parseStringFromValue(spineAtlas)
    const atlasAsset = data.spineAssets?.find((item) => item.key === atlasKey)
    // console.log('Spine Props:', props, 'Spine Asset:', spineAsset, 'Atlas Asset:', atlasAsset)
    const spineValue = spineAsset?.value
    const spineConfig =
      typeof spineValue === 'object' && spineValue
        ? spineValue
        : { skeleton: spineValue, atlas: atlasAsset?.value ?? atlasKey }
    // console.log('Spine Config:', spineConfig, 'Props:', props, 'Spine Asset:', spineAsset, 'Atlas Asset:', atlasAsset)
    if (typeof spineConfig.skeleton === 'string' && typeof spineConfig.atlas === 'string') {
      const resolvedSpineData = {
        ...spineConfig,
        skeleton: projectAssetUrl(spineConfig.skeleton),
        atlas: projectAssetUrl(spineConfig.atlas),
        ...(typeof spineConfig.texture === 'string' ? { texture: projectAssetUrl(spineConfig.texture) } : {}),
      }
      // console.log('Resolved Spine Data:', resolvedSpineData, 'Props:', props, 'Spine Asset:', spineAsset, 'Atlas Asset:', atlasAsset)
      const spineSkeleton = renderNode.addComponent(
        new SpineSkeleton({ data: resolvedSpineData, skin, animation, loop: parseBoolFromValue(loop) ?? true, timeScale }),
      )
      await spineSkeleton.reload()
    }
  } else if (tag === 'DragonBones') {
    const { data: dragonBonesData, skin, animation, playTimes = 0, timeScale = 1 } = props
    const key = parseStringFromValue(dragonBonesData)
    const dragonBonesAsset = data.dragonBonesAssets?.find((item) => item.key === key)
    if (dragonBonesAsset?.value) {
      const dragonBones = renderNode.addComponent(
        new DragonBones({ data: dragonBonesAsset.value, skin, animation, playTimes, timeScale } as any),
      )
      await dragonBones.reload()
    }
  } else if (tag === 'TiledMap') {
    const { mapFile } = props
    const key = parseStringFromValue(mapFile)
    // console.log('TiledMap key:', key, 'data.jsonAssets:', data.jsonAssets, 'props:', props)
    const mapAsset = data.jsonAssets?.find((item) => item.key === key)
    const mapFilePath = projectAssetUrl(mapAsset?.path ?? key)
    if (mapFilePath) {
      const tiledMap = renderNode.addComponent(new TiledMap({ mapFile: mapFilePath }))
      await tiledMap.reload()
    }
  } else if (tag === 'UILayout') {
    const { direction, gap, paddingBottom, paddingTop, paddingLeft, paddingRight } = props
    const layoutProps: Record<string, unknown> = {}
    if (direction !== undefined) layoutProps.direction = direction
    if (gap !== undefined) layoutProps.gap = parseIntFromValue(gap)
    if (paddingTop !== undefined) layoutProps.paddingTop = parseIntFromValue(paddingTop)
    if (paddingRight !== undefined) layoutProps.paddingRight = parseIntFromValue(paddingRight)
    if (paddingBottom !== undefined) layoutProps.paddingBottom = parseIntFromValue(paddingBottom)
    if (paddingLeft !== undefined) layoutProps.paddingLeft = parseIntFromValue(paddingLeft)
    renderNode.addComponent(UILayout, layoutProps)
  } else if (componentsCache[tag]) {
    renderNode = await parseChildren(componentsCache[tag], parentNode, data, evalInit, { ...baseProps, ...props })
  }

  if (renderNode !== parentNode && !renderNode.parent) parentNode.addChild(renderNode)

  const { node = {} } = props
  const { scaleX = 1, scaleY = 1, scale = 1, rotation = 0, width, height, color, active, anchorX, anchorY, zIndex, zOrder, name, tag: nodeTag } = node
  if (node.position || node.xy || node.x !== undefined || node.y !== undefined) {
    const { x, y } = getNodePosition(node, initWithProps)
    renderNode.x = x
    renderNode.y = y
  }
  if (scale !== 1) renderNode.scale = parseEval(initWithProps)(scale)
  if (scaleX !== 1) renderNode.scaleX = parseEval(initWithProps)(scaleX)
  if (scaleY !== 1) renderNode.scaleY = parseEval(initWithProps)(scaleY)
  if (anchorX !== undefined) renderNode.anchorX = parseEval(initWithProps)(anchorX)
  if (anchorY !== undefined) renderNode.anchorY = parseEval(initWithProps)(anchorY)
  if (rotation !== 0) renderNode.rotation = parseEval(initWithProps)(rotation)
  if (zIndex !== undefined) renderNode.zIndex = parseEval(initWithProps)(zIndex)
  if (name !== undefined) renderNode.name = parseEval(initWithProps)(name)
  if (nodeTag !== undefined) renderNode.tag = parseEval(initWithProps)(nodeTag)
  if (width) renderNode.width = parseEval(initWithProps)(width)
  if (height) renderNode.height = parseEval(initWithProps)(height)
  if (active !== undefined) renderNode.active = parseEval(initWithProps)(active)
  if (color) renderNode.color = getColor(tryGetValue(color))

  const colliderComp = getComponent(components, renderNode, designedResolution)
  if (colliderComp) renderNode.addComponent(colliderComp)

  for (let index = 0; index < children.length; index++) {
    await parseChildren(children[index], renderNode, data, evalInit, baseProps)
  }
  return renderNode
}

export async function loadSceneViewSdl(componentData, data: ProjectData, drawLayer: Node) {
  const root = componentData.treeData ?? componentData
  if (!root) return
  const { designedResolution, defaultProps = {} } = data
  const { width, height } = designedResolution
  const init = `const width = ${width};const height = ${height};`
  await parseChildren(root, drawLayer, data, init, defaultProps[componentData.name])
}

export function preloadSdlAssets(assets: any) {
  const group = AssetManager.createGroup()
  assets?.fontAssets?.forEach((font) => group.addFont(font.value, font.value, Label.defaultSize))
  assets?.assetsTextureList?.forEach((texture) => group.addTexture(texture.value, texture.value))
  // assets?.spriteSheetAssets?.forEach((spriteSheet) => {
  //   if (!spriteSheet.texture || !spriteSheet.json) return
  //   group.addTexture(spriteSheet.texture, spriteSheet.texture)
  //   spriteFrameCache.addAtlas(spriteSheet.texture, spriteSheet.json)
  // })
  return group.preload().catch((error) => {
    console.warn('Failed to preload SDL preview assets', error)
  })
}
