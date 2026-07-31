import { setLastSceneX, setLastSceneY } from 'data/AppData'
import { GlobalState } from 'data/GloablState'
import type { PreviewScene } from './PreviewScene'
import { KEY } from './utils'

export function registerKeyboardHandler(scene: PreviewScene) {
  window.addEventListener('keydown', async (event) => {
    const keyCode = event.code
    scene.updateInputModifiers(event)
    const target = event.target as HTMLElement | null
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return
    if (keyCode === KEY.shift || keyCode === KEY.shiftR) return
    if (event.ctrlKey || event.metaKey) {
      if (keyCode === KEY.s) await scene.saveComponent()
      else if (keyCode === KEY.r) {
        setLastSceneX(0)
        setLastSceneY(0)
        await scene.loadComponent(GlobalState.filePath)
      } else if (keyCode === KEY.a) {
        await scene.loadProjectData()
        await scene.loadComponent(GlobalState.filePath)
      } else if (keyCode === KEY.z && event.shiftKey) await scene.redoEdit()
      else if (keyCode === KEY.z) await scene.undoEdit()
      else if (keyCode === KEY.y) await scene.redoEdit()
      return
    }
    if (keyCode === KEY.backspace || keyCode === KEY.delete) {
      event.preventDefault()
      await scene.deleteSelectedNodes()
      return
    }
    if (!event.shiftKey) return
    if (keyCode === KEY.dash) scene.setRootScale(-0.05)
    else if (keyCode === KEY.equal) scene.setRootScale(0.05)
    else if (keyCode === KEY.x) {
      scene.lockX = !scene.lockX
      scene.updateArrowOpacity()
    } else if (keyCode === KEY.y) {
      scene.lockY = !scene.lockY
      scene.updateArrowOpacity()
    } else if (keyCode === KEY.h) scene.toggleSelectedNode()
    else if (keyCode === KEY.up) scene.moveSelectedNodeWithHistory(0, -10)
    else if (keyCode === KEY.down) scene.moveSelectedNodeWithHistory(0, 10)
    else if (keyCode === KEY.left) scene.moveSelectedNodeWithHistory(-10, 0)
    else if (keyCode === KEY.right) scene.moveSelectedNodeWithHistory(10, 0)
    else if (keyCode === KEY.c) scene.selectAllChildren()
  })
  window.addEventListener('keyup', (event) => scene.updateInputModifiers(event))
  window.addEventListener('blur', () => {
    scene.isShiftPressed = false
    scene.isMultiSelectModifierPressed = false
  })
}

export function registerMouseHandler(scene: PreviewScene) {
  const canvas = document.querySelector<HTMLCanvasElement>('#sdl-canvas')
  canvas?.addEventListener('wheel', (event) => {
    scene.setRootScale(event.deltaY > 0 ? -0.05 : 0.05)
    event.preventDefault()
  }, { passive: false })
  canvas?.addEventListener('pointerdown', (event) => {
    scene.isMiddleMouse = event.button === 1
    if (scene.isMiddleMouse) scene.middleMouseSelectionPaths = [...scene.editingPaths]
    scene.updateInputModifiers(event)
  }, true)
  canvas?.addEventListener('pointermove', (event) => {
    scene.updateInputModifiers(event)
    const bounds = canvas.getBoundingClientRect()
    const x = (event.clientX - bounds.left) * scene.logicalCanvasWidth / bounds.width
    const y = (event.clientY - bounds.top) * scene.logicalCanvasWidth / bounds.width
    scene.updateSpineBoneTooltip(x, y, event.clientX, event.clientY)
    const canEdit = !scene.isShiftPressed && !scene.isMultiSelectModifierPressed
    const activeArrowAxis = canEdit && scene.editingPaths[0] ? scene.getActiveArrowAxis(x, y) : undefined
    if (activeArrowAxis === 'anchor') {
      canvas.style.cursor = 'move'
      return
    }
    if (canEdit && scene.getActiveRotationHandle(x, y)) {
      canvas.style.cursor = 'grab'
      return
    }
    const colliderResizeEdge = canEdit ? scene.getActiveBoxColliderResizeEdge(x, y) : undefined
    if (colliderResizeEdge) {
      canvas.style.cursor = colliderResizeEdge === 'left' || colliderResizeEdge === 'right' ? 'ew-resize' : 'ns-resize'
      return
    }
    if (canEdit && scene.getActiveBoxColliderEditor(x, y)) {
      canvas.style.cursor = 'move'
      return
    }
    const handle = canEdit ? scene.getActiveResizeEdge(x, y) : undefined
    const canResizeX = handle?.includes('left') || handle?.includes('right') ? !scene.lockX : false
    const canResizeY = handle?.includes('top') || handle?.includes('bottom') ? !scene.lockY : false
    canvas.style.cursor = canResizeX && canResizeY
      ? handle === 'top-left' || handle === 'bottom-right' ? 'nwse-resize' : 'nesw-resize'
      : canResizeX ? 'ew-resize' : canResizeY ? 'ns-resize' : 'default'
  })
  canvas?.addEventListener('pointerleave', () => {
    canvas.style.cursor = 'default'
    if (scene.spineBoneTooltipNode) scene.spineBoneTooltipNode.style.display = 'none'
  })
  const resetPointerState = () => {
    scene.isMiddleMouse = false
    scene.middleMouseSelectionPaths = undefined
    scene.isShiftPressed = false
    scene.isMultiSelectModifierPressed = false
    scene.lastTouch = undefined
  }
  canvas?.addEventListener('pointerup', resetPointerState)
  canvas?.addEventListener('pointercancel', resetPointerState)
}

export function registerMessageHandler(scene: PreviewScene) {
  window.addEventListener('message', (event) => {
    const message = event.data
    if (message.type === 'reLoad') {
      if (scene.isEditing) scene.showSaveDialog(GlobalState.filePath)
      else void scene.loadComponent(GlobalState.filePath)
    } else if (message.type === 'changeFilePath') {
      GlobalState.tempFilePath = message.filePath
      if (scene.isEditing) scene.showSaveDialog(GlobalState.tempFilePath)
      else void scene.loadComponent(GlobalState.tempFilePath)
    } else if (message.type === 'changeSelectPath') scene.changeSelectPath(message.selectPaths, false)
    else if (message.type === 'focusPreviewNode') scene.focusNode(message.path)
    else if (message.type === 'reloadProjectData') void scene.reloadProjectData()
    else if (message.type === 'updateSelectedNode') void scene.updateSelectedNode(message.component, message.updated)
    else if (message.type === 'changeSelectedNodeType') void scene.changeSelectedNodeType(message.tag)
    else if (message.type === 'toggleBoxColliderEditor') scene.toggleBoxColliderEditor(message.componentIndex)
    else if (message.type === 'addDroppedNode') void scene.addDroppedNode(message.item, message.parentId, message.clientX, message.clientY)
    else if (message.type === 'moveHierarchyNodes') void scene.moveHierarchyNodes(message.dragIds, message.parentId, message.index)
  })
}
