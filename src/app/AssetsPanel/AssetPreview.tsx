import {
  AnimationState,
  AnimationStateData,
  AtlasAttachmentLoader,
  MeshAttachment,
  Physics,
  RegionAttachment,
  Skeleton,
  SkeletonBinary,
  SkeletonJson,
  Texture,
  TextureAtlas,
} from '@esotericsoftware/spine-core'
import { loadScene } from '@safe-engine/sdl/lib/core/instantiate'
import { Node } from '@safe-engine/sdl/lib/core/Node'
import { Scene } from '@safe-engine/sdl/lib/core/Scene'
import { DragonBones } from '@safe-engine/sdl/lib/dragonbones'
import { SdlSlot } from '@safe-engine/sdl/lib/dragonbones/display'
import { transformPoint as transformDragonBonesPoint } from '@safe-engine/sdl/lib/dragonbones/math'
import { Engine } from '@safe-engine/sdl/lib/Engine'
import { SpineSkeleton } from '@safe-engine/sdl/lib/spine/SpineSkeleton'
import { round } from 'lodash-es'
import { useEffect, useRef, useState } from 'react'
import SelectBox from '../../base/SelectBox'
import { useSelector } from '../../states/app.context'
import { selectPreviewAsset } from '../../states/app.selectors'
import { Sprite } from './Sprite'

const PREVIEW_CANVAS_ID = 'asset-preview-canvas'
const PREVIEW_SIZE = 300

type AnimationPreviewType = 'spine' | 'dragonBones'
type SpinePreviewValue = { atlas: string; skeleton: string; texture?: string }
type DragonBonesPreviewValue = { atlas: string; skeleton: string; texture: string }
type PreviewBounds = { minX: number; minY: number; maxX: number; maxY: number }
type PreviewMetadata = {
  animations: string[]
  skins: string[]
  defaultAnimation: string
  defaultSkin: string
  zoomScale: number
}

function isAnimationPreviewType(type: string): type is AnimationPreviewType {
  return type === 'spine' || type === 'dragonBones'
}

function parseNumbers(value = '') {
  return String(value).match(/-?\d+(\.\d+)?/g)?.map(Number) || []
}

function parseRect(value: any = '') {
  if (value && typeof value === 'object') {
    return {
      x: value.x || 0,
      y: value.y || 0,
      w: value.w ?? value.width ?? 0,
      h: value.h ?? value.height ?? 0,
    }
  }
  const [x = 0, y = 0, w = 0, h = 0] = parseNumbers(value)
  return { x, y, w, h }
}

function parseSizeString(value: any = '') {
  if (value && typeof value === 'object') {
    return {
      w: value.w ?? value.width ?? 0,
      h: value.h ?? value.height ?? 0,
    }
  }
  const [w = 0, h = 0] = parseNumbers(value)
  return { w, h }
}

function isRotatedFrame(value: any) {
  return value === true || value === 'true'
}

class CanvasSpineTexture extends Texture {
  setFilters() { }
  setWraps() { }
  dispose() { }
}

