import { Button, Label, loadAll, Node, Scene, Sprite } from '@safe-engine/sdl'
import { cloneDeep, first, isNumber, parseInt, set } from 'lodash-es'
import { getViewportMetrics } from 'sdl3'
import { normalizeNodeProps } from 'helper/node'
import { sendRequest } from '../app.ipc'
import { arrow } from './assets'
import { getLastSceneScale, getLastSceneX, getLastSceneY, setLastSceneScale, setLastSceneX, setLastSceneY } from 'data/AppData'
import { GlobalState } from 'data/GloablState'
import { loadSceneViewSdl, preloadSdlAssets, RectRender } from './loader'
import { getCurrentNode } from './utils'

const KEY = {
  shift: 'ShiftLeft',
  shiftR: 'ShiftRight',
  dash: 'Minus',
  equal: 'Equal',
  x: 'KeyX',
  y: 'KeyY',
  h: 'KeyH',
  c: 'KeyC',
  s: 'KeyS',
  r: 'KeyR',
  a: 'KeyA',
  z: 'KeyZ',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
}

function createNode(name: string) {
  return new Node(name)
}

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

function setNodePositionProps(props: { node?: Record<string, unknown> }, x: number, y: number) {
  const node = props?.node
  if (node?.position !== undefined) {
    set(props, 'node.position', `Vec2(${x},${y})`)
    delete props.node.x
    delete props.node.y
    delete props.node.xy
    return
  }
  if (node?.x !== undefined || node?.y !== undefined) {
    set(props, 'node.x', x)
    set(props, 'node.y', y)
    delete props.node.position
    delete props.node.xy
    return
  }
  set(props, 'node.xy', [x, y])
  delete props.node.position
  delete props.node.x
  delete props.node.y
}

type HistoryEntry = {
  editingComponent: any[]
  editingPaths: string[]
}

type SelectionBounds = {
  left: number
  top: number
  right: number
  bottom: number
}

type MarqueeSelection = {
  startX: number
  startY: number
  currentX: number
  currentY: number
  active: boolean
}

export class PreviewScene extends Scene {
  static readonly ARROW_HIT_RADIUS = 32
  static readonly SELECTION_ANCHOR_SIZE = 16
  static readonly MARQUEE_DRAG_THRESHOLD = 4
  static readonly QUESTION_OVERLAY_SIZE = 5000

  arrowContainerNode: Node
  arrowSpriteHorizonNode: Node
  arrowSpriteVerticalNode: Node
  selectionBorderNode: Node
  selectionAnchorNode: Node
  marqueeSelectionNode: Node
  questionContainerNode: Node
  questionContentNode: Node
  drawNode: Node
  borderNode: Node
  isEditing = false
  isMiddleMouse = false
  isShiftPressed = false
  isMultiSelectModifierPressed = false
  lockX = false
  lockY = false
  editingPaths: any[] = []
  editingComponent: any[]
  editingComponentName = ''
  undoStack: HistoryEntry[] = []
  redoStack: HistoryEntry[] = []
  loadedComponentSnapshot = ''
  didCaptureDragHistory = false
  lastTouch?: { x: number; y: number }
  activeArrowAxis?: 'x' | 'y' | 'move'
  marqueeSelection?: MarqueeSelection

  updateArrowOpacity() {
    const isHorizontalDimmed = this.lockX || this.activeArrowAxis === 'y'
    const isVerticalDimmed = this.lockY || this.activeArrowAxis === 'x'
    this.arrowSpriteHorizonNode.opacity = isHorizontalDimmed ? 0.4 : 1
    this.arrowSpriteVerticalNode.opacity = isVerticalDimmed ? 0.4 : 1
  }

  async onLoad() {
    await this.loadProjectData()
    this.createBorder()
    this.createDrawNode()
    this.createArrows()
    this.createMarqueeSelection()
    this.createSaveDialog()
    window.addEventListener('resize', () => this.updateQuestionContainerLayout())
    this.keyboardHandler()
    this.mouseHandler()
    this.messageHandler()
    // this.loadComponent('/Users/antn/Documents/js-snake/client-snake/src/scene/Home.tsx')
  }

  updateInputModifiers(modifiers: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) {
    this.isShiftPressed = Boolean(modifiers.shiftKey)
    this.isMultiSelectModifierPressed = Boolean(modifiers.ctrlKey || modifiers.metaKey)
  }

