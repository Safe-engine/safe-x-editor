import { Label, loadAll, Node, SpineBonesControl, SpineSkeleton, Sprite, Touch, UILayout } from '@safe-engine/sdl'
import { getLastLoadedFile, getLastRootFolder, getLastSceneScale, getLastSceneX, getLastSceneY, setLastSceneScale, setLastSceneX, setLastSceneY } from 'data/AppData'
import { GlobalState } from 'data/GloablState'
import { normalizeNodeProps, parseBoolFromValue, parseFloatFromValue } from 'helper/node'
import { cloneDeep, first, isNumber, parseInt, set } from 'lodash-es'
import toast from 'react-hot-toast'
import { sendRequest } from '../app.ipc'
import { arrow } from './assets'
import { CircleRender } from './CircleRender'
import { parseBoneControls, updatePreviewWidgetInsets } from './component'
import { GridRender } from './GridRender'
import { loadSceneViewSdl, preloadSdlAssets, RectRender } from './loader'
import { registerKeyboardHandler, registerMessageHandler, registerMouseHandler } from './PreviewSceneEvents'
import { PreviewSceneSelection } from './PreviewSceneSelection'
import { SpineBonesControlRender } from './SpineBonesControlRender'
import { createNode, getComponentChildrenNum, getCurrentNode, getEditingRoot, setNodePositionProps } from './utils'

let assetVersion = 0

function versionAssets(assets: any) {
  const version = ++assetVersion
  const versionValue = (value: any) => typeof value === 'string'
    ? `${value}${value.includes('?') ? '&' : '?'}previewVersion=${version}`
    : value
  const versionList = (items: any[] = []) => items.map((item) => ({ ...item, value: versionValue(item.value) }))

  return {
    ...assets,
    assetsTextureList: versionList(assets?.assetsTextureList),
    spriteFramesAssets: versionList(assets?.spriteFramesAssets),
  }
}

export class PreviewScene extends PreviewSceneSelection {
  static readonly SELECTION_ANCHOR_SIZE = 16
  static readonly RESIZE_CORNER_SIZE = 12
  static readonly ROTATION_HANDLE_SIZE = 14
  static readonly MARQUEE_DRAG_THRESHOLD = 4