class CanvasSpinePreview {
  private readonly context: CanvasRenderingContext2D
  private skeleton: Skeleton | null = null
  private state: AnimationState | null = null
  private version = 0
  private animationFrame = 0
  private lastFrameTime = 0
  private currentAnimation = ''
  readonly transform = { x: PREVIEW_SIZE / 2, y: PREVIEW_SIZE / 2, scale: 1 }

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d')
    if (!context) throw Error('Unable to create the Spine preview canvas.')
    this.context = context
  }

  async showPreview(value: SpinePreviewValue): Promise<PreviewMetadata> {
    const version = ++this.version
    this.stop()
    this.skeleton = null
    this.state = null
    this.currentAnimation = ''
    this.clear()

    const [atlasText, skeletonSource] = await Promise.all([
      this.loadText(value.atlas),
      this.loadSkeleton(value.skeleton),
    ])
    if (version !== this.version) return this.emptyMetadata()

    const atlas = new TextureAtlas(atlasText)
    await Promise.all(atlas.pages.map(async (page) => {
      const image = await this.loadImage(value.texture ?? this.resolveSiblingPath(value.atlas, page.name))
      page.setTexture(new CanvasSpineTexture(image))
    }))
    if (version !== this.version) return this.emptyMetadata()

    const attachmentLoader = new AtlasAttachmentLoader(atlas)
    const parser = skeletonSource instanceof ArrayBuffer
      ? new SkeletonBinary(attachmentLoader)
      : new SkeletonJson(attachmentLoader)
    const skeleton = new Skeleton(parser.readSkeletonData(skeletonSource))
    skeleton.setToSetupPose()
    skeleton.updateWorldTransform(Physics.update)
    this.skeleton = skeleton
    this.state = new AnimationState(new AnimationStateData(skeleton.data))

    const animations = skeleton.data.animations.map((animation) => animation.name).filter(Boolean)
    const skins = skeleton.data.skins.map((skin) => skin.name).filter(Boolean)
    const defaultSkin = skins[0] ?? ''
    const defaultAnimation = animations[0] ?? ''
    if (defaultSkin) skeleton.setSkinByName(defaultSkin)
    if (defaultAnimation) this.playAnimation(defaultAnimation)

    const zoomScale = this.fitToBounds(this.measureBounds())
    this.lastFrameTime = performance.now()
    this.animationFrame = requestAnimationFrame(this.renderFrame)
    return { animations, skins, defaultAnimation, defaultSkin, zoomScale }
  }

  clearPreview() {
    this.version += 1
    this.stop()
    this.skeleton = null
    this.state = null
    this.currentAnimation = ''
    this.transform.x = PREVIEW_SIZE / 2
    this.transform.y = PREVIEW_SIZE / 2
    this.transform.scale = 1
    this.clear()
  }

  playAnimation(name: string) {
    if (!name || !this.state) return
    this.currentAnimation = name
    this.state.setAnimation(0, name, true)
    this.updatePose(0)
    this.fitToBounds(this.measureBounds())
  }

  setSkin(name: string) {
    if (!name || !this.skeleton) return
    this.skeleton.setSkinByName(name)
    this.skeleton.setToSetupPose()
    if (this.currentAnimation) this.state?.setAnimation(0, this.currentAnimation, true)
    this.updatePose(0)
    this.fitToBounds(this.measureBounds())
  }

  getZoomScale() {
    return this.transform.scale
  }

  private renderFrame = (time: number) => {
    this.updatePose(Math.min((time - this.lastFrameTime) / 1000, 0.064))
    this.lastFrameTime = time
    this.render()
    this.animationFrame = requestAnimationFrame(this.renderFrame)
  }

  private updatePose(delta: number) {
    if (!this.skeleton || !this.state) return
    this.state.update(delta)
    this.state.apply(this.skeleton)
    this.skeleton.updateWorldTransform(Physics.update)
  }

  private render() {
    const skeleton = this.skeleton
    if (!skeleton) return
    this.clear()
    for (const slot of skeleton.drawOrder) {
      const attachment = slot.getAttachment()
      if (!slot.bone.active || !attachment) continue
      if (attachment instanceof RegionAttachment) {
        const vertices = new Float32Array(8)
        attachment.computeWorldVertices(slot, vertices, 0, 2)
        const image = attachment.region?.texture?.getImage() as CanvasImageSource | undefined
        if (image) this.drawTriangles(image, vertices, attachment.uvs, [0, 1, 2, 2, 3, 0], slot, attachment)
      } else if (attachment instanceof MeshAttachment) {
        const vertices = new Float32Array(attachment.worldVerticesLength)
        attachment.computeWorldVertices(slot, 0, attachment.worldVerticesLength, vertices, 0, 2)
        const image = attachment.region?.texture?.getImage() as CanvasImageSource | undefined
        if (image) this.drawTriangles(image, vertices, attachment.uvs, attachment.triangles, slot, attachment)
      }
    }
  }

  private drawTriangles(image: CanvasImageSource, vertices: Float32Array, uvs: ArrayLike<number>, triangles: ArrayLike<number>, slot: any, attachment: any) {
    const skeletonColor = this.skeleton?.color
    const alpha = (skeletonColor?.a ?? 1) * slot.color.a * attachment.color.a
    for (let index = 0; index < triangles.length; index += 3) {
      const points = [triangles[index] * 2, triangles[index + 1] * 2, triangles[index + 2] * 2]
      this.drawTriangle(image, vertices, uvs, points[0], points[1], points[2], alpha)
    }
  }

  private drawTriangle(image: CanvasImageSource, vertices: Float32Array, uvs: ArrayLike<number>, a: number, b: number, c: number, alpha: number) {
    const width = (image as HTMLImageElement).naturalWidth || (image as HTMLCanvasElement).width
    const height = (image as HTMLImageElement).naturalHeight || (image as HTMLCanvasElement).height
    const sx0 = uvs[a] * width
    const sy0 = uvs[a + 1] * height
    const sx1 = uvs[b] * width
    const sy1 = uvs[b + 1] * height
    const sx2 = uvs[c] * width
    const sy2 = uvs[c + 1] * height
    const determinant = (sx1 - sx0) * (sy2 - sy0) - (sx2 - sx0) * (sy1 - sy0)
    if (!determinant) return

    const x0 = this.transform.x + vertices[a] * this.transform.scale
    const y0 = this.transform.y + vertices[a + 1] * this.transform.scale
    const x1 = this.transform.x + vertices[b] * this.transform.scale
    const y1 = this.transform.y + vertices[b + 1] * this.transform.scale
    const x2 = this.transform.x + vertices[c] * this.transform.scale
    const y2 = this.transform.y + vertices[c + 1] * this.transform.scale
    const ax = ((x1 - x0) * (sy2 - sy0) - (x2 - x0) * (sy1 - sy0)) / determinant
    const bx = ((y1 - y0) * (sy2 - sy0) - (y2 - y0) * (sy1 - sy0)) / determinant
    const cx = ((sx1 - sx0) * (x2 - x0) - (sx2 - sx0) * (x1 - x0)) / determinant
    const dx = ((sx1 - sx0) * (y2 - y0) - (sx2 - sx0) * (y1 - y0)) / determinant

    this.context.save()
    this.context.beginPath()
    this.context.moveTo(x0, y0)
    this.context.lineTo(x1, y1)
    this.context.lineTo(x2, y2)
    this.context.closePath()
    this.context.clip()
    this.context.globalAlpha = alpha
    this.context.setTransform(ax, bx, cx, dx, x0 - ax * sx0 - cx * sy0, y0 - bx * sx0 - dx * sy0)
    this.context.drawImage(image, 0, 0)
    this.context.restore()
  }

  private measureBounds() {
    if (!this.skeleton) return null
    let bounds: PreviewBounds | null = null
    for (const slot of this.skeleton.drawOrder) {
      const attachment = slot.getAttachment()
      if (!slot.bone.active || !attachment) continue
      const vertices = attachment instanceof RegionAttachment
        ? new Float32Array(8)
        : attachment instanceof MeshAttachment ? new Float32Array(attachment.worldVerticesLength) : null
      if (!vertices) continue
      if (attachment instanceof RegionAttachment) attachment.computeWorldVertices(slot, vertices, 0, 2)
      else attachment.computeWorldVertices(slot, 0, attachment.worldVerticesLength, vertices, 0, 2)
      for (let index = 0; index < vertices.length; index += 2) {
        const x = vertices[index]
        const y = vertices[index + 1]
        bounds = bounds
          ? { minX: Math.min(bounds.minX, x), minY: Math.min(bounds.minY, y), maxX: Math.max(bounds.maxX, x), maxY: Math.max(bounds.maxY, y) }
          : { minX: x, minY: y, maxX: x, maxY: y }
      }
    }
    return bounds
  }

  private fitToBounds(bounds: PreviewBounds | null) {
    if (!bounds) return this.transform.scale
    const width = Math.max(1, bounds.maxX - bounds.minX)
    const height = Math.max(1, bounds.maxY - bounds.minY)
    const scale = Math.min(1, Math.min((PREVIEW_SIZE - 48) / width, (PREVIEW_SIZE - 48) / height))
    this.transform.scale = scale
    this.transform.x = PREVIEW_SIZE / 2 - (bounds.minX + bounds.maxX) * scale / 2
    this.transform.y = PREVIEW_SIZE / 2 - (bounds.minY + bounds.maxY) * scale / 2
    return scale
  }

  private clear() {
    this.context.setTransform(1, 0, 0, 1, 0, 0)
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private stop() {
    cancelAnimationFrame(this.animationFrame)
    this.animationFrame = 0
  }

  private emptyMetadata(): PreviewMetadata {
    return { animations: [], skins: [], defaultAnimation: '', defaultSkin: '', zoomScale: this.transform.scale }
  }

  private async loadText(path: string) {
    const response = await fetch(path)
    if (!response.ok) throw Error(`Failed to load Spine atlas: ${path}`)
    return response.text()
  }

  private async loadSkeleton(path: string): Promise<any> {
    const response = await fetch(path)
    if (!response.ok) throw Error(`Failed to load Spine skeleton: ${path}`)
    return /\.skel(?:[?#]|$)/i.test(path) ? response.arrayBuffer() : response.json()
  }

  private loadImage(path: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(Error(`Failed to load Spine texture: ${path}`))
      image.src = path
    })
  }

  private resolveSiblingPath(path: string, sibling: string) {
    const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
    return slash >= 0 ? `${path.slice(0, slash + 1)}${sibling}` : sibling
  }
}