  toggleSelectPath(path?: string) {
    const editablePath = this.getEditablePath(path)
    if (!editablePath) return
    const nextPaths = this.editingPaths.includes(editablePath)
      ? this.editingPaths.filter((editingPath) => editingPath !== editablePath)
      : [...this.editingPaths, editablePath]
    this.changeSelectPath(nextPaths)
  }

  keyboardHandler() {
    window.addEventListener('keydown', async (event) => {
      const keyCode = event.code
      this.updateInputModifiers(event)
      if (
        [KEY.dash, KEY.equal, KEY.x, KEY.y, KEY.h, KEY.c, KEY.s, KEY.r, KEY.a, KEY.z, KEY.up, KEY.down, KEY.left, KEY.right].includes(
          keyCode,
        )
      ) {
        event.preventDefault()
      }
      if (keyCode === KEY.shift || keyCode === KEY.shiftR) {
        // this.changeSelectPath(['1-1-1'])
      }
      if (event.ctrlKey || event.metaKey) {
        if (keyCode === KEY.s) {
          await this.saveComponent()
        } else if (keyCode === KEY.r) {
          setLastSceneScale(0.5)
          setLastSceneX(0)
          setLastSceneY(0)
          await this.loadComponent(GlobalState.filePath)
        } else if (keyCode === KEY.a) {
          await this.loadProjectData()
          await this.loadComponent(GlobalState.filePath)
        } else if (keyCode === KEY.z && event.shiftKey) {
          await this.redoEdit()
        } else if (keyCode === KEY.z) {
          await this.undoEdit()
        } else if (keyCode === KEY.y) {
          await this.redoEdit()
        }
        return
      }
      if (keyCode === KEY.dash) {
        this.setRootScale(-0.05)
      } else if (keyCode === KEY.equal) {
        this.setRootScale(0.05)
      } else if (keyCode === KEY.x) {
        this.lockX = !this.lockX
        this.updateArrowOpacity()
      } else if (keyCode === KEY.y) {
        this.lockY = !this.lockY
        this.updateArrowOpacity()
      } else if (keyCode === KEY.h) {
        this.toggleSelectedNode()
      } else if (keyCode === KEY.c) {
        this.selectAllChildren()
      }
      if (keyCode === KEY.up && event.shiftKey) {
        this.moveSelectedNodeWithHistory(0, -10)
      } else if (keyCode === KEY.down && event.shiftKey) {
        this.moveSelectedNodeWithHistory(0, 10)
      } else if (keyCode === KEY.left && event.shiftKey) {
        this.moveSelectedNodeWithHistory(-10, 0)
      } else if (keyCode === KEY.right && event.shiftKey) {
        this.moveSelectedNodeWithHistory(10, 0)
      } else if (keyCode === KEY.up) {
        this.moveSelectedNodeWithHistory(0, -1)
      } else if (keyCode === KEY.down) {
        this.moveSelectedNodeWithHistory(0, 1)
      } else if (keyCode === KEY.left) {
        this.moveSelectedNodeWithHistory(-1, 0)
      } else if (keyCode === KEY.right) {
        this.moveSelectedNodeWithHistory(1, 0)
      }
    })
    window.addEventListener('keyup', (event) => {
      this.updateInputModifiers(event)
    })
    window.addEventListener('blur', () => {
      this.isShiftPressed = false
      this.isMultiSelectModifierPressed = false
    })
  }

  mouseHandler() {
    const canvas = document.querySelector<HTMLCanvasElement>('#sdl-canvas')
    canvas?.addEventListener(
      'wheel',
      (event) => {
        this.setRootScale(event.deltaY > 0 ? -0.05 : 0.05)
        event.preventDefault()
      },
      { passive: false },
    )
    canvas?.addEventListener('pointerdown', (event) => {
      this.isMiddleMouse = event.button === 1
      this.updateInputModifiers(event)
    })
    canvas?.addEventListener('pointermove', (event) => {
      this.updateInputModifiers(event)
    })
    canvas?.addEventListener('pointerup', () => {
      this.isMiddleMouse = false
      this.isShiftPressed = false
      this.isMultiSelectModifierPressed = false
      this.lastTouch = undefined
    })
    canvas?.addEventListener('pointercancel', () => {
      this.isMiddleMouse = false
      this.isShiftPressed = false
      this.isMultiSelectModifierPressed = false
      this.lastTouch = undefined
    })
  }

