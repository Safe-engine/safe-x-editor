import {
  color,
  Color4B,
  EventListener,
  eventManager,
  getWinSize,
  GraphicsRender,
  GUISystem,
  instantiate,
  LabelComp,
  loadAll,
  loader,
  log,
  NodeComp,
  NodeRender,
  registerSystem,
  SceneComponent,
  spriteFrameCache,
  SpriteRender,
  Touch,
  TouchEventRegister,
  Vec2,
} from '@safe-engine/webgl'
import { first, parseInt, set } from 'lodash-es'
import { GlobalState } from '../../data/GloablState'
import { sendRequest } from '../app.ipc'

import { getLastRootFolder, getLastSceneScale, setLastSceneScale, setLastSceneX, setLastSceneY } from '../../data/AppData'
import { arrow } from './assets'
import { loadSceneViewCocos } from './loader'
import { getCurrentNode, KEY } from './utils'

function getComponentChildrenNum(tag: string) {
  const component = GlobalState.data.componentsCache[tag]
  return Array.isArray(component) ? component.length : (component?.children?.length ?? 0)
}

function getEditingRoot(editingComponent: any, indexes: number[]) {
  const isSceneNode = first<any>(editingComponent)?.tag === 'SceneComponent'
  if (isSceneNode) {
    indexes.shift()
    return first(editingComponent)
  }
  return editingComponent[indexes.shift() ?? 0] ?? first(editingComponent)
}

export class PreviewScene extends SceneComponent {
  static readonly ARROW_HIT_RADIUS = 32
  static readonly SELECTION_ANCHOR_SIZE = 16
  static readonly RESIZE_EDGE_HIT_SIZE = 8
  static readonly RESIZE_CORNER_SIZE = 12
  static readonly ROTATION_HANDLE_SIZE = 14
  static readonly ROTATION_HANDLE_OFFSET = 30

  arrowContainerNode: NodeComp
  arrowSpriteHorizonNode: NodeComp
  arrowSpriteVerticalNode: NodeComp
  selectionBorderNode: NodeComp
  selectionAnchorNode: NodeComp
  selectionCornerNodes: NodeComp[]
  rotationHandleNode: NodeComp
  questionContainerNode: NodeComp
  drawNode: NodeComp
  borderNode: NodeComp
  isEditing = false
  isMiddleMouse = false
  shiftKey = false
  ctrlKey = false
  lockX = false
  lockY = false
  editingPaths = []
  editingComponent: any[]
  activeArrowAxis?: 'x' | 'y' | 'move' | 'anchor'
  activeResizeEdge?: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  isRotating = false
  rotationDragStart?: { angle: number; rotation: number }

  async start() {
    // Register early — don't miss initial messages from SceneView
    this.messageHandler()
    await this.loadProjectData()
    // console.log(`Running on platform: ${sys.platform}`, sys.DESKTOP_BROWSER, sys.MOBILE_BROWSER)
    this.createBorder()
    this.drawNode = instantiate(NodeRender).node
    this.node.addChild(this.drawNode)
    this.createArrows()
    this.createSaveDialog()
    this.showFullHeight()
    this.keyboardHandler()
    this.mouseHandler()
    // Load path queued while data was loading
    if (GlobalState.tempFilePath && GlobalState.tempFilePath !== GlobalState.filePath) {
      this.loadComponent(GlobalState.tempFilePath)
    }
    // this.loadComponent('/Users/antn/Documents/axmol/hero-dash/src/components/common/BottomMenu.tsx')
  }

  showFullHeight() {
    const { designedResolution } = GlobalState.data
    const { height: designHeight, width: designWidth } = designedResolution
    const winSize = getWinSize()
    if (!designHeight || !winSize.height) return
    const scale = winSize.height / designHeight
    const x = (winSize.width - designWidth * scale) / 2
    setLastSceneScale(scale)
    setLastSceneX(x)
    setLastSceneY(0)
    this.drawNode.position = this.borderNode.position = Vec2(x, 0)
    this.drawNode.scale = this.borderNode.scale = scale
    this.updateArrowPosition()
  }