class AssetPreviewScene extends Scene {
  private readonly previewRoot = new Node('AssetPreviewRoot')
  private previewNode: Node | null = null
  private spineComponent: SpineSkeleton | null = null
  private dragonBonesComponent: DragonBones | null = null
  private previewVersion = 0
  private currentType: AnimationPreviewType | null = null
  private currentAnimation = ''

  constructor() {
    super('AssetPreviewScene')
    this.node.width = PREVIEW_SIZE
    this.node.height = PREVIEW_SIZE
    this.node.addChild(this.previewRoot)
    this.resetCamera()
  }

  setCanvasSize(width: number, height: number) {
    this.node.width = width
    this.node.height = height
    this.resetCamera()
  }

  clearPreview() {
    this.previewVersion += 1
    this.currentType = null
    this.currentAnimation = ''
    this.spineComponent = null
    this.dragonBonesComponent = null
    if (this.previewNode) {
      this.previewNode.destroy()
      this.previewNode = null
    }
    this.resetCamera()
  }

  async showPreview(type: AnimationPreviewType, value: SpinePreviewValue | DragonBonesPreviewValue): Promise<PreviewMetadata> {
    const version = ++this.previewVersion
    this.currentType = type
    this.currentAnimation = ''
    this.spineComponent = null
    this.dragonBonesComponent = null
    if (this.previewNode) {
      this.previewNode.destroy()
      this.previewNode = null
    }

    const previewNode = new Node('AssetPreviewContent')
    previewNode.x = 0
    previewNode.y = 0
    this.previewNode = previewNode
    this.previewRoot.addChild(previewNode)
    this.resetCamera()

    if (type === 'spine') {
      const component = previewNode.addComponent(new SpineSkeleton({ data: value as SpinePreviewValue, loop: true }))
      this.spineComponent = component
      this.startPreviewNode(previewNode)
      const skeleton = await this.waitFor(() => component.skeleton, version)
      if (!skeleton || version !== this.previewVersion) return this.emptyMetadata()

      const animations = skeleton.data?.animations?.map((item) => item.name).filter(Boolean) ?? []
      const skins = skeleton.data?.skins?.map((item) => item.name).filter(Boolean) ?? []
      const defaultSkin = skins[0] ?? ''
      const defaultAnimation = animations[0] ?? ''

      if (defaultSkin) {
        skeleton.setSkinByName(defaultSkin)
        skeleton.setToSetupPose()
      }
      if (defaultAnimation) {
        this.currentAnimation = defaultAnimation
        component.play(defaultAnimation, true)
      }

      this.syncSpinePose()
      const zoomScale = this.fitPreviewToBounds(this.measureSpineBounds())

      return { animations, skins, defaultAnimation, defaultSkin, zoomScale }
    }

    const component = previewNode.addComponent(new DragonBones({ data: value as DragonBonesPreviewValue, playTimes: 0 }))
    this.dragonBonesComponent = component
    this.startPreviewNode(previewNode)
    const armature = await this.waitFor(() => (component as any).armature, version)
    if (!armature || version !== this.previewVersion) return this.emptyMetadata()

    const animations = Array.isArray(armature.animation?.animationNames) ? [...armature.animation.animationNames] : []
    const defaultAnimation = animations[0] ?? ''
    if (defaultAnimation) {
      this.currentAnimation = defaultAnimation
      component.play(defaultAnimation, 0)
    }

    this.syncDragonBonesPose()
    const zoomScale = this.fitPreviewToBounds(this.measureDragonBonesBounds())

    return { animations, skins: [], defaultAnimation, defaultSkin: '', zoomScale }
  }