  messageHandler() {
    const listener = (event) => {
      const message = event.data
      this.updateQuestionContainerLayout()
      if (message.type === 'reLoad') {
        if (this.isEditing) {
          this.updateQuestionContainerLayout()
          this.questionContainerNode.active = true
        } else {
          void this.loadComponent(GlobalState.filePath)
        }
      } else if (message.type === 'changeFilePath') {
        GlobalState.tempFilePath = message.filePath
        if (this.isEditing) {
          this.updateQuestionContainerLayout()
          this.questionContainerNode.active = true
        } else {
          void this.loadComponent(GlobalState.tempFilePath)
        }
      } else if (message.type === 'changeSelectPath') {
        this.changeSelectPath(message.selectPaths)
      }
    }
    window.addEventListener('message', listener)
  }

  async loadProjectData() {
    const data: any = await sendRequest({
      key: 'GET_FOLDER_FILES',
      src: 'REPLACE_ROOT_PROJECT',
    })
    const { designedResolution, assets, componentsCache, colors, defaultProps, jsonCaches, staticPropsMap, enumsList, ...rest } = data
    GlobalState.data = {
      ...assets,
      ...rest,
      componentsCache,
      designedResolution,
      colors,
      defaultProps,
      jsonCaches,
      staticPropsMap,
      enumsList,
    }
    const defaultFontKey = 'REPLACE_WITH_DEFAULT_FONT_PATH'
    const defaultFontSize = Number.parseInt('REPLACE_WITH_DEFAULT_FONT_SIZE', 10)
    const defaultFont = assets?.fontAssets?.find((font) => font.key === defaultFontKey)?.value ?? assets?.fontAssets?.[0]?.value
    if (Number.isFinite(defaultFontSize) && defaultFontSize > 0) Label.defaultSize = defaultFontSize
    if (defaultFont) Label.defaultFont = defaultFont
    await preloadSdlAssets(assets)
    await loadAll([arrow]).catch(() => undefined)
  }

  setRootScale(offset: number) {
    const scale = getLastSceneScale()
    let value = scale + offset
    if (value < 0.1) value = 0.1
    if (value > 2) value = 2
    setLastSceneScale(value)
    this.borderNode.scale = value
    this.drawNode.scale = value
    this.updateQuestionContainerLayout()
    this.updateArrowPosition()
  }

  updateQuestionContainerLayout() {
    if (!this.questionContainerNode || !this.questionContentNode) return
    const overlayHalf = PreviewScene.QUESTION_OVERLAY_SIZE / 2
    const [logicalWidth, logicalHeight] = getViewportMetrics()
    this.questionContainerNode.x = -overlayHalf
    this.questionContainerNode.y = -overlayHalf
    this.questionContainerNode.scale = 1
    this.questionContentNode.x = overlayHalf + logicalWidth / 2
    this.questionContentNode.y = overlayHalf + logicalHeight / 2
    this.questionContentNode.scale = this.drawNode?.scaleX ?? 1
  }

  createBorder() {
    const border = createNode('PreviewBorder')
    const { designedResolution } = GlobalState.data
    border.width = designedResolution.width
    border.height = designedResolution.height
    border.anchorX = 0
    border.anchorY = 0
    border.addComponent(new RectRender({ strokeColor: { r: 227, g: 11, b: 93, a: 159 }, lineWidth: 3 }))
    this.borderNode = border
    this.node.addChild(border)
  }

  createDrawNode() {
    this.drawNode = createNode('PreviewDrawNode')
    this.drawNode.anchorX = 0
    this.drawNode.anchorY = 0
    this.node.addChild(this.drawNode)
    this.drawNode.x = this.borderNode.x = getLastSceneX()
    this.drawNode.y = this.borderNode.y = getLastSceneY()
    this.drawNode.scale = this.borderNode.scale = getLastSceneScale()
  }

