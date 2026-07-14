import { MeshAttachment, RegionAttachment } from '@esotericsoftware/spine-core'
import { Label, loadAll, Node, Scene, SpineBonesControl, SpineSkeleton, Sprite, Touch } from '@safe-engine/sdl'
import { getLastLoadedFile, getLastRootFolder, getLastSceneScale, getLastSceneX, getLastSceneY, setLastSceneScale, setLastSceneX, setLastSceneY } from 'data/AppData'
import { GlobalState } from 'data/GloablState'
import { normalizeNodeProps, parseBoolFromValue, parseNumbersArray, parseStringsArray } from 'helper/node'
import { cloneDeep, first, isNumber, parseInt, set } from 'lodash-es'
import { setAssetRoot } from 'sdl3'
import { sendRequest } from '../app.ipc'
import { arrow } from './assets'
import { CircleRender } from './CircleRender'
import { updatePreviewWidgetInsets } from './component'
import { loadSceneViewSdl, preloadSdlAssets, RectRender } from './loader'
import { SpineBonesControlRender } from './SpineBonesControlRender'
import { createNode, getComponentChildrenNum, getCurrentNode, getEditingRoot, KEY, setNodePositionProps } from './utils'

export class PreviewScene extends Scene {
  static readonly ARROW_HIT_RADIUS = 32
  static readonly SELECTION_ANCHOR_SIZE = 16
  static readonly RESIZE_EDGE_HIT_SIZE = 8
  static readonly RESIZE_CORNER_SIZE = 12
  static readonly ROTATION_HANDLE_SIZE = 14
  static readonly ROTATION_HANDLE_OFFSET = 30
  static readonly MARQUEE_DRAG_THRESHOLD = 4