  playAnimation(name: string) {
    this.currentAnimation = name
    if (!name) return
    if (this.currentType === 'spine') {
      this.spineComponent?.play(name, true)
      this.syncSpinePose()
      this.fitPreviewToBounds(this.measureSpineBounds())
      return
    }
    this.dragonBonesComponent?.play(name, 0)
    this.syncDragonBonesPose()
    this.fitPreviewToBounds(this.measureDragonBonesBounds())
  }

  setSkin(name: string) {
    if (!name || !this.spineComponent?.skeleton) return
    this.spineComponent.skeleton.setSkinByName(name)
    this.spineComponent.skeleton.setToSetupPose()
    if (this.currentAnimation) this.spineComponent.play(this.currentAnimation, true)
    this.syncSpinePose()
    this.fitPreviewToBounds(this.measureSpineBounds())
  }

  getTransformNode() {
    return this.previewRoot
  }

  getZoomScale() {
    return this.previewRoot.scaleX || 1
  }

  private emptyMetadata(): PreviewMetadata {
    return { animations: [], skins: [], defaultAnimation: '', defaultSkin: '', zoomScale: this.getZoomScale() }
  }

  private resetCamera() {
    this.previewRoot.x = this.node.width * 0.5
    this.previewRoot.y = this.node.height * 0.5
    this.previewRoot.scale = 1
  }