  createArrows() {
    const arrowContainer = createNode('SelectionArrows')
    const arrowSpriteHorizon = createNode('SelectionArrowX')
    const arrowSpriteVertical = createNode('SelectionArrowY')
    const selectionBorder = createNode('SelectionBorder')
    const selectionAnchor = createNode('SelectionAnchor')
    arrowSpriteHorizon.addComponent(new Sprite({ spriteFrame: arrow }))
    arrowSpriteVertical.addComponent(new Sprite({ spriteFrame: arrow }))
    selectionBorder.addComponent(new RectRender({ strokeColor: { r: 34, g: 197, b: 94, a: 255 }, lineWidth: 2 }))
    selectionAnchor.width = PreviewScene.SELECTION_ANCHOR_SIZE
    selectionAnchor.height = PreviewScene.SELECTION_ANCHOR_SIZE
    selectionAnchor.anchorX = 0.5
    selectionAnchor.anchorY = 0.5
    selectionAnchor.addComponent(
      new RectRender({
        fillColor: { r: 255, g: 255, b: 255, a: 255 },
        strokeColor: { r: 34, g: 197, b: 94, a: 255 },
        lineWidth: 2,
      }),
    )
    this.arrowContainerNode = arrowContainer
    this.arrowSpriteHorizonNode = arrowSpriteHorizon
    this.arrowSpriteVerticalNode = arrowSpriteVertical
    this.selectionBorderNode = selectionBorder
    this.selectionAnchorNode = selectionAnchor
    arrowSpriteVertical.y = -40
    arrowSpriteVertical.color = { r: 255, g: 0, b: 0, a: 255 }
    arrowSpriteHorizon.x = 40
    arrowSpriteHorizon.rotation = 90
    selectionBorder.zIndex = -2
    selectionAnchor.zIndex = -1
    this.arrowContainerNode.zIndex = Infinity - 1
    this.arrowContainerNode.active = false
    arrowContainer.addChild(selectionBorder)
    arrowContainer.addChild(selectionAnchor)
    arrowContainer.addChild(arrowSpriteHorizon)
    arrowContainer.addChild(arrowSpriteVertical)
    this.node.addChild(arrowContainer)
    this.updateArrowOpacity()
  }

  createMarqueeSelection() {
    const marqueeSelection = createNode('MarqueeSelection')
    marqueeSelection.anchorX = 0
    marqueeSelection.anchorY = 0
    marqueeSelection.zIndex = Infinity - 2
    marqueeSelection.active = false
    marqueeSelection.addComponent(
      new RectRender({
        fillColor: { r: 34, g: 197, b: 94, a: 48 },
        strokeColor: { r: 34, g: 197, b: 94, a: 255 },
        lineWidth: 2,
      }),
    )
    this.marqueeSelectionNode = marqueeSelection
    this.node.addChild(marqueeSelection)
  }

  async saveComponent() {
    const data: any = await sendRequest({
      key: 'GEN_COMPONENT_REQUEST',
      nodesData: this.editingComponent,
      filePath: GlobalState.filePath,
    })
    console.log('gen success', data)
    this.loadedComponentSnapshot = this.serializeEditingComponent()
    this.isEditing = false
  }

  createSaveDialog() {
    const questionContainer = createNode('SaveQuestionText')
    questionContainer.width = 500
    questionContainer.height = 80
    questionContainer.addComponent(new Label({ string: 'Do you want to save or reload?', font: Label.defaultFont, size: 36 }))

    const lbSave = createNode('SaveButton')
    lbSave.width = 120
    lbSave.height = 60
    lbSave.x = 150
    lbSave.y = 120
    lbSave.color = { r: 255, g: 0, b: 0, a: 255 }
    lbSave.addComponent(new Label({ string: 'Save', font: Label.defaultFont, size: 36 }))
    lbSave.addComponent(new Button({ onPress: () => void this.saveAndLoadTemp() }))

    const lbReload = createNode('ReloadButton')
    lbReload.width = 160
    lbReload.height = 60
    lbReload.x = -150
    lbReload.y = 120
    lbReload.color = { r: 255, g: 0, b: 0, a: 255 }
    lbReload.addComponent(new Label({ string: 'Reload', font: Label.defaultFont, size: 36 }))
    lbReload.addComponent(new Button({ onPress: () => void this.loadComponent(GlobalState.tempFilePath) }))

    questionContainer.addChild(lbSave)
    questionContainer.addChild(lbReload)

    const bg = createNode('SaveQuestionOverlay')
    bg.width = PreviewScene.QUESTION_OVERLAY_SIZE
    bg.height = PreviewScene.QUESTION_OVERLAY_SIZE
    bg.anchorX = 0
    bg.anchorY = 0
    bg.x = -(PreviewScene.QUESTION_OVERLAY_SIZE / 2)
    bg.y = -(PreviewScene.QUESTION_OVERLAY_SIZE / 2)
    bg.addComponent(new RectRender({ fillColor: { r: 0, g: 0, b: 0, a: 150 } }))
    bg.addChild(questionContainer)
    this.questionContainerNode = bg
    this.questionContentNode = questionContainer
    this.questionContainerNode.active = false
    this.questionContainerNode.zIndex = Infinity
    this.node.addChild(this.questionContainerNode)
    this.updateQuestionContainerLayout()
  }