  arrowContainerNode: Node
  arrowSpriteHorizonNode: Node
  arrowSpriteVerticalNode: Node
  selectionBorderNode: Node
  selectionAnchorNode: Node
  selectionCornerNodes: Node[]
  rotationHandleNode: Node
  marqueeSelectionNode: Node
  spineBonesControlNode: Node
  spineBoneTooltipNode?: HTMLDivElement
  saveDialogNode?: HTMLDivElement
  drawNode: Node
  borderNode: Node
  isEditing = false
  isMiddleMouse = false
  isShiftPressed = false
  isMultiSelectModifierPressed = false
  lockX = false
  lockY = false
  editingPaths: any[] = []
  editingComponent: any[] = []
  editingComponentName = ''
  undoStack: HistoryEntry[] = []
  redoStack: HistoryEntry[] = []
  loadedComponentSnapshot = ''
  pendingLoadPath = ''
  loadingPath = ''
  didCaptureDragHistory = false
  logicalCanvasWidth = window.innerWidth
  lastTouch?: { x: number; y: number }
  middleMouseSelectionPaths?: string[]
  activeArrowAxis?: 'x' | 'y' | 'move' | 'anchor'
  activeResizeEdge?: ResizeHandle
  isRotating = false
  activeSpineBonePoint?: { componentIndex: number; pointIndex: number }
  rotationDragStart?: { angle: number; rotation: number }
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
    this.createSpineBonesControl()
    this.createMarqueeSelection()
    this.createSaveDialog()
    this.keyboardHandler()
    this.mouseHandler()
    this.messageHandler()
    await this.loadLastComponent()
    // this.loadComponent('/Users/antn/Documents/js-snake/client-snake/src/scene/Home.tsx')
  }

  async loadLastComponent() {
    const lastLoadedFile = getLastLoadedFile()
    if (!lastLoadedFile || GlobalState.filePath) return
    await this.loadComponent(lastLoadedFile)
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
      // if (
      //   [KEY.dash, KEY.equal, KEY.x, KEY.y, KEY.h, KEY.c, KEY.s, KEY.r, KEY.a, KEY.z, KEY.up, KEY.down, KEY.left, KEY.right].includes(
      //     keyCode,
      //   )
      // ) {
      //   event.preventDefault()
      // }
      if (keyCode === KEY.shift || keyCode === KEY.shiftR) {
        // this.changeSelectPath(['1-1-1'])
      }
      if (event.ctrlKey || event.metaKey) {
        if (keyCode === KEY.s) {
          await this.saveComponent()
        } else if (keyCode === KEY.r) {
          // setLastSceneScale(0.5)
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
      if (event.shiftKey) {
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
        } else if (keyCode === KEY.up) {
          this.moveSelectedNodeWithHistory(0, -10)
        } else if (keyCode === KEY.down) {
          this.moveSelectedNodeWithHistory(0, 10)
        } else if (keyCode === KEY.left) {
          this.moveSelectedNodeWithHistory(-10, 0)
        } else if (keyCode === KEY.right) {
          this.moveSelectedNodeWithHistory(10, 0)
        } else if (keyCode === KEY.up) {
          this.moveSelectedNodeWithHistory(0, -1)
        } else if (keyCode === KEY.down) {
          this.moveSelectedNodeWithHistory(0, 1)
        } else if (keyCode === KEY.left) {
          this.moveSelectedNodeWithHistory(-1, 0)
        } else if (keyCode === KEY.right) {
          this.moveSelectedNodeWithHistory(1, 0)
        } else if (keyCode === KEY.c) {
          this.selectAllChildren()
        }
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
      if (this.isMiddleMouse) this.middleMouseSelectionPaths = [...this.editingPaths]
      this.updateInputModifiers(event)
    }, true)
    canvas?.addEventListener('pointermove', (event) => {
      this.updateInputModifiers(event)
      const bounds = canvas.getBoundingClientRect()
      const x = (event.clientX - bounds.left) * this.logicalCanvasWidth / bounds.width
      const y = (event.clientY - bounds.top) * this.logicalCanvasWidth / bounds.width
      this.updateSpineBoneTooltip(x, y, event.clientX, event.clientY)
      const activeArrowAxis = !this.isShiftPressed && !this.isMultiSelectModifierPressed && this.editingPaths[0]
        ? this.getActiveArrowAxis(x, y)
        : undefined
      if (activeArrowAxis === 'anchor') {
        canvas.style.cursor = 'move'
        return
      }
      if (!this.isShiftPressed && !this.isMultiSelectModifierPressed && this.getActiveRotationHandle(x, y)) {
        canvas.style.cursor = 'grab'
        return
      }
      const handle = !this.isShiftPressed && !this.isMultiSelectModifierPressed ? this.getActiveResizeEdge(x, y) : undefined
      const canResizeX = handle?.includes('left') || handle?.includes('right') ? !this.lockX : false
      const canResizeY = handle?.includes('top') || handle?.includes('bottom') ? !this.lockY : false
      canvas.style.cursor = canResizeX && canResizeY
        ? handle === 'top-left' || handle === 'bottom-right' ? 'nwse-resize' : 'nesw-resize'
        : canResizeX ? 'ew-resize' : canResizeY ? 'ns-resize' : 'default'
    })
    canvas?.addEventListener('pointerleave', () => {
      canvas.style.cursor = 'default'
      if (this.spineBoneTooltipNode) this.spineBoneTooltipNode.style.display = 'none'
    })
    canvas?.addEventListener('pointerup', () => {
      this.isMiddleMouse = false
      this.middleMouseSelectionPaths = undefined
      this.isShiftPressed = false
      this.isMultiSelectModifierPressed = false
      this.lastTouch = undefined
    })
    canvas?.addEventListener('pointercancel', () => {
      this.isMiddleMouse = false
      this.middleMouseSelectionPaths = undefined
      this.isShiftPressed = false
      this.isMultiSelectModifierPressed = false
      this.lastTouch = undefined
    })
  }

  messageHandler() {
    const listener = (event) => {
      const message = event.data
      if (message.type === 'reLoad') {
        if (this.isEditing) {
          this.showSaveDialog(GlobalState.filePath)
        } else {
          void this.loadComponent(GlobalState.filePath)
        }
      } else if (message.type === 'changeFilePath') {
        GlobalState.tempFilePath = message.filePath
        if (this.isEditing) {
          this.showSaveDialog(GlobalState.tempFilePath)
        } else {
          void this.loadComponent(GlobalState.tempFilePath)
        }
      } else if (message.type === 'changeSelectPath') {
        this.changeSelectPath(message.selectPaths, false)
      } else if (message.type === 'focusPreviewNode') {
        this.focusNode(message.path)
      } else if (message.type === 'reloadProjectData') {
        void this.reloadProjectData()
      } else if (message.type === 'updateSelectedNode') {
        void this.updateSelectedNode(message.component, message.updated)
      }
    }
    window.addEventListener('message', listener)
  }

  async loadProjectData() {
    const rootProject = getLastRootFolder()
    if (!rootProject) return
    setAssetRoot(`${rootProject}/res`)
    const data: any = await sendRequest({
      key: 'GET_FOLDER_FILES',
      src: rootProject,
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

  async reloadProjectData() {
    await this.loadProjectData()
    this.borderNode.width = GlobalState.data.designedResolution.width
    this.borderNode.height = GlobalState.data.designedResolution.height
    await this.reloadEditingComponent()
  }

  setRootScale(offset: number) {
    const scale = getLastSceneScale()
    let value = scale + offset
    if (value < 0.1) value = 0.1
    if (value > 2) value = 2
    setLastSceneScale(value)
    this.borderNode.scale = value
    this.drawNode.scale = value
    this.updateArrowPosition()
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
    const selectionCorners = ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight'].map((name) => createNode(`SelectionCorner${name}`))
    const rotationHandle = createNode('SelectionRotationHandle')
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
    selectionCorners.forEach((corner) => {
      corner.width = PreviewScene.RESIZE_CORNER_SIZE
      corner.height = PreviewScene.RESIZE_CORNER_SIZE
      corner.anchorX = 0.5
      corner.anchorY = 0.5
      corner.zIndex = -1
      corner.addComponent(
        new RectRender({
          fillColor: { r: 255, g: 255, b: 255, a: 255 },
          strokeColor: { r: 34, g: 197, b: 94, a: 255 },
          lineWidth: 2,
        }),
      )
    })
    rotationHandle.width = PreviewScene.ROTATION_HANDLE_SIZE
    rotationHandle.height = PreviewScene.ROTATION_HANDLE_SIZE
    rotationHandle.anchorX = 0.5
    rotationHandle.anchorY = 0.5
    rotationHandle.zIndex = -1
    rotationHandle.addComponent(new CircleRender())
    this.arrowContainerNode = arrowContainer
    this.arrowSpriteHorizonNode = arrowSpriteHorizon
    this.arrowSpriteVerticalNode = arrowSpriteVertical
    this.selectionBorderNode = selectionBorder
    this.selectionAnchorNode = selectionAnchor
    this.selectionCornerNodes = selectionCorners
    this.rotationHandleNode = rotationHandle
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
    selectionCorners.forEach((corner) => arrowContainer.addChild(corner))
    arrowContainer.addChild(rotationHandle)
    arrowContainer.addChild(arrowSpriteHorizon)
    arrowContainer.addChild(arrowSpriteVertical)
    this.node.addChild(arrowContainer)
    this.updateArrowOpacity()
  }

  createSpineBonesControl() {
    const control = createNode('SpineBonesControlHandles')
    control.zIndex = Infinity
    control.addComponent(new SpineBonesControlRender({ getPoints: () => this.getSpineBoneControlPoints() }))
    this.spineBonesControlNode = control
    this.node.addChild(control)

    const tooltip = document.createElement('div')
    tooltip.style.position = 'fixed'
    tooltip.style.display = 'none'
    tooltip.style.pointerEvents = 'none'
    tooltip.style.zIndex = '2147483646'
    tooltip.style.padding = '3px 6px'
    tooltip.style.borderRadius = '3px'
    tooltip.style.background = 'rgb(20 20 20 / 90%)'
    tooltip.style.color = '#ffffff'
    tooltip.style.font = '12px system-ui, sans-serif'
    document.body.append(tooltip)
    this.spineBoneTooltipNode = tooltip
  }

  getSpineBonesControl() {
    if (this.editingPaths.length !== 1) return undefined
    const editNode = this.getEditingNodeByPath(this.editingPaths[0])
    const componentIndex = editNode?.components?.findIndex((component) => component.tag === 'SpineBonesControl') ?? -1
    if (componentIndex < 0) return undefined
    const points = editNode.components[componentIndex].props?.posList
    if (!Array.isArray(points) && typeof points !== 'string') return undefined
    const bonesNameValue = editNode.components[componentIndex].props?.bonesName
    const bonesName = parseStringsArray(bonesNameValue)
    const values = parseNumbersArray(points)
    const parsedPoints = Array.from({ length: Math.ceil(values.length / 2) }, (_, index) => ({
      x: Number.isFinite(values[index * 2]) ? values[index * 2] : 0,
      y: Number.isFinite(values[index * 2 + 1]) ? values[index * 2 + 1] : 0,
    }))
    return { componentIndex, points, parsedPoints, bonesName }
  }

  updateSpineBoneTooltip(x: number, y: number, clientX: number, clientY: number) {
    if (!this.spineBoneTooltipNode) return
    const control = this.getSpineBonesControl()
    const pointIndex = control
      ? this.getSpineBoneControlPoints().findIndex((point) => Math.hypot(x - point.x, y - point.y) <= 10)
      : -1
    const boneName = pointIndex >= 0 ? control?.bonesName[pointIndex] : undefined
    if (!boneName) {
      this.spineBoneTooltipNode.style.display = 'none'
      return
    }
    this.spineBoneTooltipNode.textContent = boneName
    this.spineBoneTooltipNode.style.left = `${clientX + 12}px`
    this.spineBoneTooltipNode.style.top = `${clientY + 12}px`
    this.spineBoneTooltipNode.style.display = 'block'
  }

  getSpineBoneControlPoints() {
    const control = this.getSpineBonesControl()
    if (!control) return []
    const node = this.getSpineBoneCoordinateNode()
    if (!node) return []
    const radians = (node.worldRotation * Math.PI) / 180
    const cosine = Math.cos(radians)
    const sine = Math.sin(radians)
    return control.parsedPoints.map((point) => {
      const x = point.x * node.worldScaleX
      const y = point.y * node.worldScaleY
      return { x: node.worldX + x * cosine - y * sine, y: node.worldY + x * sine + y * cosine }
    })
  }

  getSpineBoneCoordinateNode() {
    if (!this.editingPaths[0]) return undefined
    let node: Node | undefined = getCurrentNode(this.drawNode, this.getChildrenIndex(this.editingPaths[0]))
    while (node && !node.getComponent(SpineSkeleton)) node = node.parent
    return node
  }

  getActiveSpineBonePoint(x: number, y: number) {
    const control = this.getSpineBonesControl()
    if (!control) return undefined
    const pointIndex = this.getSpineBoneControlPoints().findIndex((point) => Math.hypot(x - point.x, y - point.y) <= 10)
    return pointIndex < 0 ? undefined : { componentIndex: control.componentIndex, pointIndex }
  }

  moveSpineBonePoint(x: number, y: number) {
    if (!this.activeSpineBonePoint || this.editingPaths.length !== 1) return false
    const control = this.getSpineBonesControl()
    if (!control || control.componentIndex !== this.activeSpineBonePoint.componentIndex) return false
    const node = this.getSpineBoneCoordinateNode()
    if (!node) return false
    const radians = (-node.worldRotation * Math.PI) / 180
    const dx = x - node.worldX
    const dy = y - node.worldY
    const localX = (dx * Math.cos(radians) - dy * Math.sin(radians)) / node.worldScaleX
    const localY = (dx * Math.sin(radians) + dy * Math.cos(radians)) / node.worldScaleY
    if (!Number.isFinite(localX) || !Number.isFinite(localY)) return false
    const pointIndex = this.activeSpineBonePoint.pointIndex
    control.parsedPoints[pointIndex] = { x: Math.round(localX), y: Math.round(localY) }
    const editNode = this.getEditingNodeByPath(this.editingPaths[0])
    const component = editNode?.components?.[control.componentIndex]
    if (!component) return false
    const posList = control.parsedPoints.flatMap((point) => [point.x, point.y])
    component.props = {
      ...component.props,
      posList: Array.isArray(control.points)
        ? posList
        : `${String(control.points).startsWith('{') ? '{' : ''}${posList.join(',')}${String(control.points).endsWith('}') ? '}' : ''}`,
    }
    const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(this.editingPaths[0]))
    const liveControl = currentNode.getComponent(SpineBonesControl)
    if (liveControl) liveControl.props.posList = posList
    this.syncEditingFlag()
    window.postMessage({
      type: 'previewUpdateSelectedNodes',
      selectPaths: this.editingPaths,
      nodes: [{ component: 'components', updated: editNode.components }],
    }, '*')
    return true
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
    if (this.saveDialogNode) return

    const dialog = document.createElement('div')
    dialog.style.position = 'fixed'
    dialog.style.inset = '0'
    dialog.style.display = 'none'
    dialog.style.alignItems = 'center'
    dialog.style.justifyContent = 'center'
    dialog.style.background = 'rgb(0 0 0 / 60%)'
    dialog.style.zIndex = '2147483647'

    const panel = document.createElement('div')
    panel.style.width = 'min(360px, calc(100vw - 48px))'
    panel.style.border = '1px solid #3c3c3c'
    panel.style.borderRadius = '6px'
    panel.style.background = '#252526'
    panel.style.boxShadow = '0 16px 40px rgb(0 0 0 / 45%)'
    panel.style.color = '#dcdcdc'
    panel.style.padding = '18px'
    panel.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

    const title = document.createElement('div')
    title.textContent = 'Unsaved component changes'
    title.style.fontSize = '16px'
    title.style.fontWeight = '600'
    title.style.marginBottom = '8px'

    const message = document.createElement('div')
    message.textContent = 'Do you want to save before loading the component preview?'
    message.style.fontSize = '13px'
    message.style.lineHeight = '1.4'
    message.style.color = '#c8c8c8'
    message.style.marginBottom = '18px'

    const actions = document.createElement('div')
    actions.style.display = 'flex'
    actions.style.justifyContent = 'flex-end'
    actions.style.gap = '8px'

    const reloadButton = this.createDialogButton('Reload', false, () => void this.loadComponent(this.pendingLoadPath || GlobalState.tempFilePath))
    const saveButton = this.createDialogButton('Save', true, () => void this.saveAndLoadTemp())

    actions.append(reloadButton, saveButton)
    panel.append(title, message, actions)
    dialog.append(panel)
    document.body.append(dialog)
    this.saveDialogNode = dialog
  }

  createDialogButton(label: string, primary: boolean, onClick: () => void) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.style.minWidth = '82px'
    button.style.height = '32px'
    button.style.border = primary ? '1px solid #0e639c' : '1px solid #3c3c3c'
    button.style.borderRadius = '4px'
    button.style.background = primary ? '#0e639c' : '#2d2d30'
    button.style.color = '#ffffff'
    button.style.cursor = 'pointer'
    button.style.fontSize = '13px'
    button.addEventListener('click', onClick)
    return button
  }

  showSaveDialog(path: string) {
    this.pendingLoadPath = path
    if (!this.saveDialogNode) this.createSaveDialog()
    if (this.saveDialogNode) this.saveDialogNode.style.display = 'flex'
  }

  hideSaveDialog() {
    if (this.saveDialogNode) this.saveDialogNode.style.display = 'none'
    this.pendingLoadPath = ''
  }

  isSaveDialogVisible() {
    return Boolean(this.saveDialogNode && this.saveDialogNode.style.display !== 'none')
  }

  async saveAndLoadTemp() {
    await this.saveComponent()
    await this.loadComponent(this.pendingLoadPath || GlobalState.tempFilePath)
  }

  async loadComponent(path: string) {
    if (!path) return
    if (this.loadingPath === path) return
    this.loadingPath = path
    try {
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
      this.hideSaveDialog()
      this.isEditing = false
      this.updateArrowPosition()
    } finally {
      this.loadingPath = ''
    }
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

  getEditingNodeByPath(editingPath = '') {
    const childrenIndex = this.getChildrenIndex(editingPath)
    const indexes = [...childrenIndex]
    let editNode = getEditingRoot(this.editingComponent, indexes)
    indexes.forEach((index) => {
      if (!editNode) return
      const { tag } = editNode
      const componentChildrenNum = getComponentChildrenNum(tag)
      if (editNode.children?.[index - componentChildrenNum]) editNode = editNode.children[index - componentChildrenNum]
    })
    return editNode
  }

  async reloadEditingComponent() {
    this.drawNode.destroy()
    this.createDrawNode()
    await loadSceneViewSdl({ name: this.editingComponentName, treeData: this.editingComponent }, GlobalState.data, this.drawNode)
    this.syncEditingFlag()
    this.updateArrowPosition()
  }

  async updateSelectedNode(component: string, updated: any) {
    if (!component || !this.editingPaths[0]) return
    this.pushUndoHistory()
    for (const editingPath of this.editingPaths) {
      const editNode = this.getEditingNodeByPath(editingPath)
      if (!editNode) continue
      if (component === 'props' && updated.node) {
        editNode.props = {
          ...editNode.props,
          ...cloneDeep(updated),
          node: { ...editNode.props?.node, ...cloneDeep(updated.node) },
        }
      } else {
        editNode[component] = Array.isArray(updated) ? cloneDeep(updated) : { ...editNode[component], ...cloneDeep(updated) }
      }
      if (component === 'props') normalizeNodeProps(editNode.props)
    }
    await this.reloadEditingComponent()
    const control = this.getSpineBonesControl()
    if (control) {
      const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(this.editingPaths[0]))
      const liveControl = currentNode?.getComponent(SpineBonesControl)
      if (liveControl) liveControl.props.posList = control.parsedPoints.flatMap((point) => [point.x, point.y])
    }
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
    if (!editNode) return ''

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
    return this.editingPaths.some((editingPath) => {
      const editNode = this.getEditingNodeByPath(editingPath)
      const widgetProps = editNode?.components?.find((component) => component.tag === 'Widget')?.props || {}
      return (!parseBoolFromValue(widgetProps.centerHorizon) && moveX)
        || (!parseBoolFromValue(widgetProps.centerVertical) && moveY)
    })
  }

  syncWidgetInsets(editNode: any, currentNode: Node) {
    const widget = editNode?.components?.find((component) => component.tag === 'Widget')
    if (!widget) return false
    widget.props ??= {}
    const { width: designWidth = 0, height: designHeight = 0 } = GlobalState.data.designedResolution || {}
    const insets = {
      top: currentNode.y - currentNode.height * currentNode.anchorY,
      right: designWidth - currentNode.x - currentNode.width * (1 - currentNode.anchorX),
      bottom: designHeight - currentNode.y - currentNode.height * (1 - currentNode.anchorY),
      left: currentNode.x - currentNode.width * currentNode.anchorX,
    }
    let didUpdate = false
    Object.entries(insets).forEach(([direction, value]) => {
      if (widget.props[direction] !== undefined && widget.props[direction] !== null) {
        widget.props[direction] = Math.round(value)
        didUpdate = true
      }
    })
    if (!didUpdate) return false
    updatePreviewWidgetInsets(currentNode, widget.props)
    return true
  }

  moveSelectedNode(mx = 0, my = 0) {
    const moveX = this.lockX ? 0 : mx
    const moveY = this.lockY ? 0 : my
    if (!this.canMoveSelectedNode(mx, my)) return false
    const updatedNodes: Array<{ component: string; updated: any }> = []
    const updatedWidgets: Array<{ component: string; updated: any }> = []
    let didUpdateWidget = false
    this.editingPaths.forEach((editingPath) => {
      const childrenIndex = this.getChildrenIndex(editingPath)
      const currentNode = getCurrentNode(this.drawNode, childrenIndex)
      const indexes = [...childrenIndex]
      let editNode = getEditingRoot(this.editingComponent, indexes)
      indexes.forEach((index) => {
        const { tag } = editNode
        const componentChildrenNum = getComponentChildrenNum(tag)
        if (editNode.children[index - componentChildrenNum]) editNode = editNode.children[index - componentChildrenNum]
      })
      const widgetProps = editNode?.components?.find((component) => component.tag === 'Widget')?.props || {}
      const nodeMoveX = parseBoolFromValue(widgetProps.centerHorizon) ? 0 : moveX
      const nodeMoveY = parseBoolFromValue(widgetProps.centerVertical) ? 0 : moveY
      currentNode.x = (isNumber(currentNode.x) ? currentNode.x : 0) + nodeMoveX
      currentNode.y = (isNumber(currentNode.y) ? currentNode.y : 0) + nodeMoveY
      const nx = Math.round(currentNode.x)
      const ny = Math.round(currentNode.y)
      setNodePositionProps(editNode.props, nx, ny)
      normalizeNodeProps(editNode.props)
      updatedNodes.push({ component: 'props', updated: editNode.props })
      if (this.syncWidgetInsets(editNode, currentNode)) {
        didUpdateWidget = true
      }
      updatedWidgets.push({ component: 'components', updated: editNode.components })
    })
    this.syncEditingFlag()
    window.postMessage({ type: 'previewUpdateSelectedNodes', selectPaths: this.editingPaths, nodes: updatedNodes }, '*')
    if (didUpdateWidget) {
      window.postMessage({ type: 'previewUpdateSelectedNodes', selectPaths: this.editingPaths, nodes: updatedWidgets }, '*')
    }
    return true
  }

  moveSelectedNodeWithHistory(mx: number, my: number) {
    if (!this.canMoveSelectedNode(mx, my)) return
    this.pushUndoHistory()
    this.moveSelectedNode(mx, my)
    this.updateArrowPosition()
  }

  moveSelectionAnchor(dx: number, dy: number) {
    if (this.editingPaths.length !== 1) return false
    const editingPath = this.editingPaths[0]
    const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(editingPath))
    const parent = currentNode.parent ?? this.drawNode
    const parentScaleX = parent.worldScaleX || this.drawNode.scaleX || 1
    const parentScaleY = parent.worldScaleY || this.drawNode.scaleY || 1
    const width = currentNode.width
    const height = currentNode.height
    const worldScaleX = currentNode.worldScaleX || 1
    const worldScaleY = currentNode.worldScaleY || 1
    const scaleX = worldScaleX / parentScaleX
    const scaleY = worldScaleY / parentScaleY
    const anchorX = width ? Number((currentNode.anchorX + dx / (width * worldScaleX)).toFixed(3)) : currentNode.anchorX
    const anchorY = height ? Number((currentNode.anchorY + dy / (height * worldScaleY)).toFixed(3)) : currentNode.anchorY
    if (anchorX === currentNode.anchorX && anchorY === currentNode.anchorY) return false

    currentNode.x += (anchorX - currentNode.anchorX) * width * scaleX
    currentNode.y += (anchorY - currentNode.anchorY) * height * scaleY
    currentNode.anchorX = anchorX
    currentNode.anchorY = anchorY

    const editNode = this.getEditingNodeByPath(editingPath)
    if (!editNode) return false
    editNode.props ??= {}
    editNode.props.node ??= {}
    editNode.props.node.anchorX = anchorX
    editNode.props.node.anchorY = anchorY
    setNodePositionProps(editNode.props, Math.round(currentNode.x), Math.round(currentNode.y))
    normalizeNodeProps(editNode.props)
    const didUpdateWidget = this.syncWidgetInsets(editNode, currentNode)
    this.syncEditingFlag()
    window.postMessage({
      type: 'previewUpdateSelectedNodes',
      selectPaths: this.editingPaths,
      nodes: [{ component: 'props', updated: editNode.props }],
    }, '*')
    if (didUpdateWidget) {
      window.postMessage({
        type: 'previewUpdateSelectedNodes',
        selectPaths: [editingPath],
        nodes: [{ component: 'components', updated: editNode.components }],
      }, '*')
    }
    return true
  }

  resizeSelectedNode(handle: ResizeHandle, dx: number, dy: number) {
    if (this.editingPaths.length !== 1) return false
    const editingPath = this.editingPaths[0]
    const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(editingPath))
    const nodeScaleX = currentNode.worldScaleX || 1
    const nodeScaleY = currentNode.worldScaleY || 1
    const horizontalEdge = handle.endsWith('left') ? 'left' : handle.endsWith('right') ? 'right' : undefined
    const verticalEdge = handle.startsWith('top') ? 'top' : handle.startsWith('bottom') ? 'bottom' : undefined
    const newWidth = horizontalEdge && !this.lockX
      ? Math.max(1, Math.round(currentNode.width + (horizontalEdge === 'right' ? dx : -dx) / nodeScaleX))
      : currentNode.width
    const newHeight = verticalEdge && !this.lockY
      ? Math.max(1, Math.round(currentNode.height + (verticalEdge === 'bottom' ? dy : -dy) / nodeScaleY))
      : currentNode.height
    const didResizeWidth = newWidth !== currentNode.width
    const didResizeHeight = newHeight !== currentNode.height
    if (!didResizeWidth && !didResizeHeight) return false

    if (didResizeWidth) currentNode.width = newWidth
    if (didResizeHeight) currentNode.height = newHeight

    const editNode = this.getEditingNodeByPath(editingPath)
    if (!editNode) return false
    editNode.props ??= {}
    editNode.props.node ??= {}
    if (didResizeWidth) editNode.props.node.width = newWidth
    if (didResizeHeight) editNode.props.node.height = newHeight
    normalizeNodeProps(editNode.props)
    const didUpdateWidget = this.syncWidgetInsets(editNode, currentNode)
    this.syncEditingFlag()
    window.postMessage({
      type: 'previewUpdateSelectedNodes',
      selectPaths: this.editingPaths,
      nodes: [{ component: 'props', updated: editNode.props }],
    }, '*')
    if (didUpdateWidget) {
      window.postMessage({
        type: 'previewUpdateSelectedNodes',
        selectPaths: [editingPath],
        nodes: [{ component: 'components', updated: editNode.components }],
      }, '*')
    }
    return true
  }

  getRotationAngle(node: Node, x: number, y: number) {
    return Math.atan2(y - node.worldY, x - node.worldX) * 180 / Math.PI
  }

  rotateSelectedNode(x: number, y: number) {
    if (this.editingPaths.length !== 1 || !this.rotationDragStart) return false
    const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(this.editingPaths[0]))
    const angle = this.getRotationAngle(currentNode, x, y)
    let angleDelta = angle - this.rotationDragStart.angle
    if (angleDelta > 180) angleDelta -= 360
    if (angleDelta < -180) angleDelta += 360
    const rotation = Math.round(this.rotationDragStart.rotation + angleDelta)
    if (rotation === currentNode.rotation) return false
    currentNode.rotation = rotation
    const editNode = this.getEditingNodeByPath(this.editingPaths[0])
    if (!editNode) return false
    editNode.props ??= {}
    editNode.props.node ??= {}
    editNode.props.node.rotation = rotation
    normalizeNodeProps(editNode.props)
    this.syncEditingFlag()
    window.postMessage({
      type: 'previewUpdateSelectedNodes',
      selectPaths: this.editingPaths,
      nodes: [{ component: 'props', updated: editNode.props }],
    }, '*')
    return true
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

  changeSelectPath(paths: string[], notify = true) {
    this.editingPaths = [...new Set(paths.map((path) => this.getEditablePath(path)).filter(Boolean))]
    this.updateArrowPosition()
    if (notify) window.postMessage({ type: 'previewSelectPaths', selectPaths: this.editingPaths }, '*')
  }

  focusNode(path: string) {
    const editablePath = this.getEditablePath(path)
    if (!editablePath) return
    this.changeSelectPath([editablePath], false)
    const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(editablePath))
    const nodeBounds = this.getNodeBounds(currentNode)
    const nodeCenterX = nodeBounds ? (nodeBounds.left + nodeBounds.right) / 2 : currentNode.worldX
    const nodeCenterY = nodeBounds ? (nodeBounds.top + nodeBounds.bottom) / 2 : currentNode.worldY
    const canvas = document.querySelector<HTMLCanvasElement>('#sdl-canvas')
    const canvasBounds = canvas?.getBoundingClientRect()
    const previewBounds = canvas?.parentElement?.getBoundingClientRect()
    const canvasScale = canvasBounds?.width ? this.logicalCanvasWidth / canvasBounds.width : 1
    const previewCenterX = canvasBounds && previewBounds
      ? (previewBounds.left + previewBounds.width / 2 - canvasBounds.left) * canvasScale
      : this.logicalCanvasWidth / 2
    const previewCenterY = canvasBounds && previewBounds
      ? (previewBounds.top + previewBounds.height / 2 - canvasBounds.top) * canvasScale
      : window.innerHeight / 2
    const offsetX = previewCenterX - nodeCenterX
    const offsetY = previewCenterY - nodeCenterY
    this.drawNode.x += offsetX
    this.drawNode.y += offsetY
    this.borderNode.x = this.drawNode.x
    this.borderNode.y = this.drawNode.y
    setLastSceneX(this.drawNode.x)
    setLastSceneY(this.drawNode.y)
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
      this.selectionCornerNodes.forEach((corner) => (corner.active = false))
      this.rotationHandleNode.active = false
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
    const bounds = this.getNodeBounds(currentNode)
    if (!bounds) return
    this.rotationHandleNode.active = true
    this.rotationHandleNode.x = (bounds.left + bounds.right) / 2 - this.arrowContainerNode.x
    this.rotationHandleNode.y = bounds.top - this.arrowContainerNode.y - PreviewScene.ROTATION_HANDLE_OFFSET
    const cornerPositions = [
      [bounds.left, bounds.top],
      [bounds.right, bounds.top],
      [bounds.left, bounds.bottom],
      [bounds.right, bounds.bottom],
    ]
    this.selectionCornerNodes.forEach((corner, index) => {
      corner.active = true
      corner.x = cornerPositions[index][0] - this.arrowContainerNode.x
      corner.y = cornerPositions[index][1] - this.arrowContainerNode.y
    })
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
    if (width && height) {
      const x1 = node.worldX - node.anchorX * width
      const y1 = node.worldY - node.anchorY * height
      const x2 = x1 + width
      const y2 = y1 + height
      return this.getSelectionBounds(x1, y1, x2, y2)
    }
    return this.getSpineSkeletonBounds(node)
  }

  getSpineSkeletonBounds(node: Node): SelectionBounds | undefined {
    const skeleton = node.getComponent(SpineSkeleton)?.skeleton
    if (!skeleton) return undefined
    const radians = (node.worldRotation * Math.PI) / 180
    const cosine = Math.cos(radians)
    const sine = Math.sin(radians)
    const scaleX = node.worldScaleX ?? 1
    const scaleY = node.worldScaleY ?? 1
    let result: SelectionBounds | undefined
    const includeVertices = (vertices: Float32Array) => {
      for (let index = 0; index < vertices.length; index += 2) {
        const scaledX = vertices[index] * scaleX
        const scaledY = vertices[index + 1] * scaleY
        const x = node.worldX + scaledX * cosine - scaledY * sine
        const y = node.worldY + scaledX * sine + scaledY * cosine
        if (!result) {
          result = { left: x, top: y, right: x, bottom: y }
          continue
        }
        result.left = Math.min(result.left, x)
        result.top = Math.min(result.top, y)
        result.right = Math.max(result.right, x)
        result.bottom = Math.max(result.bottom, y)
      }
    }
    skeleton.drawOrder.forEach((slot) => {
      const attachment = slot.getAttachment()
      if (!slot.bone.active || !attachment) return
      if (attachment instanceof RegionAttachment) {
        const vertices = new Float32Array(8)
        attachment.computeWorldVertices(slot, vertices, 0, 2)
        includeVertices(vertices)
      } else if (attachment instanceof MeshAttachment) {
        const vertices = new Float32Array(attachment.worldVerticesLength)
        attachment.computeWorldVertices(slot, 0, attachment.worldVerticesLength, vertices, 0, 2)
        includeVertices(vertices)
      }
    })
    return result
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
    const bounds = this.getNodeBounds(node)
    if (!bounds) return false
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom
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
      return 'anchor' as const
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

  getActiveResizeEdge(x: number, y: number) {
    if (this.editingPaths.length !== 1) return undefined
    const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(this.editingPaths[0]))
    const bounds = this.getNodeBounds(currentNode)
    if (!bounds) return undefined
    const hitSize = PreviewScene.RESIZE_EDGE_HIT_SIZE
    if (Math.abs(x - bounds.left) <= hitSize && Math.abs(y - bounds.top) <= hitSize) return 'top-left' as const
    if (Math.abs(x - bounds.right) <= hitSize && Math.abs(y - bounds.top) <= hitSize) return 'top-right' as const
    if (Math.abs(x - bounds.left) <= hitSize && Math.abs(y - bounds.bottom) <= hitSize) return 'bottom-left' as const
    if (Math.abs(x - bounds.right) <= hitSize && Math.abs(y - bounds.bottom) <= hitSize) return 'bottom-right' as const
    if (y >= bounds.top - hitSize && y <= bounds.bottom + hitSize) {
      if (Math.abs(x - bounds.left) <= hitSize) return 'left' as const
      if (Math.abs(x - bounds.right) <= hitSize) return 'right' as const
    }
    if (x >= bounds.left - hitSize && x <= bounds.right + hitSize) {
      if (Math.abs(y - bounds.top) <= hitSize) return 'top' as const
      if (Math.abs(y - bounds.bottom) <= hitSize) return 'bottom' as const
    }
    return undefined
  }

  getActiveRotationHandle(x: number, y: number) {
    if (this.editingPaths.length !== 1 || !this.rotationHandleNode.active) return false
    const radius = this.rotationHandleNode.width / 2 + 4
    return Math.hypot(x - this.rotationHandleNode.worldX, y - this.rotationHandleNode.worldY) <= radius
  }

  onTouchStart(event: Touch) {
    if (this.isSaveDialogVisible()) return
    const { x, y } = event
    this.lastTouch = { x, y }
    this.didCaptureDragHistory = false
    this.marqueeSelection = undefined
    if (this.isMiddleMouse) {
      this.activeArrowAxis = undefined
      this.activeResizeEdge = undefined
      this.isRotating = false
      this.activeSpineBonePoint = undefined
      this.rotationDragStart = undefined
      this.updateArrowOpacity()
      return
    }
    const isModifierSelecting = this.isMultiSelectModifierPressed && !this.isMiddleMouse
    this.activeSpineBonePoint = isModifierSelecting || this.isShiftPressed ? undefined : this.getActiveSpineBonePoint(x, y)
    if (this.activeSpineBonePoint) {
      this.pushUndoHistory()
      this.didCaptureDragHistory = true
      this.activeArrowAxis = undefined
      this.activeResizeEdge = undefined
      this.isRotating = false
      this.rotationDragStart = undefined
      this.updateArrowOpacity()
      return
    }
    this.isRotating = !isModifierSelecting && this.getActiveRotationHandle(x, y)
    if (this.isRotating) {
      const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(this.editingPaths[0]))
      this.rotationDragStart = { angle: this.getRotationAngle(currentNode, x, y), rotation: currentNode.rotation }
    } else {
      this.rotationDragStart = undefined
    }
    const activeArrowAxis = this.isRotating || isModifierSelecting || !this.editingPaths[0]
      ? undefined
      : this.getActiveArrowAxis(x, y)
    this.activeArrowAxis = activeArrowAxis === 'anchor' ? activeArrowAxis : undefined
    this.activeResizeEdge = this.isRotating || isModifierSelecting || this.activeArrowAxis
      ? undefined
      : this.getActiveResizeEdge(x, y)
    if (!this.activeArrowAxis && !this.activeResizeEdge) this.activeArrowAxis = activeArrowAxis
    if (this.isShiftPressed && !this.isMiddleMouse) {
      this.activeArrowAxis = undefined
      this.activeResizeEdge = undefined
      this.isRotating = false
      this.rotationDragStart = undefined
      this.marqueeSelection = { startX: x, startY: y, currentX: x, currentY: y, active: false }
      this.marqueeSelectionNode.active = false
      this.updateArrowOpacity()
      return
    }
    if (!this.isRotating && !this.activeResizeEdge && !this.activeArrowAxis && !this.isMiddleMouse) {
      const selectedPath = this.findSelectionPath(x, y)
      if (isModifierSelecting) {
        this.toggleSelectPath(selectedPath)
      } else if (selectedPath) {
        this.changeSelectPath([selectedPath])
      }
    }
    this.updateArrowOpacity()
  }

  onTouchMove(event: Touch) {
    if (this.isSaveDialogVisible()) return
    const { x, y } = event
    if (this.isMiddleMouse && this.middleMouseSelectionPaths && this.editingPaths.join(',') !== this.middleMouseSelectionPaths.join(',')) {
      this.changeSelectPath(this.middleMouseSelectionPaths)
    }
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
    if (this.activeSpineBonePoint) {
      this.moveSpineBonePoint(x, y)
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
      const selectedNode = getCurrentNode(this.drawNode, this.getChildrenIndex(this.editingPaths[0]))
      if (this.isRotating) {
        if (!this.didCaptureDragHistory) {
          this.pushUndoHistory()
          this.didCaptureDragHistory = true
        }
        this.rotateSelectedNode(x, y)
        this.updateArrowPosition()
        return
      }
      if (this.activeResizeEdge) {
        if (!this.didCaptureDragHistory) {
          this.pushUndoHistory()
          this.didCaptureDragHistory = true
        }
        this.resizeSelectedNode(this.activeResizeEdge, dx, dy)
        this.updateArrowPosition()
        return
      }
      if (this.activeArrowAxis === 'anchor') {
        if (!this.didCaptureDragHistory) {
          this.pushUndoHistory()
          this.didCaptureDragHistory = true
        }
        this.moveSelectionAnchor(dx, dy)
        this.updateArrowPosition()
        return
      }
      const selectedParent = selectedNode.parent ?? this.drawNode
      const parentScaleX = selectedParent.worldScaleX || this.drawNode.scaleX || 1
      const parentScaleY = selectedParent.worldScaleY || this.drawNode.scaleY || 1
      const moveX = this.activeArrowAxis === 'y' ? 0 : dx / parentScaleX
      const moveY = this.activeArrowAxis === 'x' ? 0 : dy / parentScaleY
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
    this.activeResizeEdge = undefined
    this.isRotating = false
    this.activeSpineBonePoint = undefined
    this.rotationDragStart = undefined
    this.didCaptureDragHistory = false
    this.updateArrowOpacity()
  }
}