  private startPreviewNode(node: Node) {
    if ((this as any)._started) {
      ;(node as any)._startTree()
    }
  }

  private fitPreviewToBounds(bounds: PreviewBounds | null) {
    if (!bounds) {
      this.resetCamera()
      return this.getZoomScale()
    }

    const width = Math.max(1, bounds.maxX - bounds.minX)
    const height = Math.max(1, bounds.maxY - bounds.minY)
    const padding = 24
    const availableWidth = Math.max(1, this.node.width - padding * 2)
    const availableHeight = Math.max(1, this.node.height - padding * 2)
    const scale = Math.min(1, Math.min(availableWidth / width, availableHeight / height))
    const centerX = (bounds.minX + bounds.maxX) * 0.5
    const centerY = (bounds.minY + bounds.maxY) * 0.5

    this.previewRoot.scale = scale
    this.previewRoot.x = this.node.width * 0.5 - centerX * scale
    this.previewRoot.y = this.node.height * 0.5 - centerY * scale

    return scale
  }

  private syncSpinePose() {
    const skeleton = this.spineComponent?.skeleton
    const state = (this.spineComponent as any)?.state
    if (!skeleton || !state) return
    state.apply(skeleton)
    skeleton.updateWorldTransform(Physics.update)
  }

  private syncDragonBonesPose() {
    const armature = (this.dragonBonesComponent as any)?.armature
    if (!armature) return
    armature.invalidUpdate?.(null, true)
    armature.advanceTime?.(0)
  }

  private measureSpineBounds() {
    const skeleton = this.spineComponent?.skeleton
    if (!skeleton) return null

    let bounds: PreviewBounds | null = null

    for (const slot of skeleton.drawOrder ?? []) {
      const attachment = slot.getAttachment()
      if (!slot.bone?.active || !attachment) continue

      if (attachment instanceof RegionAttachment) {
        const vertices = new Float32Array(8)
        attachment.computeWorldVertices(slot, vertices, 0, 2)
        bounds = this.extendBounds(bounds, vertices)
        continue
      }

      if (attachment instanceof MeshAttachment) {
        const vertices = new Float32Array(attachment.worldVerticesLength)
        attachment.computeWorldVertices(slot, 0, attachment.worldVerticesLength, vertices, 0, 2)
        bounds = this.extendBounds(bounds, vertices)
      }
    }

    return bounds
  }

  private measureDragonBonesBounds() {
    const armature = (this.dragonBonesComponent as any)?.armature
    if (!armature) return null

    let bounds: PreviewBounds | null = null

    for (const slot of armature.getSlots?.() ?? []) {
      if (!(slot instanceof SdlSlot)) continue

      const display = (slot as any).currentDisplay?.()
      const textureData = display?.textureData
      if (!display?.visible || !textureData) continue

      if (display.meshVertices?.length) {
        bounds = this.extendDragonBonesMeshBounds(bounds, display.meshVertices, display.meshInArmatureSpace ? null : display.matrix)
        continue
      }

      if (!display.matrix) continue

      const region = textureData.region
      const localLeft = -display.pivotX
      const localTop = -display.pivotY
      const localRight = localLeft + (textureData.rotated ? region.height : region.width)
      const localBottom = localTop + (textureData.rotated ? region.width : region.height)

      bounds = this.extendBoundsWithPoint(bounds, transformDragonBonesPoint(display.matrix, localLeft, localTop))
      bounds = this.extendBoundsWithPoint(bounds, transformDragonBonesPoint(display.matrix, localRight, localTop))
      bounds = this.extendBoundsWithPoint(bounds, transformDragonBonesPoint(display.matrix, localLeft, localBottom))
      bounds = this.extendBoundsWithPoint(bounds, transformDragonBonesPoint(display.matrix, localRight, localBottom))
    }

    return bounds
  }

  private extendDragonBonesMeshBounds(bounds: PreviewBounds | null, vertices: Float32Array, matrix: any) {
    let nextBounds = bounds
    for (let i = 0; i < vertices.length; i += 2) {
      const x = vertices[i]
      const y = vertices[i + 1]
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      nextBounds = this.extendBoundsWithPoint(nextBounds, matrix ? transformDragonBonesPoint(matrix, x, y) : { x, y })
    }
    return nextBounds
  }

  private extendBounds(bounds: PreviewBounds | null, vertices: Float32Array) {
    let nextBounds = bounds
    for (let i = 0; i < vertices.length; i += 2) {
      const x = vertices[i]
      const y = vertices[i + 1]
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      nextBounds = this.extendBoundsWithPoint(nextBounds, { x, y })
    }
    return nextBounds
  }