  async saveAndLoadTemp() {
    await this.saveComponent()
    await this.loadComponent(GlobalState.tempFilePath)
  }

  async loadComponent(path: string) {
    if (!path) return
    const data: any = await sendRequest({
      key: 'LOAD_COMPONENT_REQUEST',
      path,
    })
    GlobalState.filePath = path
    this.editingComponentName = data.name ?? ''
    this.editingComponent = Array.isArray(data.treeData) ? data.treeData : [data.treeData]
    this.undoStack = []
    this.redoStack = []
    this.drawNode.destroy()
    this.createDrawNode()
    await loadSceneViewSdl(data, GlobalState.data, this.drawNode)
    this.loadedComponentSnapshot = this.serializeEditingComponent()
    this.questionContainerNode.active = false
    this.isEditing = false
    this.updateQuestionContainerLayout()
    this.updateArrowPosition()
  }

  serializeEditingComponent() {
    return JSON.stringify(this.editingComponent ?? [])
  }

  createHistoryEntry(): HistoryEntry {
    return {
      editingComponent: cloneDeep(this.editingComponent ?? []),
      editingPaths: [...this.editingPaths],
    }
  }

  pushUndoHistory() {
    if (!this.editingComponent?.length) return
    this.undoStack.push(this.createHistoryEntry())
    this.redoStack = []
  }

  syncEditingFlag() {
    this.isEditing = this.serializeEditingComponent() !== this.loadedComponentSnapshot
  }

  async restoreHistoryEntry(historyEntry: HistoryEntry) {
    this.editingComponent = cloneDeep(historyEntry.editingComponent)
    this.editingPaths = [...historyEntry.editingPaths]
    this.drawNode.destroy()
    this.createDrawNode()
    await loadSceneViewSdl({ name: this.editingComponentName, treeData: this.editingComponent }, GlobalState.data, this.drawNode)
    this.syncEditingFlag()
    this.updateArrowPosition()
  }

  async undoEdit() {
    const historyEntry = this.undoStack.pop()
    if (!historyEntry) return
    this.redoStack.push(this.createHistoryEntry())
    await this.restoreHistoryEntry(historyEntry)
  }

  async redoEdit() {
    const historyEntry = this.redoStack.pop()
    if (!historyEntry) return
    this.undoStack.push(this.createHistoryEntry())
    await this.restoreHistoryEntry(historyEntry)
  }

  getChildrenIndex(editingPath = '') {
    const isSceneNode = first(this.editingComponent)?.tag === 'SceneComponent'
    const childrenIndex = editingPath.split('-').map(parseInt)
    if (isSceneNode) childrenIndex.shift()
    return childrenIndex
  }

  getEditablePath(editingPath = '') {
    if (!editingPath) return ''
    const pathParts = editingPath.split('-')
    const childrenIndex = this.getChildrenIndex(editingPath)
    const indexes = [...childrenIndex]
    const isSceneNode = first(this.editingComponent)?.tag === 'SceneComponent'
    const rootPathLength = isSceneNode ? 2 : 1
    const editablePathParts = pathParts.slice(0, rootPathLength)
    let pathIndex = rootPathLength
    let editNode = getEditingRoot(this.editingComponent, indexes)

    for (const index of indexes) {
      if (!editNode) break
      const { tag } = editNode
      const componentChildrenNum = getComponentChildrenNum(tag)
      const childIndex = index - componentChildrenNum
      const rawPathPart = pathParts[pathIndex]
      if (childIndex < 0 || rawPathPart === undefined || !editNode.children?.[childIndex]) break
      editNode = editNode.children[childIndex]
      editablePathParts.push(rawPathPart)
      pathIndex += 1
    }

    return editablePathParts.join('-')
  }

  canMoveSelectedNode(mx: number, my: number) {
    const moveX = this.lockX ? 0 : mx
    const moveY = this.lockY ? 0 : my
    return Boolean(this.editingPaths[0] && (moveX || moveY))
  }