  arrowContainerNode: Node
  arrowSpriteHorizonNode: Node
  arrowSpriteVerticalNode: Node
  selectionBorderNode: Node
  selectionAnchorNode: Node
  selectionCornerNodes: Node[]
  rotationHandleNode: Node
  boxColliderEditorNode?: Node
  marqueeSelectionNode: Node
  spineBonesControlNode: Node
  spineBoneTooltipNode?: HTMLDivElement
  saveDialogNode?: HTMLDivElement
  drawNode: Node
  borderNode: Node
  isEditing = false
  isMiddleMouse = false
  isRightMouse = false
  isPanMouse = false
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
  projectDataLoading?: Promise<void>
  didCaptureDragHistory = false
  logicalCanvasWidth = window.innerWidth
  lastTouch?: { x: number; y: number }
  panSelectionPaths?: string[]
  middleMouseSelectionPaths?: string[]
  activeArrowAxis?: 'x' | 'y' | 'move' | 'anchor'
  activeScaleCorner?: 'top-left' | 'top-right'
  activeResizeEdge?: ResizeHandle
  isRotating = false
  activeSpineBonePoint?: { componentIndex: number; pointIndex: number }
  activeBoxColliderOffset?: { componentIndex: number }
  activeBoxColliderResizeEdge?: 'left' | 'right' | 'top' | 'bottom'
  boxColliderEditor?: { path: string; componentIndex: number }
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
    registerKeyboardHandler(this)
  }

  mouseHandler() {
    registerMouseHandler(this)
  }

  messageHandler() {
    registerMessageHandler(this)
  }

  async loadProjectData() {
    const rootProject = getLastRootFolder()
    if (!rootProject) return
    const data: any = await sendRequest({
      key: 'GET_FOLDER_FILES',
      src: rootProject,
    })
    const { designedResolution, assets, componentsCache, colors, defaultProps, jsonCaches, staticPropsMap, enumsList, projectName, ...rest } = data
    GlobalState.data = {
      ...versionAssets(assets),
      ...rest,
      componentsCache,
      designedResolution,
      colors,
      defaultProps,
      jsonCaches,
      staticPropsMap,
      enumsList,
    }
    if (projectName) document.title = projectName
    const defaultFontKey = 'REPLACE_WITH_DEFAULT_FONT_PATH'
    const defaultFontSize = Number.parseInt('REPLACE_WITH_DEFAULT_FONT_SIZE', 10)
    const defaultFont = assets?.fontAssets?.find((font) => font.key === defaultFontKey)?.value ?? assets?.fontAssets?.[0]?.value
    if (Number.isFinite(defaultFontSize) && defaultFontSize > 0) Label.defaultSize = defaultFontSize
    if (defaultFont) Label.defaultFont = defaultFont
    await preloadSdlAssets(assets)
    await loadAll([arrow]).catch(() => undefined)
  }

  async reloadProjectData() {
    const projectDataLoading = this.loadProjectData()
    this.projectDataLoading = projectDataLoading
    try {
      await projectDataLoading
      this.borderNode.width = GlobalState.data.designedResolution.width
      this.borderNode.height = GlobalState.data.designedResolution.height
      if (!this.loadingPath) await this.reloadEditingComponent()
    } finally {
      if (this.projectDataLoading === projectDataLoading) this.projectDataLoading = undefined
    }
  }

  setRootScale(offset: number, focus?: { x: number; y: number }) {
    const scale = getLastSceneScale()
    let value = scale + offset
    if (value < 0.1) value = 0.1
    if (value > 2) value = 2
    if (focus && value !== scale) {
      const x = focus.x - (focus.x - this.drawNode.x) * value / scale
      const y = focus.y - (focus.y - this.drawNode.y) * value / scale
      this.drawNode.x = this.borderNode.x = x
      this.drawNode.y = this.borderNode.y = y
      setLastSceneX(x)
      setLastSceneY(y)
    }
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
    this.drawNode.addComponent(new GridRender())
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
    selectionCorners.forEach((corner, index) => {
      corner.width = PreviewScene.RESIZE_CORNER_SIZE
      corner.height = PreviewScene.RESIZE_CORNER_SIZE
      corner.anchorX = 0.5
      corner.anchorY = 0.5
      corner.zIndex = -1
      corner.addComponent(
        new RectRender({
          fillColor: index < 2 ? { r: 219, g: 234, b: 254, a: 255 } : { r: 254, g: 243, b: 199, a: 255 },
          strokeColor: index < 2 ? { r: 37, g: 99, b: 235, a: 255 } : { r: 217, g: 119, b: 6, a: 255 },
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
    arrowSpriteVertical.anchorY = 1
    arrowSpriteVertical.y = 48
    arrowSpriteVertical.color = { r: 255, g: 0, b: 0, a: 255 }
    arrowSpriteHorizon.anchorY = 1
    arrowSpriteHorizon.x = 48
    arrowSpriteHorizon.rotation = 90
    arrowSpriteVertical.rotation = 180
    selectionBorder.zIndex = -2
    selectionAnchor.zIndex = -1
    this.arrowContainerNode.zIndex = Number.MAX_SAFE_INTEGER
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
    control.zIndex = Number.MAX_SAFE_INTEGER - 1
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
    const bonesValue = parseBoneControls(editNode.components[componentIndex].props?.bones)
    // console.log('getSpineBonesControl', bonesValue, editNode.components[componentIndex].props?.bones)
    return { componentIndex, bones: bonesValue }
  }

  updateSpineBoneTooltip(x: number, y: number, clientX: number, clientY: number) {
    if (!this.spineBoneTooltipNode) return
    const control = this.getSpineBonesControl()
    const pointIndex = control
      ? this.getSpineBoneControlPoints().findIndex((point) => Math.hypot(x - point.x, y - point.y) <= 10)
      : -1
    const boneName = pointIndex >= 0 ? control?.bones[pointIndex][0] : undefined
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
    return control.bones.map(([, x, y]) => {
      x *= node.worldScaleX
      y *= node.worldScaleY
      return { x: node.worldX + x * cosine - y * sine, y: node.worldY + x * sine - y * cosine }
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
    const localY = (dx * Math.sin(radians) - dy * Math.cos(radians)) / node.worldScaleY
    if (!Number.isFinite(localX) || !Number.isFinite(localY)) return false
    const pointIndex = this.activeSpineBonePoint.pointIndex
    control.bones[pointIndex] = [control.bones[pointIndex][0], Math.round(localX), Math.round(localY)]
    const editNode = this.getEditingNodeByPath(this.editingPaths[0])
    const component = editNode?.components?.[control.componentIndex]
    if (!component) return false
    component.props = {
      ...component.props,
      bones: control.bones,
    }
    const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(this.editingPaths[0]))
    const liveControl = currentNode.getComponent(SpineBonesControl)
    if (liveControl) liveControl.props.bones = control.bones
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
    marqueeSelection.zIndex = Number.MAX_SAFE_INTEGER - 2
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
    this.notifyEditingState()
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
      await this.projectDataLoading
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
      this.notifyEditingState()
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
    this.notifyEditingState()
  }

  notifyEditingState() {
    window.postMessage({ type: 'previewEditingState', isEditing: this.isEditing }, '*')
  }

  async restoreHistoryEntry(historyEntry: HistoryEntry) {
    this.editingComponent = cloneDeep(historyEntry.editingComponent)
    this.editingPaths = [...historyEntry.editingPaths]
    this.drawNode.destroy()
    this.createDrawNode()
    await loadSceneViewSdl({ name: this.editingComponentName, treeData: this.editingComponent }, GlobalState.data, this.drawNode)
    this.syncEditingFlag()
    this.updateBoxColliderEditor()
    this.updateArrowPosition()
    window.postMessage({ type: 'previewRestoreComponentTree', treeData: this.editingComponent, selectPaths: this.editingPaths }, '*')
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
    this.updateBoxColliderEditor()
    this.updateArrowPosition()
  }

  toggleBoxColliderEditor(componentIndex?: number) {
    if (componentIndex === undefined || !this.editingPaths[0]) {
      this.boxColliderEditor = undefined
      this.updateBoxColliderEditor()
      return
    }
    this.boxColliderEditor = { path: this.editingPaths[0], componentIndex }
    this.updateBoxColliderEditor()
  }

  updateBoxColliderEditor() {
    this.boxColliderEditorNode?.destroy()
    this.boxColliderEditorNode = undefined
    const editor = this.boxColliderEditor
    if (!editor || this.editingPaths.length !== 1 || this.editingPaths[0] !== editor.path) return
    const editNode = this.getEditingNodeByPath(editor.path)
    const component = editNode?.components?.[editor.componentIndex]
    if (!component || !['BoxCollider', 'PhysicsBoxCollider'].includes(component.tag)) return
    const [offsetX = 0, offsetY = 0] = String(component.props?.offset ?? '0, 0').match(/-?\d+(\.\d+)?/g)?.map(Number) || []
    const node = createNode('BoxColliderEditor')
    node.width = parseFloatFromValue(component.props?.width) || 0
    node.height = parseFloatFromValue(component.props?.height) || 0
    node.x = offsetX
    node.y = offsetY
    node.anchorX = 0.5
    node.anchorY = 0.5
    node.zIndex = Infinity
    node.addComponent(new RectRender({ fillColor: { r: 59, g: 130, b: 246, a: 40 }, strokeColor: { r: 96, g: 165, b: 250, a: 255 }, lineWidth: 2 }))
    const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(editor.path))
    currentNode?.addChild(node)
    this.boxColliderEditorNode = node
  }

  getActiveBoxColliderEditor(x: number, y: number) {
    const node = this.boxColliderEditorNode
    if (!node || !this.boxColliderEditor) return undefined
    return this.isPointInsideNode(node, x, y) ? { componentIndex: this.boxColliderEditor.componentIndex } : undefined
  }

  getActiveBoxColliderResizeEdge(x: number, y: number) {
    const node = this.boxColliderEditorNode
    if (!node) return undefined
    const bounds = this.getNodeBounds(node)
    if (!bounds) return undefined
    const hitSize = PreviewScene.RESIZE_EDGE_HIT_SIZE
    if (x >= bounds.left - hitSize && x <= bounds.right + hitSize) {
      if (Math.abs(y - bounds.top) <= hitSize) return 'top' as const
      if (Math.abs(y - bounds.bottom) <= hitSize) return 'bottom' as const
    }
    if (y >= bounds.top - hitSize && y <= bounds.bottom + hitSize) {
      if (Math.abs(x - bounds.left) <= hitSize) return 'left' as const
      if (Math.abs(x - bounds.right) <= hitSize) return 'right' as const
    }
    return undefined
  }

  moveBoxColliderOffset(x: number, y: number) {
    const active = this.activeBoxColliderOffset
    const editor = this.boxColliderEditor
    if (!active || !editor || this.editingPaths.length !== 1) return false
    const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(editor.path))
    const radians = (-currentNode.worldRotation * Math.PI) / 180
    const dx = x - currentNode.worldX
    const dy = y - currentNode.worldY
    const offsetX = Math.round((dx * Math.cos(radians) - dy * Math.sin(radians)) / currentNode.worldScaleX)
    const offsetY = Math.round((dx * Math.sin(radians) + dy * Math.cos(radians)) / currentNode.worldScaleY)
    if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) return false
    const editNode = this.getEditingNodeByPath(editor.path)
    const component = editNode?.components?.[active.componentIndex]
    if (!component) return false
    component.props = { ...component.props, offset: [offsetX, offsetY] }
    if (this.boxColliderEditorNode) {
      this.boxColliderEditorNode.x = offsetX
      this.boxColliderEditorNode.y = offsetY
    }
    this.syncEditingFlag()
    window.postMessage({ type: 'previewUpdateSelectedNodes', selectPaths: this.editingPaths, nodes: [{ component: 'components', updated: editNode.components }] }, '*')
    return true
  }

  resizeBoxCollider(edge: 'left' | 'right' | 'top' | 'bottom', dx: number, dy: number) {
    const editor = this.boxColliderEditor
    const node = this.boxColliderEditorNode
    if (!editor || !node) return false
    const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(editor.path))
    const radians = (-currentNode.worldRotation * Math.PI) / 180
    const localDx = (dx * Math.cos(radians) - dy * Math.sin(radians)) / currentNode.worldScaleX
    const localDy = (dx * Math.sin(radians) + dy * Math.cos(radians)) / currentNode.worldScaleY
    let width = node.width
    let height = node.height
    let offsetX = node.x
    let offsetY = node.y
    if (edge === 'left') {
      width = Math.max(1, width - localDx)
      offsetX += (node.width - width) / 2
    } else if (edge === 'right') {
      width = Math.max(1, width + localDx)
      offsetX += (width - node.width) / 2
    } else if (edge === 'top') {
      height = Math.max(1, height - localDy)
      offsetY += (node.height - height) / 2
    } else {
      height = Math.max(1, height + localDy)
      offsetY += (height - node.height) / 2
    }
    const editNode = this.getEditingNodeByPath(editor.path)
    const component = editNode?.components?.[editor.componentIndex]
    if (!component) return false
    node.width = Math.round(width)
    node.height = Math.round(height)
    node.x = Math.round(offsetX)
    node.y = Math.round(offsetY)
    component.props = { ...component.props, width: node.width, height: node.height, offset: [node.x, node.y] }
    this.syncEditingFlag()
    window.postMessage({ type: 'previewUpdateSelectedNodes', selectPaths: this.editingPaths, nodes: [{ component: 'components', updated: editNode.components }] }, '*')
    return true
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
      if (liveControl) liveControl.props.bones = control.bones
    }
  }

  async changeSelectedNodeType(tag: string) {
    if (!tag || !this.editingPaths[0]) return
    this.pushUndoHistory()
    for (const editingPath of this.editingPaths) {
      const editNode = this.getEditingNodeByPath(editingPath)
      if (!editNode) continue
      editNode.tag = tag
      editNode.props = editNode.props?.node ? { node: editNode.props.node } : {}
    }
    await this.reloadEditingComponent()
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

  async deleteSelectedNodes() {
    const selectedNodes = new Set(this.editingPaths
      .map((editingPath) => this.getEditingNodeByPath(editingPath))
      .filter((node) => node && node.tag !== 'SceneComponent'))
    if (!selectedNodes.size) return

    this.pushUndoHistory()
    const removeSelectedNodes = (nodes: any[]): any[] => nodes
      .filter((node) => !selectedNodes.has(node))
      .map((node) => {
        if (node.children?.length) node.children = removeSelectedNodes(node.children)
        return node
      })
    this.editingComponent = removeSelectedNodes(this.editingComponent)
    const assignIds = (nodes: any[], prefix = '') => nodes.forEach((node, nodeIndex) => {
      node.id = prefix ? `${prefix}-${nodeIndex}` : `${nodeIndex}`
      assignIds(node.children || [], node.id)
    })
    assignIds(this.editingComponent)
    window.postMessage({ type: 'previewRestoreComponentTree', treeData: this.editingComponent, selectPaths: [] }, '*')
    this.changeSelectPath([])
    await this.reloadEditingComponent()
  }

  getScenePositionFromClient(clientX?: number, clientY?: number) {
    const canvas = document.querySelector<HTMLCanvasElement>('#sdl-canvas')
    const bounds = canvas?.getBoundingClientRect()
    const dropX = Number(clientX)
    const dropY = Number(clientY)
    if (!bounds?.width || !Number.isFinite(dropX) || !Number.isFinite(dropY)) return undefined

    const canvasX = (dropX - bounds.left) * this.logicalCanvasWidth / bounds.width
    const canvasY = (dropY - bounds.top) * this.logicalCanvasWidth / bounds.width
    return {
      x: Math.round((canvasX - this.drawNode.x) / (this.drawNode.scaleX || 1)),
      y: Math.round((canvasY - this.drawNode.y) / (this.drawNode.scaleY || 1)),
    }
  }

  async addDroppedNode(item: any, parentId?: string, clientX?: number, clientY?: number) {
    if (!item || !this.editingComponent?.length) return

    const sceneRoot = first<any>(this.editingComponent)
    const findNode = (nodes: any[], id: string): any => {
      for (const node of nodes) {
        if (node.id === id) return node
        const match = findNode(node.children || [], id)
        if (match) return match
      }
    }
    const parentNode = parentId ? findNode(this.editingComponent, parentId) : undefined
    const children = parentNode?.children ?? (sceneRoot.children ??= [])
    const items = Array.isArray(item.items) ? item.items : [item]
    const position = this.getScenePositionFromClient(clientX, clientY)
    const nodes = items.filter(Boolean).map((droppedItem, index) => {
      const childIndex = children.length + index
      const id = parentNode ? `${parentNode.id}-${childIndex}` : `${sceneRoot.id}-${childIndex}`
      const asset = droppedItem.asset || {}
      const assetKey = asset.key || asset.name
      const node = droppedItem.kind === 'component'
        ? {
          id,
          expanded: true,
          tag: droppedItem.name,
          props: droppedItem.name === 'UILayout'
            ? { node: { width: 200, height: 200 } }
            : ['Label', 'RichText'].includes(droppedItem.name) ? { string: '' } : {},
          components: [],
          children: [],
        }
        : asset.type === 'spine'
          ? { id, expanded: true, tag: 'SpineSkeleton', props: { data: assetKey }, components: [], children: [] }
        : asset.type === 'dragonBones'
          ? { id, expanded: true, tag: 'DragonBones', props: { data: assetKey }, components: [], children: [] }
        : asset.type === 'dicedSprite'
          ? { id, expanded: true, tag: 'DicedSprite', props: { data: assetKey, animation: asset.json?.animations?.[0]?.name || '' }, components: [], children: [] }
        : asset.type === 'tiledMap'
          ? { id, expanded: true, tag: 'TiledMap', props: { mapFile: assetKey }, components: [], children: [] }
        : asset.type === 'font'
          ? { id, expanded: true, tag: 'Label', props: { string: '', font: assetKey }, components: [], children: [] }
        : asset.type === 'spriteFrame' || asset.type === 'frame'
          ? { id, expanded: true, tag: 'Sprite', props: { spriteFrame: assetKey }, components: [], children: [] }
          : { id, expanded: true, tag: 'Node', props: {}, components: [], children: [] }
      if (position) setNodePositionProps(node.props, position.x, position.y)
      return node
    })
    if (!nodes.length) return

    this.pushUndoHistory()
    children.push(...nodes)
    this.editingPaths = nodes.map((node) => node.id)
    await this.reloadEditingComponent()
    window.postMessage({ type: 'previewRestoreComponentTree', treeData: this.editingComponent, selectPaths: this.editingPaths }, '*')
  }

  async importPngAsSprite(sourcePaths: string[], clientX?: number, clientY?: number) {
    const rootFolder = getLastRootFolder()
    if (!rootFolder || !sourcePaths?.length) return
    const response: any = await sendRequest({
      key: 'IMPORT_RESOURCES_REQUEST',
      rootFolder,
      resourcePath: 'Texture',
      sourcePaths,
    })
    const assets = response?.assets || []
    if (!response || response.error || !assets.length) {
      toast.error(response?.message || 'Unable to import PNG as a Sprite')
      return
    }

    await this.reloadProjectData()
    await this.addDroppedNode({
      items: assets
        .filter((asset) => asset.key)
        .map((asset) => ({ kind: 'asset', asset: { type: 'spriteFrame', key: asset.key, path: asset.path } })),
    }, undefined, clientX, clientY)
    window.postMessage({ type: 'resourcesImported', rootFolder }, '*')
    toast.success(`Imported ${assets.length} PNG${assets.length === 1 ? '' : 's'} as Sprite${assets.length === 1 ? '' : 's'}`)
  }

  async moveHierarchyNodes(dragIds: string[], parentId: string | null, index: number | null) {
    if (!dragIds?.length || !this.editingComponent?.length) return

    const sceneRoot = first<any>(this.editingComponent)
    const rootChildren = sceneRoot?.tag === 'SceneComponent' ? sceneRoot.children : this.editingComponent
    const findNode = (nodes: any[], id: string): any => {
      for (const node of nodes) {
        if (node.id === id) return node
        const match = findNode(node.children || [], id)
        if (match) return match
      }
    }
    const draggedNodes = dragIds.map((id) => findNode(this.editingComponent, id)).filter(Boolean)
    const parentNode = parentId ? findNode(this.editingComponent, parentId) : undefined
    const targetChildren = parentNode ? (parentNode.children ??= []) : rootChildren
    const containsNode = (node: any, target: any): boolean => node === target || (node.children || []).some((child) => containsNode(child, target))

    if (!draggedNodes.length || !targetChildren || draggedNodes.some((node) => node.tag === 'SceneComponent' || containsNode(node, parentNode))) return

    this.pushUndoHistory()
    const movedIds = new Set(draggedNodes.map((node) => node.id))
    const targetIndex = Math.max(0, Math.min(index ?? targetChildren.length, targetChildren.length))
    const movedBeforeIndex = targetChildren.slice(0, targetIndex).filter((node) => movedIds.has(node.id)).length
    const removeNodes = (nodes: any[]): any[] => nodes
      .filter((node) => !movedIds.has(node.id))
      .map((node) => ({ ...node, children: removeNodes(node.children || []) }))
    const remainingTree = removeNodes(this.editingComponent)
    const remainingSceneRoot = first<any>(remainingTree)
    const remainingParent = parentId ? findNode(remainingTree, parentId) : undefined
    const remainingTargetChildren = remainingParent
      ? (remainingParent.children ??= [])
      : remainingSceneRoot?.tag === 'SceneComponent'
        ? remainingSceneRoot.children
        : remainingTree

    remainingTargetChildren.splice(Math.max(0, targetIndex - movedBeforeIndex), 0, ...draggedNodes)
    this.editingComponent = remainingTree
    const assignIds = (nodes: any[], prefix = '') => nodes.forEach((node, nodeIndex) => {
      node.id = prefix ? `${prefix}-${nodeIndex}` : `${nodeIndex}`
      assignIds(node.children || [], node.id)
    })
    assignIds(this.editingComponent)
    this.editingPaths = draggedNodes.map((node) => node.id)
    await this.reloadEditingComponent()
    window.postMessage({ type: 'previewRestoreComponentTree', treeData: this.editingComponent, selectPaths: this.editingPaths }, '*')
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
    currentNode.getComponent(UILayout)?.layoutChildren()

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

  scaleSelectedNode(corner: 'top-left' | 'top-right', dx: number) {
    if (this.editingPaths.length !== 1) return false
    const editingPath = this.editingPaths[0]
    const currentNode = getCurrentNode(this.drawNode, this.getChildrenIndex(editingPath))
    const parent = currentNode.parent ?? this.drawNode
    const parentScaleX = Math.abs(parent.worldScaleX || this.drawNode.scaleX || 1)
    const width = Math.max(1, currentNode.width * parentScaleX)
    const scaleDelta = (corner === 'top-left' ? -dx : dx) / width
    const scaleX = currentNode.scaleX || 1
    const scaleY = currentNode.scaleY || 1
    const scaleFactor = Math.max(0.1 / Math.max(Math.abs(scaleX), 0.001), 1 + scaleDelta / Math.max(Math.abs(scaleX), 0.001))
    const nextScaleX = this.lockX ? scaleX : Number((scaleX * scaleFactor).toFixed(3))
    const nextScaleY = this.lockY ? scaleY : Number((scaleY * scaleFactor).toFixed(3))
    if (nextScaleX === scaleX && nextScaleY === scaleY) return false

    currentNode.scaleX = nextScaleX
    currentNode.scaleY = nextScaleY
    const editNode = this.getEditingNodeByPath(editingPath)
    if (!editNode) return false
    editNode.props ??= {}
    editNode.props.node ??= {}
    editNode.props.node.scale = undefined
    editNode.props.node.scaleX = nextScaleX
    editNode.props.node.scaleY = nextScaleY
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
    if (this.boxColliderEditor && this.editingPaths[0] !== this.boxColliderEditor.path) {
      this.boxColliderEditor = undefined
      this.updateBoxColliderEditor()
    }
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

  onTouchStart(event: Touch) {
    if (this.isSaveDialogVisible()) return
    const { x, y } = event
    this.lastTouch = { x, y }
    this.didCaptureDragHistory = false
    this.activeScaleCorner = undefined
    this.marqueeSelection = undefined
    const isPanMode = this.isPanMouse || this.isRightMouse
    if (isPanMode) {
      this.activeArrowAxis = undefined
      this.activeScaleCorner = undefined
      this.activeResizeEdge = undefined
      this.isRotating = false
      this.activeSpineBonePoint = undefined
      this.activeBoxColliderOffset = undefined
      this.activeBoxColliderResizeEdge = undefined
      this.rotationDragStart = undefined
      this.updateArrowOpacity()
      return
    }
    if (this.isMiddleMouse) return
    const isModifierSelecting = this.isMultiSelectModifierPressed && !isPanMode
    this.activeSpineBonePoint = isModifierSelecting || this.isShiftPressed ? undefined : this.getActiveSpineBonePoint(x, y)
    this.activeBoxColliderResizeEdge = isModifierSelecting || this.isShiftPressed ? undefined : this.getActiveBoxColliderResizeEdge(x, y)
    this.activeBoxColliderOffset = this.activeBoxColliderResizeEdge || isModifierSelecting || this.isShiftPressed
      ? undefined
      : this.getActiveBoxColliderEditor(x, y)
    if (this.activeBoxColliderResizeEdge) {
      this.pushUndoHistory()
      this.didCaptureDragHistory = true
      this.activeArrowAxis = undefined
      this.activeResizeEdge = undefined
      this.isRotating = false
      this.updateArrowOpacity()
      return
    }
    if (this.activeBoxColliderOffset) {
      this.pushUndoHistory()
      this.didCaptureDragHistory = true
      this.activeArrowAxis = undefined
      this.activeResizeEdge = undefined
      this.isRotating = false
      this.updateArrowOpacity()
      return
    }
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
    this.activeScaleCorner = this.isRotating || isModifierSelecting || this.activeArrowAxis
      ? undefined
      : this.getActiveScaleCorner(x, y)
    this.activeResizeEdge = this.isRotating || isModifierSelecting || this.activeArrowAxis || this.activeScaleCorner
      ? undefined
      : this.getActiveResizeEdge(x, y)
    if (!this.activeArrowAxis && !this.activeScaleCorner && !this.activeResizeEdge) this.activeArrowAxis = activeArrowAxis
    if (!this.isRotating && !this.activeScaleCorner && !this.activeResizeEdge && !this.activeArrowAxis && !isModifierSelecting && this.isPointInsideSelectedNode(x, y)) {
      this.activeArrowAxis = 'move'
    }
    if (!this.isRotating && !this.activeScaleCorner && !this.activeResizeEdge && !this.activeArrowAxis && !isModifierSelecting && !isPanMode) {
      this.activeArrowAxis = undefined
      this.activeResizeEdge = undefined
      this.isRotating = false
      this.rotationDragStart = undefined
      this.marqueeSelection = { startX: x, startY: y, currentX: x, currentY: y, active: false }
      this.marqueeSelectionNode.active = false
      this.updateArrowOpacity()
      return
    }
    if (!this.isRotating && !this.activeScaleCorner && !this.activeResizeEdge && !this.activeArrowAxis && !isPanMode) {
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
    const isPanMode = this.isPanMouse || this.isRightMouse
    if (this.isMiddleMouse) return
    const savedSelectionPaths = this.panSelectionPaths ?? this.middleMouseSelectionPaths
    if (isPanMode && savedSelectionPaths && this.editingPaths.join(',') !== savedSelectionPaths.join(',')) {
      this.changeSelectPath(savedSelectionPaths)
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
    if (this.activeBoxColliderOffset) {
      this.moveBoxColliderOffset(x, y)
      return
    }
    if (this.activeBoxColliderResizeEdge) {
      this.resizeBoxCollider(this.activeBoxColliderResizeEdge, dx, dy)
      return
    }
    if (isPanMode) {
      this.drawNode.x += dx
      this.drawNode.y += dy
      this.borderNode.x = this.drawNode.x
      this.borderNode.y = this.drawNode.y
      setLastSceneX(this.drawNode.x)
      setLastSceneY(this.drawNode.y)
    } else {
      if (!this.editingPaths[0]) return
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
      if (this.activeScaleCorner) {
        if (!this.didCaptureDragHistory) {
          this.pushUndoHistory()
          this.didCaptureDragHistory = true
        }
        this.scaleSelectedNode(this.activeScaleCorner, dx)
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
        if (selectedPath) this.changeSelectPath([selectedPath])
      }
      this.marqueeSelection = undefined
      this.marqueeSelectionNode.active = false
      this.updateArrowPosition()
    }
    this.lastTouch = undefined
    this.activeArrowAxis = undefined
    this.activeScaleCorner = undefined
    this.activeResizeEdge = undefined
    this.isRotating = false
    this.activeSpineBonePoint = undefined
    this.activeBoxColliderOffset = undefined
    this.activeBoxColliderResizeEdge = undefined
    this.rotationDragStart = undefined
    this.didCaptureDragHistory = false
    this.updateArrowOpacity()
  }
}