  private extendBoundsWithPoint(bounds: PreviewBounds | null, point: { x: number; y: number }) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return bounds
    if (!bounds) {
      return { minX: point.x, minY: point.y, maxX: point.x, maxY: point.y }
    }

    bounds.minX = Math.min(bounds.minX, point.x)
    bounds.minY = Math.min(bounds.minY, point.y)
    bounds.maxX = Math.max(bounds.maxX, point.x)
    bounds.maxY = Math.max(bounds.maxY, point.y)
    return bounds
  }

  private async waitFor<T>(getter: () => T | null | undefined, version: number, attempts = 240): Promise<T | null> {
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (version !== this.previewVersion) return null
      const value = getter()
      if (value) return value
      await new Promise((resolve) => setTimeout(resolve, 16))
    }
    return null
  }
}

let previewScene: AssetPreviewScene | null = null
let sdlEngineStarted = false

function ensurePreviewScene() {
  if (!sdlEngineStarted) {
    Engine.start('Safex SDL Asset Preview', PREVIEW_SIZE, PREVIEW_SIZE, 'overscan', PREVIEW_CANVAS_ID)
    sdlEngineStarted = true
  }
  if (!previewScene) {
    previewScene = loadScene(AssetPreviewScene) as AssetPreviewScene
  }
  previewScene.setCanvasSize(PREVIEW_SIZE, PREVIEW_SIZE)
  return previewScene
}