  keyboardHandler() {
    eventManager.addListener(
      {
        event: EventListener.KEYBOARD,
        // Khi nhấn phím
        onKeyPressed: async (keyCode) => {
          console.log(`Key pressed: ${keyCode}`)
          if (keyCode === KEY.shift) {
            this.shiftKey = true
            // this.changeSelectPath('0-2')
          }
          if (keyCode === KEY.dash) {
            this.setRootScale(-0.05)
          } else if (keyCode === KEY.equal) {
            this.setRootScale(0.05)
          } else if (keyCode === KEY.x) {
            this.lockX = !this.lockX
            this.arrowSpriteHorizonNode.opacity = this.lockX ? 100 : 255
          } else if (keyCode === KEY.y) {
            this.lockY = !this.lockY
            this.arrowSpriteVerticalNode.opacity = this.lockY ? 100 : 255
          } else if (keyCode === KEY.h) {
            this.toggleSelectedNode()
          } else if (keyCode === KEY.c) {
            this.selectAllChildren()
          }
          if (keyCode === KEY.ctrl || keyCode === KEY.command) {
            this.ctrlKey = true
          }
          if (this.ctrlKey) {
            if (keyCode === KEY.s) {
              this.saveComponent()
            } else if (keyCode === KEY.r) {
              this.showFullHeight()
              this.loadComponent(GlobalState.filePath)
            } else if (keyCode === KEY.a) {
              await this.loadProjectData()
              this.loadComponent(GlobalState.filePath)
            }
          }
          if (keyCode === KEY.up && this.shiftKey) {
            this.moveSelectedNode(0, 10)
          } else if (keyCode === KEY.down && this.shiftKey) {
            this.moveSelectedNode(0, -10)
          } else if (keyCode === KEY.left && this.shiftKey) {
            this.moveSelectedNode(-10, 0)
          } else if (keyCode === KEY.right && this.shiftKey) {
            this.moveSelectedNode(10, 0)
          } else if (keyCode === KEY.up) {
            this.moveSelectedNode(0, 1)
          } else if (keyCode === KEY.down) {
            this.moveSelectedNode(0, -1)
          } else if (keyCode === KEY.left) {
            this.moveSelectedNode(-1, 0)
          } else if (keyCode === KEY.right) {
            this.moveSelectedNode(1, 0)
          }
        },
        // Khi nhả phím
        onKeyReleased: (keyCode) => {
          if (keyCode === KEY.shift || keyCode === KEY.shiftR) {
            this.shiftKey = false
          }
          if (keyCode === KEY.ctrl || keyCode === KEY.command || keyCode === KEY.commandR || keyCode === KEY.ctrlR) {
            this.ctrlKey = false
          }
        },
      },
      this.node.instance,
    )
  }

