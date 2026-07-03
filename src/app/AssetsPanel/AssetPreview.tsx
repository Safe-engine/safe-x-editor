import { MeshAttachment, Physics, RegionAttachment } from '@esotericsoftware/spine-core'
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

const PREVIEW_CANVAS_ID = 'sdl-canvas'
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

function parseRect(value = '') {
  const [x = 0, y = 0, w = 0, h = 0] = parseNumbers(value)
  return { x, y, w, h }
}

function parseSizeString(value = '') {
  const [w = 0, h = 0] = parseNumbers(value)
  return { w, h }
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
    Engine.start('Safex SDL Asset Preview', PREVIEW_SIZE, PREVIEW_SIZE)
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
  const frame = json?.frames?.[name]?.frame || { x: 0, y: 0 }
  const frameInfo = frame.x !== undefined ? frame : parseRect(frame)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
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
  const imageDraggingRef = useRef(false)
  const imageDragMovedRef = useRef(false)
  const imageDragStartRef = useRef({ x: 0, y: 0 })
  const imageOffsetStartRef = useRef({ x: 0, y: 0 })
  const imageOffsetRef = useRef({ x: 0, y: 0 })

  imageOffsetRef.current = imageOffset

  useEffect(() => {
    if (!canvasRef.current) return
    sceneRef.current = ensurePreviewScene()
    setSdlReady(true)
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !sdlReady) return

    let cancelled = false
    setAnimations([])
    setSkins([])
    setSelectedAnimation('')
    setSelectedSkin('')

    if (!isAnimationPreviewType(type) || !value) {
      scene.clearPreview()
      setCanvasZoomPercent(100)
      return
    }

    void scene.showPreview(type, value).then((metadata) => {
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
  }, [key, sdlReady, type, value])

  useEffect(() => {
    if (!isImagePreviewType) return
    const contentWidth = type === 'frame' ? frameInfo.w : width
    const contentHeight = type === 'frame' ? frameInfo.h : height
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
  }, [frameInfo.h, frameInfo.w, height, isImagePreviewType, key, type, width])

  useEffect(() => {
    const canvas = canvasRef.current
    const scene = sceneRef.current
    if (!canvas || !scene || !isAnimationPreviewType(type)) return

    function getNode() {
      return scene.getTransformNode()
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      const node = getNode()
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const oldScale = node.scaleX || 1
      const factor = e.deltaY < 0 ? 1.12 : 0.88
      const newScale = Math.max(0.1, Math.min(5, oldScale * factor))
      const worldX = (px - node.x) / oldScale
      const worldY = (py - node.y) / oldScale
      node.scale = newScale
      node.x = px - worldX * newScale
      node.y = py - worldY * newScale
      setCanvasZoomPercent(round(newScale * 100, 1))
    }

    function onPointerDown(e: PointerEvent) {
      const node = getNode()
      isDraggingRef.current = true
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      nodeStartRef.current = { x: node.x || 0, y: node.y || 0 }
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId)
    }

    function onPointerMove(e: PointerEvent) {
      if (!isDraggingRef.current) return
      const node = getNode()
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      node.x = nodeStartRef.current.x + dx * 3
      node.y = nodeStartRef.current.y + dy * 3
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
    sceneRef.current?.playAnimation(name)
    setCanvasZoomPercent(round((sceneRef.current?.getZoomScale() || 1) * 100, 1))
  }

  function onSelectSkin(name: string) {
    setSelectedSkin(name)
    sceneRef.current?.setSkin(name)
    setCanvasZoomPercent(round((sceneRef.current?.getZoomScale() || 1) * 100, 1))
  }

  if (!hasPreview) return null

  return (
    <div className="w-full h-1/3 border-t shrink-0 overflow-hidden">
      <div style={{ display: isAnimationType ? 'block' : 'none' }}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-blue-100 my-auto text-sm">Anim</div>
            <SelectBox items={animationsList} selected={selectedAnimation} setSelected={onSelectAnimation} />
            <div className="text-blue-100 my-auto text-sm">Skin</div>
            <SelectBox items={skinsList} selected={selectedSkin} setSelected={onSelectSkin} />
          </div>
          <div className="overflow-hidden">
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
        <div className="my-auto">
          <div
            ref={imageViewportRef}
            className="relative inline-block overflow-hidden shadow-md select-none touch-none"
            style={{ width: `${PREVIEW_SIZE}px`, height: `${PREVIEW_SIZE}px` }}
          >
            <div className="pointer-events-none absolute z-10 rounded bg-slate-950/70 px-2 py-1 text-xs text-sky-100">
              {type === 'frame' ? `${frameInfo.w}x${frameInfo.h}` : name}
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
                <Sprite src={texture} rect={frameInfo} naturalSize={data.json.meta?.size || parseSizeString(data.json.metadata.size)} />
              ) : (
                <img src={value} alt="preview" className="block max-h-[300px] max-w-[300px]" draggable={false} style={{ width, height }} />
              )}
            </div>
          </div>
        </div>
      )}
      {type === 'frame' && (
        <div className="my-auto">
          <div className="block text-lime-100 text-sm">
            {frameInfo.w}x{frameInfo.h}
          </div>
        </div>
      )}
    </div>
  )
}

export default AssetPreview