  moveSelectedNode(mx = 0, my = 0) {
    const moveX = this.lockX ? 0 : mx
    const moveY = this.lockY ? 0 : my
    if (!this.editingPaths[0] || (!moveX && !moveY)) return false
    this.editingPaths.forEach((editingPath) => {
      const childrenIndex = this.getChildrenIndex(editingPath)
      const currentNode = getCurrentNode(this.drawNode, childrenIndex)
      currentNode.x = (isNumber(currentNode.x) ? currentNode.x : 0) + moveX
      currentNode.y = (isNumber(currentNode.y) ? currentNode.y : 0) + moveY
      const indexes = [...childrenIndex]
      let editNode = getEditingRoot(this.editingComponent, indexes)
      indexes.forEach((index) => {
        const { tag } = editNode
        const componentChildrenNum = getComponentChildrenNum(tag)
        if (editNode.children[index - componentChildrenNum]) editNode = editNode.children[index - componentChildrenNum]
      })
      const nx = Math.round(currentNode.x)
      const ny = Math.round(currentNode.y)
      setNodePositionProps(editNode.props, nx, ny)
      normalizeNodeProps(editNode.props)
    })
    this.syncEditingFlag()
    return true
  }

  moveSelectedNodeWithHistory(mx: number, my: number) {
    if (!this.canMoveSelectedNode(mx, my)) return
    this.pushUndoHistory()
    this.moveSelectedNode(mx, my)
    this.updateArrowPosition()
  }

  selectAllChildren() {
    if (!this.editingPaths[0]) return
    const allPaths: any[] = []
    this.editingPaths.forEach((editingPath) => {
      const childrenIndex = this.getChildrenIndex(editingPath)
      const currentNode = getCurrentNode(this.drawNode, childrenIndex)
      currentNode.children.forEach((_child, index) => allPaths.push(`${editingPath}-${index}`))
    })
    this.changeSelectPath(allPaths)
  }

  toggleSelectedNode() {
    if (!this.editingPaths[0]) return
    this.pushUndoHistory()
    this.editingPaths.forEach((editingPath) => {
      const childrenIndex = this.getChildrenIndex(editingPath)
      const currentNode = getCurrentNode(this.drawNode, childrenIndex)
      currentNode.active = !currentNode.active
      const indexes = [...childrenIndex]
      let editNode = getEditingRoot(this.editingComponent, indexes)
      indexes.forEach((index) => {
        const { tag } = editNode
        const componentChildrenNum = getComponentChildrenNum(tag)
        if (editNode.children[index - componentChildrenNum]) editNode = editNode.children[index - componentChildrenNum]
      })
      set(editNode.props, 'node.active', currentNode.active === false ? false : undefined)
    })
    this.syncEditingFlag()
  }

  changeSelectPath(paths: string[]) {
    this.editingPaths = [...new Set(paths.map((path) => this.getEditablePath(path)).filter(Boolean))]
    this.updateArrowPosition()
  }

  getCombinedBoundsFromPaths(paths: string[]) {
    let combinedBounds: SelectionBounds | undefined
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
    if (this.marqueeSelection?.active) {
      this.arrowContainerNode.active = false
      return
    }
    if (!this.editingPaths[0]) {
      this.arrowContainerNode.active = false
      return
    }
    if (this.editingPaths.length > 1) {
      const combinedBounds = this.getCombinedBoundsFromPaths(this.editingPaths)
      if (!combinedBounds) {
        this.arrowContainerNode.active = false
        return
      }
      this.arrowContainerNode.active = true
      this.arrowContainerNode.x = (combinedBounds.left + combinedBounds.right) / 2
      this.arrowContainerNode.y = (combinedBounds.top + combinedBounds.bottom) / 2
      this.selectionBorderNode.width = combinedBounds.right - combinedBounds.left
      this.selectionBorderNode.height = combinedBounds.bottom - combinedBounds.top
      this.selectionBorderNode.anchorX = 0.5
      this.selectionBorderNode.anchorY = 0.5
      this.selectionBorderNode.scaleX = 1
      this.selectionBorderNode.scaleY = 1
      return
    }
    const childrenIndex = this.getChildrenIndex(this.editingPaths[0])
    const currentNode = getCurrentNode(this.drawNode, childrenIndex)
    this.arrowContainerNode.active = true
    this.arrowContainerNode.x = currentNode.worldX
    this.arrowContainerNode.y = currentNode.worldY
    this.selectionBorderNode.width = currentNode.width
    this.selectionBorderNode.height = currentNode.height
    this.selectionBorderNode.anchorX = currentNode.anchorX
    this.selectionBorderNode.anchorY = currentNode.anchorY
    this.selectionBorderNode.scaleX = currentNode.worldScaleX ?? 1
    this.selectionBorderNode.scaleY = currentNode.worldScaleY ?? 1
  }