function AssetPreview() {
  const data = useSelector(selectPreviewAsset) || {}
  const hasPreview = Boolean(data.type)

  const { key, name, texture, type = '', value, size = {}, json } = data
  const isAnimationType = isAnimationPreviewType(type)
  const isImagePreviewType = type === 'texture' || type === 'spriteFrame' || type === 'frame'
  const { width, height } = size
  const frameEntry = json?.frames?.[name]
  const frame = frameEntry?.frame || frameEntry || { x: 0, y: 0 }
  const frameInfo = parseRect(frame)
  const frameRotated = isRotatedFrame(frameEntry?.rotated) || isRotatedFrame(frame?.rotated)
  const frameWidth = frameRotated ? frameInfo.h : frameInfo.w
  const frameHeight = frameRotated ? frameInfo.w : frameInfo.h
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const spinePreviewRef = useRef<CanvasSpinePreview | null>(null)
  const sceneRef = useRef<AssetPreviewScene | null>(null)
  const imageViewportRef = useRef<HTMLDivElement | null>(null)
  const [sdlReady, setSdlReady] = useState(false)
  const [animationsList, setAnimations] = useState<string[]>([])
  const [skinsList, setSkins] = useState<string[]>([])
  const [selectedAnimation, setSelectedAnimation] = useState('')
  const [selectedSkin, setSelectedSkin] = useState('')
  const [canvasZoomPercent, setCanvasZoomPercent] = useState(100)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const nodeStartRef = useRef({ x: 0, y: 0 })
  const [imageScale, setImageScale] = useState(1)
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 })
  const [imageZoomPercent, setImageZoomPercent] = useState(100)
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  const imageDraggingRef = useRef(false)
  const imageDragMovedRef = useRef(false)
  const imageDragStartRef = useRef({ x: 0, y: 0 })
  const imageOffsetStartRef = useRef({ x: 0, y: 0 })
  const imageOffsetRef = useRef({ x: 0, y: 0 })

  imageOffsetRef.current = imageOffset

  const imageWidth = type === 'frame' ? frameWidth : width || imageNaturalSize.width
  const imageHeight = type === 'frame' ? frameHeight : height || imageNaturalSize.height

  useEffect(() => {
    if (!canvasRef.current) return
    if (type === 'spine') {
      if (!spinePreviewRef.current) spinePreviewRef.current = new CanvasSpinePreview(canvasRef.current)

      let cancelled = false
      setAnimations([])
      setSkins([])
      setSelectedAnimation('')
      setSelectedSkin('')

      if (!value) {
        spinePreviewRef.current.clearPreview()
        setCanvasZoomPercent(100)
        return
      }

      void spinePreviewRef.current.showPreview(value as SpinePreviewValue).then((metadata) => {
        if (cancelled) return
        setAnimations(metadata.animations)
        setSkins(metadata.skins)
        setSelectedAnimation(metadata.defaultAnimation)
        setSelectedSkin(metadata.defaultSkin)
        setCanvasZoomPercent(round(metadata.zoomScale * 100, 1))
      }).catch((error) => console.error('Spine preview failed', error))

      return () => {
        cancelled = true
        spinePreviewRef.current?.clearPreview()
      }
    }

    if (type !== 'dragonBones') return

    if (!sceneRef.current) {
      sceneRef.current = ensurePreviewScene()
      if (!sdlReady) setSdlReady(true)
      return
    }
    if (!sdlReady) return

    let cancelled = false
    setAnimations([])
    setSkins([])
    setSelectedAnimation('')
    setSelectedSkin('')

    if (!value) {
      sceneRef.current.clearPreview()
      setCanvasZoomPercent(100)
      return
    }

    void sceneRef.current.showPreview(type, value).then((metadata) => {
      if (cancelled) return
      setAnimations(metadata.animations)
      setSkins(metadata.skins)
      setSelectedAnimation(metadata.defaultAnimation)
      setSelectedSkin(metadata.defaultSkin)
      setCanvasZoomPercent(round(metadata.zoomScale * 100, 1))
    })

    return () => {
      cancelled = true
    }
  }, [key, type, value, canvasRef.current, sdlReady])

  useEffect(() => {
    if (!isImagePreviewType) return
    const contentWidth = imageWidth
    const contentHeight = imageHeight
    if (!contentWidth || !contentHeight) {
      setImageScale(1)
      setImageOffset({ x: 0, y: 0 })
      setImageZoomPercent(100)
      return
    }

    const padding = 24
    const fitScale = Math.min(1, Math.min((PREVIEW_SIZE - padding * 2) / contentWidth, (PREVIEW_SIZE - padding * 2) / contentHeight))
    setImageScale(fitScale)
    setImageOffset({
      x: (PREVIEW_SIZE - contentWidth * fitScale) * 0.5,
      y: (PREVIEW_SIZE - contentHeight * fitScale) * 0.5,
    })
    setImageZoomPercent(round(fitScale * 100, 1))
  }, [imageHeight, imageWidth, isImagePreviewType, key])

  useEffect(() => {
    setImageNaturalSize({ width: 0, height: 0 })
  }, [key, value])

  useEffect(() => {
    const canvas = canvasRef.current
    const scene = sceneRef.current
    const spinePreview = spinePreviewRef.current
    if (!canvas || !isAnimationPreviewType(type) || (type === 'spine' ? !spinePreview : !scene)) return

    function getNode() {
      if (type === 'spine') return spinePreview!.transform
      const node = scene!.getTransformNode()
      return { x: node.x || 0, y: node.y || 0, scale: node.scaleX || 1, setScale: (value: number) => { node.scale = value }, setPosition: (x: number, y: number) => { node.x = x; node.y = y } }
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      const node = getNode()
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const oldScale = node.scale
      const factor = e.deltaY < 0 ? 1.12 : 0.88
      const newScale = Math.max(0.1, Math.min(5, oldScale * factor))
      const worldX = (px - node.x) / oldScale
      const worldY = (py - node.y) / oldScale
      node.scale = newScale
      node.setScale?.(newScale)
      node.x = px - worldX * newScale
      node.y = py - worldY * newScale
      node.setPosition?.(node.x, node.y)
      setCanvasZoomPercent(round(newScale * 100, 1))
    }

    function onPointerDown(e: PointerEvent) {
      const node = getNode()
      isDraggingRef.current = true
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      nodeStartRef.current = { x: node.x, y: node.y }
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId)
    }

    function onPointerMove(e: PointerEvent) {
      if (!isDraggingRef.current) return
      const node = getNode()
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      node.x = nodeStartRef.current.x + dx * 3
      node.y = nodeStartRef.current.y + dy * 3
      node.setPosition?.(node.x, node.y)
    }

    function onPointerUp(e: PointerEvent) {
      isDraggingRef.current = false
      if (canvas.releasePointerCapture) canvas.releasePointerCapture(e.pointerId)
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      canvas.removeEventListener('wheel', handleWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [type])

  useEffect(() => {
    const viewport = imageViewportRef.current
    if (!viewport || !isImagePreviewType) return

    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = viewport.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.12 : 0.88

      setImageScale((currentScale) => {
        const newScale = Math.max(0.25, Math.min(8, currentScale * factor))
        if (newScale === currentScale) return currentScale

        setImageOffset((currentOffset) => {
          const localX = (px - currentOffset.x) / currentScale
          const localY = (py - currentOffset.y) / currentScale

          return {
            x: px - localX * newScale,
            y: py - localY * newScale,
          }
        })

        setImageZoomPercent(round(newScale * 100, 1))
        return newScale
      })
    }

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return
      imageDraggingRef.current = true
      imageDragMovedRef.current = false
      imageDragStartRef.current = { x: e.clientX, y: e.clientY }
      imageOffsetStartRef.current = imageOffsetRef.current
      if (viewport.setPointerCapture) viewport.setPointerCapture(e.pointerId)
    }

    function onPointerMove(e: PointerEvent) {
      if (!imageDraggingRef.current) return
      const dx = e.clientX - imageDragStartRef.current.x
      const dy = e.clientY - imageDragStartRef.current.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        imageDragMovedRef.current = true
      }
      setImageOffset({
        x: imageOffsetStartRef.current.x + dx,
        y: imageOffsetStartRef.current.y + dy,
      })
    }

    function onPointerUp(e: PointerEvent) {
      if (!imageDraggingRef.current) return
      imageDraggingRef.current = false
      if (viewport.releasePointerCapture) viewport.releasePointerCapture(e.pointerId)
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    viewport.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      viewport.removeEventListener('wheel', handleWheel)
      viewport.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [isImagePreviewType])

  function onSelectAnimation(name: string) {
    setSelectedAnimation(name)
    if (type === 'spine') {
      spinePreviewRef.current?.playAnimation(name)
      setCanvasZoomPercent(round((spinePreviewRef.current?.getZoomScale() || 1) * 100, 1))
      return
    }
    sceneRef.current?.playAnimation(name)
    setCanvasZoomPercent(round((sceneRef.current?.getZoomScale() || 1) * 100, 1))
  }

  function onSelectSkin(name: string) {
    setSelectedSkin(name)
    if (type === 'spine') {
      spinePreviewRef.current?.setSkin(name)
      setCanvasZoomPercent(round((spinePreviewRef.current?.getZoomScale() || 1) * 100, 1))
      return
    }
    sceneRef.current?.setSkin(name)
    setCanvasZoomPercent(round((sceneRef.current?.getZoomScale() || 1) * 100, 1))
  }

  if (!hasPreview) return null

  return (
    <div className="flex h-[320px] w-full shrink-0 flex-col items-center justify-center overflow-hidden border-t">
      <div style={{ display: isAnimationType ? 'block' : 'none' }}>
        <div>
          <div className="flex flex-nowrap items-center gap-1">
            <div className="text-blue-100 my-auto text-sm">Anim</div>
            <SelectBox items={animationsList} selected={selectedAnimation} setSelected={onSelectAnimation} />
            <div className="text-blue-100 my-auto text-sm">Skin</div>
            <SelectBox items={skinsList} selected={selectedSkin} setSelected={onSelectSkin} />
          </div>
          <div className="flex justify-center overflow-hidden">
            <div className="relative inline-block">
              <canvas
                className="block max-w-full"
                id={PREVIEW_CANVAS_ID}
                ref={canvasRef}
                width={PREVIEW_SIZE}
                height={PREVIEW_SIZE}
                style={{ width: `${PREVIEW_SIZE}px`, height: `${PREVIEW_SIZE}px` }}
              />
              <div className="pointer-events-none absolute right-2 top-2 rounded bg-slate-950/70 px-2 py-1 text-xs text-sky-100">
                {canvasZoomPercent}%
              </div>
            </div>
          </div>
        </div>
      </div>
      {isImagePreviewType && (
        <div className="flex w-full justify-center">
          <div
            ref={imageViewportRef}
            className="relative inline-block overflow-hidden shadow-md select-none touch-none"
            style={{ width: `${PREVIEW_SIZE}px`, height: `${PREVIEW_SIZE}px` }}
          >
            <div className="pointer-events-none absolute z-10 rounded bg-slate-950/70 px-2 py-1 text-xs text-sky-100">
              {type === 'frame' ? `${frameWidth}x${frameHeight}` : `${imageWidth}x${imageHeight}`}
            </div>
            <div className="pointer-events-none absolute right-0 z-10 rounded bg-slate-950/70 px-2 py-1 text-xs text-sky-100">
              {imageZoomPercent}%
            </div>
            <div
              className="absolute left-0 top-0"
              style={{
                transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageScale})`,
                transformOrigin: '0 0',
              }}
            >
              {type === 'frame' ? (
                <Sprite src={texture} rect={frameInfo} naturalSize={parseSizeString(data.json?.meta?.size || data.json?.metadata?.size)} rotated={frameRotated} />
              ) : (
                <img
                  src={value}
                  alt="preview"
                  className="block max-h-[300px] max-w-[300px]"
                  draggable={false}
                  style={{ width: imageWidth || undefined, height: imageHeight || undefined }}
                  onLoad={(event) => {
                    const { naturalWidth, naturalHeight } = event.currentTarget
                    setImageNaturalSize({ width: naturalWidth, height: naturalHeight })
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {type === 'frame' && (
        <div className="my-auto">
          <div className="block text-lime-100 text-sm">
            {frameWidth}x{frameHeight}
          </div>
        </div>
      )}
    </div>
  )
}

export default AssetPreview