  mouseHandler() {
    const canvas = document.querySelector<HTMLCanvasElement>('#gameCanvas')
    if (!canvas) return
    canvas.addEventListener(
      'wheel',
      (event) => {
        this.setRootScale(event.deltaY > 0 ? -0.05 : 0.05)
        event.preventDefault()
      },
      { passive: false },
    )
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button === 1) {
        this.isMiddleMouse = true
      }
    })
    canvas.addEventListener('pointermove', (event) => {
      if (this.isMiddleMouse) {
        if (this.questionContainerNode.active) return
        const x = event.movementX
        const y = -event.movementY
        this.drawNode.posX += x
        this.drawNode.posY += y
        this.borderNode.position = this.drawNode.position
        setLastSceneX(this.drawNode.posX)
        setLastSceneY(this.drawNode.posY)
        this.updateArrowPosition()
      }
    })
    canvas.addEventListener('pointerup', () => {
      this.isMiddleMouse = false
    })
    canvas.addEventListener('pointercancel', () => {
      this.isMiddleMouse = false
    })
  }

  messageHandler() {
    const listener = (event) => {
      const message = event.data
      // Guard: scene nodes not ready yet — messageHandler called before start() completes
      if (!this.drawNode || !this.questionContainerNode) {
        // Store pending path; start() will pick it up
        if (message.type === 'changeFilePath') {
          GlobalState.tempFilePath = message.filePath
        }
        return
      }
      // console.log('message', message)
      this.questionContainerNode.scale = this.drawNode.scale
      if (message.type === 'reLoad') {
        if (this.isEditing) this.questionContainerNode.active = true
        else this.loadComponent(GlobalState.filePath)
      } else if (message.type === 'changeFilePath') {
        GlobalState.tempFilePath = message.filePath
        if (this.isEditing) this.questionContainerNode.active = true
        else this.loadComponent(GlobalState.tempFilePath)
      } else if (message.type === 'changeSelectPath') {
        this.changeSelectPath(message.selectPaths)
      }
    }
    window.addEventListener('message', listener)
  }

  async loadProjectData() {
    const rootProject = getLastRootFolder()
    if (!rootProject) return
    const data: any = await sendRequest({
      key: 'GET_FOLDER_FILES',
      src: rootProject,
    })
    console.log('start data', data)
    const { assets, ...rest } = data
    GlobalState.data = { ...assets, ...rest }
    const { spriteSheetAssets = [], fontAssets = [] } = assets
    spriteSheetAssets.forEach((spriteSheet) => {
      loader.load([spriteSheet.value, spriteSheet.texture], function (err) {
        if (err) {
          log('Failed to load file:', spriteSheet, err)
          return
        }
        spriteFrameCache.addSpriteFrames(spriteSheet.value, spriteSheet.texture)
      })
    })
    const defaultFontKey = 'REPLACE_WITH_DEFAULT_FONT_PATH'
    const defaultFont = fontAssets.find((font) => font.key === defaultFontKey)?.value
    // console.log('defaultFont', defaultFontKey, fontAssets, defaultFont)
    if (defaultFont) {
      await loadAll([defaultFont])
      GUISystem.defaultFont = defaultFont
    }
  }

  setRootScale(offset: number) {
    const scale = getLastSceneScale()
    let value = scale + offset
    if (value < 0.1) value = 0.1
    if (value > 2) value = 2
    setLastSceneScale(value)
    this.borderNode.scale = this.drawNode.scale = value
    this.updateArrowPosition()
  }

  createBorder() {
    const border = instantiate(GraphicsRender, { strokeColor: color(227, 11, 93, 255), lineWidth: 5 })
    this.borderNode = border.node
    const { designedResolution } = GlobalState.data
    const { width, height } = designedResolution
    border.drawRect(Vec2(), Vec2(width, height))
    this.node.addChild(border.node)
  }

  updateArrowOpacity() {
    const isHorizontalDimmed = this.lockX || this.activeArrowAxis === 'y'
    const isVerticalDimmed = this.lockY || this.activeArrowAxis === 'x'
    this.arrowSpriteHorizonNode.opacity = isHorizontalDimmed ? 100 : 255
    this.arrowSpriteVerticalNode.opacity = isVerticalDimmed ? 100 : 255
  }

  createArrows() {
    const arrowContainer = instantiate(NodeRender)
    const arrowSpriteHorizon = instantiate(SpriteRender, { spriteFrame: arrow })
    const arrowSpriteVertical = instantiate(SpriteRender, { spriteFrame: arrow })
    const selectionBorder = instantiate(GraphicsRender, { strokeColor: color(34, 197, 94, 255), lineWidth: 2 })
    const selectionAnchor = instantiate(NodeRender)
    const selectionCorners = []
    const rotationHandle = instantiate(NodeRender)

    this.arrowContainerNode = arrowContainer.node
    this.arrowSpriteHorizonNode = arrowSpriteHorizon.node
    this.arrowSpriteVerticalNode = arrowSpriteVertical.node
    this.selectionBorderNode = selectionBorder.node
    this.selectionAnchorNode = selectionAnchor.node
    this.selectionCornerNodes = selectionCorners
    this.rotationHandleNode = rotationHandle.node

    const ANCHOR_SIZE = PreviewScene.SELECTION_ANCHOR_SIZE
    selectionAnchor.node.w = ANCHOR_SIZE
    selectionAnchor.node.h = ANCHOR_SIZE
    const anchorBg = selectionAnchor.addComponent(
      instantiate(GraphicsRender, { fillColor: color(255, 255, 255, 255), strokeColor: color(34, 197, 94, 255), lineWidth: 2 }),
    )
    anchorBg.drawRect(Vec2(-ANCHOR_SIZE / 2, -ANCHOR_SIZE / 2), Vec2(ANCHOR_SIZE / 2, ANCHOR_SIZE / 2))

    const CORNER_SIZE = PreviewScene.RESIZE_CORNER_SIZE
    const cornerPositions = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    cornerPositions.forEach(([px, py]) => {
      const corner = instantiate(GraphicsRender, {
        fillColor: color(255, 255, 255, 255),
        strokeColor: color(34, 197, 94, 255),
        lineWidth: 2,
      })
      const half = CORNER_SIZE / 2
      corner.drawRect(
        Vec2(px ? -CORNER_SIZE : -half, py ? -CORNER_SIZE : -half),
        Vec2(px ? half : CORNER_SIZE, py ? half : CORNER_SIZE),
      )
      corner.node.zIndex = -1
      arrowContainer.node.addChild(corner.node)
      selectionCorners.push(corner.node)
    })

    const ROTATION_SIZE = PreviewScene.ROTATION_HANDLE_SIZE
    rotationHandle.node.w = ROTATION_SIZE
    rotationHandle.node.h = ROTATION_SIZE
    const rotGraphics = rotationHandle.addComponent(instantiate(GraphicsRender, { fillColor: color(34, 197, 94, 255) }))
    rotGraphics.drawSolidCircle(Vec2(0, 0), ROTATION_SIZE / 2, 0, 34, color(34, 197, 94, 255))
    rotGraphics.drawSolidCircle(Vec2(0, 0), Math.max(0, ROTATION_SIZE / 2 - 2), 0, 34, color(255, 255, 255, 255))
    rotGraphics.drawRect(Vec2(-ROTATION_SIZE / 2, -ROTATION_SIZE / 2), Vec2(ROTATION_SIZE / 2, ROTATION_SIZE / 2))
    rotationHandle.node.zIndex = -1

    arrowSpriteVertical.node.instance.setAnchorPoint(0.5, 0)
    arrowSpriteHorizon.node.instance.setAnchorPoint(0.5, 0)
    arrowSpriteVertical.node.color = color(255, 0, 0, 255)
    arrowSpriteVertical.node.posY = -40
    arrowSpriteHorizon.node.posX = 40
    arrowSpriteHorizon.node.rotation = 90

    selectionBorder.node.zIndex = -2
    selectionAnchor.node.zIndex = -1
    arrowContainer.node.zIndex = Infinity - 1
    arrowContainer.node.active = false

    arrowContainer.node.addChild(selectionBorder.node)
    arrowContainer.node.addChild(selectionAnchor.node)
    arrowContainer.node.addChild(rotationHandle.node)
    arrowContainer.node.addChild(arrowSpriteHorizon.node)
    arrowContainer.node.addChild(arrowSpriteVertical.node)
    this.node.addChild(arrowContainer.node)
    this.updateArrowOpacity()
  }

  async saveComponent() {
    if (!this.editingComponent || !this.editingComponent[0]) return
    const data: any = await sendRequest({
      key: 'GEN_COMPONENT_REQUEST',
      nodesData: this.editingComponent[0],
      filePath: GlobalState.filePath,
    })
    console.log('gen success', data)
    this.isEditing = false
  }

  createSaveDialog() {
    const questionContainer = instantiate(LabelComp, { string: 'Do you want to save or reload?' })
    const lbSave = instantiate(LabelComp, { string: 'Save' })
    const lbReload = instantiate(LabelComp, { string: 'Reload' })
    lbSave.addComponent(
      instantiate(TouchEventRegister, {
        onTouchStart: () => {
          this.saveComponent()
          this.loadComponent(GlobalState.tempFilePath)
        },
      }),
    )
    lbReload.addComponent(
      instantiate(TouchEventRegister, {
        onTouchStart: () => {
          this.loadComponent(GlobalState.tempFilePath)
        },
      }),
    )
    lbReload.node.instance.setPosition(150, -150)
    lbSave.node.instance.setPosition(550, -150)
    lbReload.node.color = color(255, 0, 0, 255)
    lbSave.node.color = color(255, 0, 0, 255)
    questionContainer.node.addChild(lbSave.node)
    questionContainer.node.addChild(lbReload.node)
    const { height, width } = getWinSize()
    const DIM_COLOR = Color4B(0, 0, 0, 150)
    const bgGraphics = instantiate(GraphicsRender, { fillColor: DIM_COLOR })
    bgGraphics.drawRect(Vec2(-2500, -2500), Vec2(5000, 5000))
    bgGraphics.node.addChild(questionContainer.node)
    this.questionContainerNode = bgGraphics.node
    this.questionContainerNode.position = Vec2(200, height / 2)
    this.questionContainerNode.active = false
    this.questionContainerNode.scale = 250 / width
    this.node.addChild(this.questionContainerNode)
  }

  async loadComponent(path: string) {
    if (!path) {
      return
    }
    const data: any = await sendRequest({
      key: 'LOAD_COMPONENT_REQUEST',
      path,
    })
    console.log('loadComponent', path, data)
    GlobalState.filePath = path
    this.editingComponent = Array.isArray(data.treeData) ? data.treeData : [data.treeData]
    this.drawNode.removeAllChildren()
    await loadSceneViewCocos(data, GlobalState.data, this.drawNode)
    this.questionContainerNode.active = false
    this.isEditing = false
    this.updateArrowPosition()
  }

  getChildrenIndex(editingPath) {
    const isSceneNode = first(this.editingComponent)?.tag === 'SceneComponent'
    const childrenIndex = editingPath.split('-').map(parseInt)
    if (isSceneNode) childrenIndex.shift()
    return childrenIndex
  }

  moveSelectedNode(mx: number, my: number) {
    if (!this.editingPaths[0]) {
      return
    }
    const updatedNodes: Array<{ component: string; updated: any }> = []
    this.editingPaths.forEach((editingPath) => {
      const childrenIndex = this.getChildrenIndex(editingPath)
      const currentNode = getCurrentNode(this.drawNode, childrenIndex)
      if (!this.lockX) currentNode.posX += mx
      if (!this.lockY) currentNode.posY += my
      const indexes = [...childrenIndex]
      // console.log('editingComponent', this.editingComponent, indexes)
      let editNode = getEditingRoot(this.editingComponent, indexes)
      indexes.forEach((index) => {
        const { tag } = editNode
        const componentChildrenNum = getComponentChildrenNum(tag)
        if (editNode.children[index - componentChildrenNum]) editNode = editNode.children[index - componentChildrenNum]
      })
      //
      set(editNode.props, 'node.xy', [Math.round(currentNode.posX), Math.round(currentNode.posY)])
      this.isEditing = true
      if (editNode) updatedNodes.push({ component: 'props', updated: editNode.props })
    })
    if (updatedNodes.length > 0) {
      window.postMessage({ type: 'previewUpdateSelectedNodes', selectPaths: this.editingPaths, nodes: updatedNodes }, '*')
    }
  }

  selectAllChildren() {
    if (!this.editingPaths[0]) {
      return
    }
    const allPaths = []
    this.editingPaths.forEach((editingPath) => {
      const childrenIndex = this.getChildrenIndex(editingPath)
      const currentNode = getCurrentNode(this.drawNode, childrenIndex)
      currentNode.children.forEach((child, index) => {
        const childPath = `${editingPath}-${index}`
        allPaths.push(childPath)
      })
    })
    this.editingPaths = allPaths
    this.updateArrowPosition()
  }

  toggleSelectedNode() {
    if (!this.editingPaths[0]) {
      return
    }
    this.editingPaths.forEach((editingPath) => {
      const childrenIndex = this.getChildrenIndex(editingPath)
      const currentNode = getCurrentNode(this.drawNode, childrenIndex)
      currentNode.active = !currentNode.active
      const indexes = [...childrenIndex]
      // console.log('editingComponent', this.editingComponent, indexes)
      let editNode = getEditingRoot(this.editingComponent, indexes)
      indexes.forEach((index) => {
        const { tag } = editNode
        const componentChildrenNum = getComponentChildrenNum(tag)
        if (editNode.children[index - componentChildrenNum]) editNode = editNode.children[index - componentChildrenNum]
      })
      const active = currentNode.active === false ? false : undefined
      set(editNode.props, 'node.active', active)
      this.isEditing = true
    })
  }

  changeSelectPath(paths: string[]) {
    console.log('changeSelectPath', paths)
    this.editingPaths = paths
    this.updateArrowPosition()
  }

  // --- Bounding box helpers ---

  getSelectionBounds(x1: number, y1: number, x2: number, y2: number) {
    return {
      left: Math.min(x1, x2),
      top: Math.min(y1, y2),
      right: Math.max(x1, x2),
      bottom: Math.max(y1, y2),
    }
  }

  getNodeBounds(node: NodeComp) {
    if (!node.active) return undefined
    const corners = this.getNodeWorldCorners(node)
    if (!corners) return undefined
    return corners.reduce(
      (bounds, corner) => this.getSelectionBounds(bounds.left, bounds.top, corner.x, corner.y),
      { left: corners[0].x, top: corners[0].y, right: corners[0].x, bottom: corners[0].y },
    )
  }

  getNodeWorldCorners(node: NodeComp) {
    const width = node.w || 0
    const height = node.h || 0
    if (!width && !height) return undefined
    const left = -node.anchorX * width
    const bottom = -node.anchorY * height
    const right = left + width
    const top = bottom + height
    return [
      node.convertToWorldSpaceAR(Vec2(left, bottom)),
      node.convertToWorldSpaceAR(Vec2(right, bottom)),
      node.convertToWorldSpaceAR(Vec2(right, top)),
      node.convertToWorldSpaceAR(Vec2(left, top)),
    ]
  }

  getCombinedBoundsFromPaths(paths: string[]) {
    let combinedBounds: { left: number; top: number; right: number; bottom: number } | undefined
    paths.forEach((path) => {
      const childrenIndex = this.getChildrenIndex(path)
      const currentNode = getCurrentNode(this.drawNode, childrenIndex)
      const nodeBounds = this.getNodeBounds(currentNode)
      if (!nodeBounds) return
      if (!combinedBounds) {
        combinedBounds = { ...nodeBounds }
        return
      }
      combinedBounds.left = Math.min(combinedBounds.left, nodeBounds.left)
      combinedBounds.top = Math.min(combinedBounds.top, nodeBounds.top)
      combinedBounds.right = Math.max(combinedBounds.right, nodeBounds.right)
      combinedBounds.bottom = Math.max(combinedBounds.bottom, nodeBounds.bottom)
    })
    return combinedBounds
  }

  updateArrowPosition() {
    if (!this.editingPaths[0]) {
      this.arrowContainerNode.active = false
      return
    }

    const graphics = this.selectionBorderNode.getComponent(GraphicsRender)

    // Multi-selection: show combined bounding box only
    if (this.editingPaths.length > 1) {
      this.selectionCornerNodes.forEach((corner) => (corner.active = false))
      this.rotationHandleNode.active = false
      const combinedBounds = this.getCombinedBoundsFromPaths(this.editingPaths)
      if (!combinedBounds) {
        this.arrowContainerNode.active = false
        return
      }
      this.arrowContainerNode.active = true
      const cx = (combinedBounds.left + combinedBounds.right) / 2
      const cy = (combinedBounds.top + combinedBounds.bottom) / 2
      this.arrowContainerNode.position = Vec2(cx, cy)
      // Update selection border size
      const bw = combinedBounds.right - combinedBounds.left
      const bh = combinedBounds.bottom - combinedBounds.top
      this.selectionBorderNode.w = bw
      this.selectionBorderNode.h = bh
      this.selectionBorderNode.anchorX = 0.5
      this.selectionBorderNode.anchorY = 0.5
      this.selectionBorderNode.scaleX = 1
      this.selectionBorderNode.scaleY = 1

      graphics?.clear()
      graphics?.drawRect(Vec2(-bw / 2, -bh / 2), Vec2(bw / 2, bh / 2))

      return
    }

    // Single selection
    const childrenIndex = this.getChildrenIndex(this.editingPaths[0])
    const currentNode = getCurrentNode(this.drawNode, childrenIndex)
    const worldPos = currentNode.convertToWorldSpaceAR(Vec2())
    const corners = this.getNodeWorldCorners(currentNode)
    if (!corners) {
      this.arrowContainerNode.active = false
      return
    }

    this.arrowContainerNode.active = true
    this.arrowContainerNode.position = Vec2(worldPos.x, worldPos.y)

    graphics?.clear()
    graphics?.drawPoly(corners.map((corner) => Vec2(corner.x - worldPos.x, corner.y - worldPos.y)))

    const bounds = this.getNodeBounds(currentNode)
    if (!bounds) return

    // Rotation handle: above the bounding box
    this.rotationHandleNode.active = true
    this.rotationHandleNode.position = Vec2(
      (bounds.left + bounds.right) / 2 - worldPos.x,
      bounds.top - worldPos.y - PreviewScene.ROTATION_HANDLE_OFFSET,
    )

    // Corner handles at the four corners
    this.selectionCornerNodes.forEach((corner, index) => {
      corner.active = true
      corner.position = Vec2(corners[index].x - worldPos.x, corners[index].y - worldPos.y)
    })
  }

  // --- Hit testing ---

  getActiveArrowAxis(touchX: number, touchY: number): 'x' | 'y' | 'anchor' | undefined {
    if (!this.arrowContainerNode.active) return undefined
    const cx = this.arrowContainerNode.posX
    const cy = this.arrowContainerNode.posY
    // Check anchor
    const anchorX = cx + (this.selectionAnchorNode?.posX ?? 0)
    const anchorY = cy + (this.selectionAnchorNode?.posY ?? 0)
    if (
      Math.abs(touchX - anchorX) <= PreviewScene.SELECTION_ANCHOR_SIZE / 2 &&
      Math.abs(touchY - anchorY) <= PreviewScene.SELECTION_ANCHOR_SIZE / 2
    ) {
      return 'anchor'
    }
    // Check horizontal arrow
    const hx = cx + this.arrowSpriteHorizonNode.posX
    const hy = cy + this.arrowSpriteHorizonNode.posY
    if (Math.abs(touchX - hx) <= PreviewScene.ARROW_HIT_RADIUS && Math.abs(touchY - hy) <= PreviewScene.ARROW_HIT_RADIUS) {
      return 'x'
    }
    // Check vertical arrow
    const vx = cx + this.arrowSpriteVerticalNode.posX
    const vy = cy + this.arrowSpriteVerticalNode.posY
    if (Math.abs(touchX - vx) <= PreviewScene.ARROW_HIT_RADIUS && Math.abs(touchY - vy) <= PreviewScene.ARROW_HIT_RADIUS) {
      return 'y'
    }
    return undefined
  }

  getActiveRotationHandle(touchX: number, touchY: number): boolean {
    if (this.editingPaths.length !== 1 || !this.rotationHandleNode.active) return false
    const cx = this.arrowContainerNode.posX + this.rotationHandleNode.posX
    const cy = this.arrowContainerNode.posY + this.rotationHandleNode.posY
    const radius = PreviewScene.ROTATION_HANDLE_SIZE / 2 + 4
    return Math.hypot(touchX - cx, touchY - cy) <= radius
  }

  getActiveResizeEdge(touchX: number, touchY: number): typeof this.activeResizeEdge {
    if (this.editingPaths.length !== 1) return undefined
    const childrenIndex = this.getChildrenIndex(this.editingPaths[0])
    const currentNode = getCurrentNode(this.drawNode, childrenIndex)
    const bounds = this.getNodeBounds(currentNode)
    if (!bounds) return undefined
    const hitSize = PreviewScene.RESIZE_EDGE_HIT_SIZE
    // Check corners first
    if (Math.abs(touchX - bounds.left) <= hitSize && Math.abs(touchY - bounds.top) <= hitSize) return 'top-left'
    if (Math.abs(touchX - bounds.right) <= hitSize && Math.abs(touchY - bounds.top) <= hitSize) return 'top-right'
    if (Math.abs(touchX - bounds.left) <= hitSize && Math.abs(touchY - bounds.bottom) <= hitSize) return 'bottom-left'
    if (Math.abs(touchX - bounds.right) <= hitSize && Math.abs(touchY - bounds.bottom) <= hitSize) return 'bottom-right'
    // Check edges
    if (touchY >= bounds.top - hitSize && touchY <= bounds.bottom + hitSize) {
      if (Math.abs(touchX - bounds.left) <= hitSize) return 'left'
      if (Math.abs(touchX - bounds.right) <= hitSize) return 'right'
    }
    if (touchX >= bounds.left - hitSize && touchX <= bounds.right + hitSize) {
      if (Math.abs(touchY - bounds.top) <= hitSize) return 'top'
      if (Math.abs(touchY - bounds.bottom) <= hitSize) return 'bottom'
    }
    return undefined
  }

  // --- Rotation ---

  getRotationAngle(node: NodeComp, x: number, y: number): number {
    const worldPos = node.parent ? node.parent.convertToWorldSpace(node.position) : node.position
    return (Math.atan2(y - worldPos.y, x - worldPos.x) * 180) / Math.PI
  }

  rotateSelectedNode(x: number, y: number): boolean {
    if (this.editingPaths.length !== 1 || !this.rotationDragStart) return false
    const childrenIndex = this.getChildrenIndex(this.editingPaths[0])
    const currentNode = getCurrentNode(this.drawNode, childrenIndex)
    const angle = this.getRotationAngle(currentNode, x, y)
    let angleDelta = angle - this.rotationDragStart.angle
    if (angleDelta > 180) angleDelta -= 360
    if (angleDelta < -180) angleDelta += 360
    const rotation = Math.round(this.rotationDragStart.rotation + angleDelta)
    if (rotation === currentNode.rotation) return false
    currentNode.rotation = rotation

    const indexes = [...childrenIndex]
    let editNode = getEditingRoot(this.editingComponent, indexes)
    indexes.forEach((index) => {
      const { tag } = editNode
      const componentChildrenNum = getComponentChildrenNum(tag)
      if (editNode.children[index - componentChildrenNum]) editNode = editNode.children[index - componentChildrenNum]
    })
    set(editNode.props, 'node.rotation', rotation)
    this.isEditing = true
    if (editNode) {
      window.postMessage({ type: 'previewUpdateSelectedNodes', selectPaths: this.editingPaths, nodes: [{ component: 'props', updated: editNode.props }] }, '*')
    }
    return true
  }

  // --- Resize ---

  resizeSelectedNode(handle: NonNullable<typeof this.activeResizeEdge>, dx: number, dy: number): boolean {
    if (this.editingPaths.length !== 1) return false
    const childrenIndex = this.getChildrenIndex(this.editingPaths[0])
    const currentNode = getCurrentNode(this.drawNode, childrenIndex)
    const nodeScaleX = currentNode.scaleX || 1
    const nodeScaleY = currentNode.scaleY || 1

    const horizontalEdge = handle.endsWith('left') ? 'left' : handle.endsWith('right') ? 'right' : undefined
    const verticalEdge = handle.startsWith('top') ? 'top' : handle.startsWith('bottom') ? 'bottom' : undefined

    const newWidth =
      horizontalEdge && !this.lockX
        ? Math.max(1, Math.round(currentNode.w + (horizontalEdge === 'right' ? dx : -dx) / nodeScaleX))
        : currentNode.w
    const newHeight =
      verticalEdge && !this.lockY
        ? Math.max(1, Math.round(currentNode.h + (verticalEdge === 'bottom' ? dy : -dy) / nodeScaleY))
        : currentNode.h

    const didResizeWidth = newWidth !== currentNode.w
    const didResizeHeight = newHeight !== currentNode.h
    if (!didResizeWidth && !didResizeHeight) return false

    if (didResizeWidth) currentNode.w = newWidth
    if (didResizeHeight) currentNode.h = newHeight

    const indexes = [...childrenIndex]
    let editNode = getEditingRoot(this.editingComponent, indexes)
    indexes.forEach((index) => {
      const { tag } = editNode
      const componentChildrenNum = getComponentChildrenNum(tag)
      if (editNode.children[index - componentChildrenNum]) editNode = editNode.children[index - componentChildrenNum]
    })
    if (editNode) {
      if (!editNode.props) editNode.props = {}
      if (!editNode.props.node) editNode.props.node = {}
      if (didResizeWidth) editNode.props.node.width = newWidth
      if (didResizeHeight) editNode.props.node.height = newHeight
      window.postMessage({ type: 'previewUpdateSelectedNodes', selectPaths: this.editingPaths, nodes: [{ component: 'props', updated: editNode.props }] }, '*')
    }
    this.isEditing = true
    return true
  }

  // --- Anchor drag ---

  moveSelectionAnchor(dx: number, dy: number): boolean {
    if (this.editingPaths.length !== 1) return false
    const childrenIndex = this.getChildrenIndex(this.editingPaths[0])
    const currentNode = getCurrentNode(this.drawNode, childrenIndex)
    const width = currentNode.w
    const height = currentNode.h
    const scaleX = currentNode.scaleX || 1
    const scaleY = currentNode.scaleY || 1

    const anchorX = width ? Number((currentNode.anchorX + dx / (width * scaleX)).toFixed(3)) : currentNode.anchorX
    const anchorY = height ? Number((currentNode.anchorY + dy / (height * scaleY)).toFixed(3)) : currentNode.anchorY
    if (anchorX === currentNode.anchorX && anchorY === currentNode.anchorY) return false

    currentNode.posX += (anchorX - currentNode.anchorX) * width * scaleX
    currentNode.posY += (anchorY - currentNode.anchorY) * height * scaleY
    currentNode.anchorX = anchorX
    currentNode.anchorY = anchorY

    const indexes = [...childrenIndex]
    let editNode = getEditingRoot(this.editingComponent, indexes)
    indexes.forEach((index) => {
      const { tag } = editNode
      const componentChildrenNum = getComponentChildrenNum(tag)
      if (editNode.children[index - componentChildrenNum]) editNode = editNode.children[index - componentChildrenNum]
    })
    if (editNode) {
      if (!editNode.props) editNode.props = {}
      if (!editNode.props.node) editNode.props.node = {}
      editNode.props.node.anchorX = anchorX
      editNode.props.node.anchorY = anchorY
      set(editNode.props, 'node.xy', [Math.round(currentNode.posX), Math.round(currentNode.posY)])
      window.postMessage({ type: 'previewUpdateSelectedNodes', selectPaths: this.editingPaths, nodes: [{ component: 'props', updated: editNode.props }] }, '*')
    }
    this.isEditing = true
    return true
  }

  // --- Touch handlers ---

  onTouchStart(touch: Touch) {
    if (this.questionContainerNode.active) return
    const { x, y } = touch.getLocation()

    if (this.isMiddleMouse) {
      this.activeArrowAxis = undefined
      this.activeResizeEdge = undefined
      this.isRotating = false
      this.rotationDragStart = undefined
      this.updateArrowOpacity()
      return
    }

    // Check rotation handle first
    this.isRotating = this.getActiveRotationHandle(x, y)
    if (this.isRotating && this.editingPaths[0]) {
      const childrenIndex = this.getChildrenIndex(this.editingPaths[0])
      const currentNode = getCurrentNode(this.drawNode, childrenIndex)
      this.rotationDragStart = {
        angle: this.getRotationAngle(currentNode, x, y),
        rotation: currentNode.rotation,
      }
      this.activeArrowAxis = undefined
      this.activeResizeEdge = undefined
      this.updateArrowOpacity()
      return
    }
    this.rotationDragStart = undefined

    // Check arrow axis / anchor
    const activeArrowAxis = this.editingPaths[0] ? this.getActiveArrowAxis(x, y) : undefined
    this.activeArrowAxis = activeArrowAxis === 'anchor' ? activeArrowAxis : undefined

    // Check resize edges
    this.activeResizeEdge = this.activeArrowAxis ? undefined : this.getActiveResizeEdge(x, y)

    // If no resize edge, apply arrow axis for move constraint
    if (!this.activeArrowAxis && !this.activeResizeEdge) {
      this.activeArrowAxis = activeArrowAxis
    }

    this.updateArrowOpacity()
  }

  onTouchMove(touch: Touch) {
    if (this.questionContainerNode.active) return
    const { x, y } = touch.getDelta()
    if (!this.editingPaths[0] || this.isMiddleMouse) {
      this.drawNode.posX += x
      this.drawNode.posY += y
      this.borderNode.position = this.drawNode.position
      setLastSceneX(this.drawNode.posX)
      setLastSceneY(this.drawNode.posY)
    } else {
      // Rotation
      if (this.isRotating) {
        const loc = touch.getLocation()
        this.rotateSelectedNode(loc.x, loc.y)
        this.updateArrowPosition()
        return
      }
      // Resize
      if (this.activeResizeEdge) {
        this.resizeSelectedNode(this.activeResizeEdge, x, y)
        this.updateArrowPosition()
        return
      }
      // Anchor drag
      if (this.activeArrowAxis === 'anchor') {
        this.moveSelectionAnchor(x, y)
        this.updateArrowPosition()
        return
      }
      // Constrained or free move
      const moveX = this.activeArrowAxis === 'y' ? 0 : x / this.drawNode.scale
      const moveY = this.activeArrowAxis === 'x' ? 0 : y / this.drawNode.scale
      this.moveSelectedNode(moveX, moveY)
    }
    this.updateArrowPosition()
  }

  onTouchEnd(_touch?: Touch) {
    this.activeArrowAxis = undefined
    this.activeResizeEdge = undefined
    this.isRotating = false
    this.rotationDragStart = undefined
    this.updateArrowOpacity()
  }

  render() {
    const scene = instantiate(SceneComponent as any)
    scene.addComponent(this)
    const touch = scene.addComponent(instantiate(TouchEventRegister))
    touch.props.onTouchStart = this.onTouchStart.bind(this)
    touch.props.onTouchMove = this.onTouchMove.bind(this)
    touch.props.onTouchEnd = this.onTouchEnd.bind(this)
    this.start()
    return this
  }
}

registerSystem(PreviewScene as any)