  getSelectionBounds(x1: number, y1: number, x2: number, y2: number): SelectionBounds {
    return {
      left: Math.min(x1, x2),
      top: Math.min(y1, y2),
      right: Math.max(x1, x2),
      bottom: Math.max(y1, y2),
    }
  }

  getNodeBounds(node: Node): SelectionBounds | undefined {
    if (!node.active) return undefined
    const width = node.width * (node.worldScaleX ?? 1)
    const height = node.height * (node.worldScaleY ?? 1)
    if (!width || !height) return undefined
    const x1 = node.worldX - node.anchorX * width
    const y1 = node.worldY - node.anchorY * height
    const x2 = x1 + width
    const y2 = y1 + height
    return this.getSelectionBounds(x1, y1, x2, y2)
  }

  isNodeInsideSelectionBounds(node: Node, bounds: SelectionBounds) {
    const nodeBounds = this.getNodeBounds(node)
    if (!nodeBounds) return false
    return (
      nodeBounds.left >= bounds.left &&
      nodeBounds.right <= bounds.right &&
      nodeBounds.top >= bounds.top &&
      nodeBounds.bottom <= bounds.bottom
    )
  }

  isPointInsideNode(node: Node, x: number, y: number) {
    if (!node.active) return false
    const width = node.width * (node.worldScaleX ?? 1)
    const height = node.height * (node.worldScaleY ?? 1)
    if (width <= 0 || height <= 0) return false
    const left = node.worldX - node.anchorX * width
    const top = node.worldY - node.anchorY * height
    return x >= left && x <= left + width && y >= top && y <= top + height
  }

  findSelectionPathInNode(node: Node, path: string[], x: number, y: number): string | undefined {
    if (!node.active) return undefined
    for (let index = node.children.length - 1; index >= 0; index--) {
      const childPath = this.findSelectionPathInNode(node.children[index], [...path, `${index}`], x, y)
      if (childPath) return childPath
    }
    if (this.isPointInsideNode(node, x, y)) return path.join('-')
    return undefined
  }

  findSelectionPath(x: number, y: number) {
    const isSceneNode = first<any>(this.editingComponent)?.tag === 'SceneComponent'
    const pathPrefix = isSceneNode ? ['0'] : []
    for (let index = this.drawNode.children.length - 1; index >= 0; index--) {
      const childPath = this.findSelectionPathInNode(this.drawNode.children[index], [...pathPrefix, `${index}`], x, y)
      if (childPath) return childPath
    }
    return undefined
  }

  collectSelectionPathsInNode(node: Node, path: string[], bounds: SelectionBounds, selectedPaths: string[]) {
    if (!node.active) return
    let hasSelectedChild = false
    node.children.forEach((child, index) => {
      const previousCount = selectedPaths.length
      this.collectSelectionPathsInNode(child, [...path, `${index}`], bounds, selectedPaths)
      hasSelectedChild = hasSelectedChild || selectedPaths.length > previousCount
    })
    if (!hasSelectedChild && this.isNodeInsideSelectionBounds(node, bounds)) selectedPaths.push(path.join('-'))
  }

  findSelectionPathsInBounds(bounds: SelectionBounds) {
    const isSceneNode = first<any>(this.editingComponent)?.tag === 'SceneComponent'
    const pathPrefix = isSceneNode ? ['0'] : []
    const selectedPaths: string[] = []
    this.drawNode.children.forEach((child, index) => {
      this.collectSelectionPathsInNode(child, [...pathPrefix, `${index}`], bounds, selectedPaths)
    })
    return selectedPaths
  }

  getActiveArrowAxis(x: number, y: number) {
    const anchorX = this.arrowContainerNode.x + this.selectionAnchorNode.x
    const anchorY = this.arrowContainerNode.y + this.selectionAnchorNode.y
    const anchorHalfWidth = this.selectionAnchorNode.width / 2
    const anchorHalfHeight = this.selectionAnchorNode.height / 2
    if (Math.abs(x - anchorX) <= anchorHalfWidth && Math.abs(y - anchorY) <= anchorHalfHeight) {
      return 'move' as const
    }
    const radius = PreviewScene.ARROW_HIT_RADIUS
    const horizontalX = this.arrowContainerNode.x + this.arrowSpriteHorizonNode.x
    const horizontalY = this.arrowContainerNode.y + this.arrowSpriteHorizonNode.y
    if (Math.abs(x - horizontalX) <= radius && Math.abs(y - horizontalY) <= radius) {
      return 'x' as const
    }
    const verticalX = this.arrowContainerNode.x + this.arrowSpriteVerticalNode.x
    const verticalY = this.arrowContainerNode.y + this.arrowSpriteVerticalNode.y
    if (Math.abs(x - verticalX) <= radius && Math.abs(y - verticalY) <= radius) {
      return 'y' as const
    }
    return undefined
  }

  onTouchStart(x: number, y: number) {
    if (this.questionContainerNode.active) return
    this.lastTouch = { x, y }
    this.didCaptureDragHistory = false
    this.marqueeSelection = undefined
    const isModifierSelecting = this.isMultiSelectModifierPressed && !this.isMiddleMouse
    this.activeArrowAxis = isModifierSelecting ? undefined : this.editingPaths[0] ? this.getActiveArrowAxis(x, y) : undefined
    if (this.isShiftPressed && !this.isMiddleMouse) {
      this.activeArrowAxis = undefined
      this.marqueeSelection = { startX: x, startY: y, currentX: x, currentY: y, active: false }
      this.marqueeSelectionNode.active = false
      this.updateArrowOpacity()
      return
    }
    if (!this.activeArrowAxis && !this.isMiddleMouse) {
      const selectedPath = this.findSelectionPath(x, y)
      if (isModifierSelecting) {
        this.toggleSelectPath(selectedPath)
      } else {
        this.changeSelectPath(selectedPath ? [selectedPath] : [])
      }
    }
    this.updateArrowOpacity()
  }

  onTouchMove(x: number, y: number) {
    if (this.questionContainerNode.active) return
    const last = this.lastTouch ?? { x, y }
    const dx = x - last.x
    const dy = y - last.y
    this.lastTouch = { x, y }
    if (this.marqueeSelection) {
      this.marqueeSelection.currentX = x
      this.marqueeSelection.currentY = y
      const totalDx = x - this.marqueeSelection.startX
      const totalDy = y - this.marqueeSelection.startY
      const movedEnough =
        Math.abs(totalDx) >= PreviewScene.MARQUEE_DRAG_THRESHOLD || Math.abs(totalDy) >= PreviewScene.MARQUEE_DRAG_THRESHOLD
      this.marqueeSelection.active = this.marqueeSelection.active || movedEnough
      if (!this.marqueeSelection.active) return
      const bounds = this.getSelectionBounds(
        this.marqueeSelection.startX,
        this.marqueeSelection.startY,
        this.marqueeSelection.currentX,
        this.marqueeSelection.currentY,
      )
      this.marqueeSelectionNode.active = true
      this.marqueeSelectionNode.x = bounds.left
      this.marqueeSelectionNode.y = bounds.top
      this.marqueeSelectionNode.width = bounds.right - bounds.left
      this.marqueeSelectionNode.height = bounds.bottom - bounds.top
      this.changeSelectPath(this.findSelectionPathsInBounds(bounds))
      return
    }
    if (!this.editingPaths[0] || this.isMiddleMouse) {
      this.drawNode.x += dx
      this.drawNode.y += dy
      this.borderNode.x = this.drawNode.x
      this.borderNode.y = this.drawNode.y
      setLastSceneX(this.drawNode.x)
      setLastSceneY(this.drawNode.y)
    } else {
      const moveX = this.activeArrowAxis === 'y' ? 0 : dx / this.drawNode.scaleX
      const moveY = this.activeArrowAxis === 'x' ? 0 : dy / this.drawNode.scaleY
      if (!this.didCaptureDragHistory && this.canMoveSelectedNode(moveX, moveY)) {
        this.pushUndoHistory()
        this.didCaptureDragHistory = true
      }
      this.moveSelectedNode(moveX, moveY)
    }
    this.updateArrowPosition()
  }

  onTouchEnd() {
    if (this.marqueeSelection) {
      if (!this.marqueeSelection.active) {
        const selectedPath = this.findSelectionPath(this.marqueeSelection.startX, this.marqueeSelection.startY)
        this.changeSelectPath(selectedPath ? [selectedPath] : [])
      }
      this.marqueeSelection = undefined
      this.marqueeSelectionNode.active = false
      this.updateArrowPosition()
    }
    this.lastTouch = undefined
    this.activeArrowAxis = undefined
    this.didCaptureDragHistory = false
    this.updateArrowOpacity()
  }
}
