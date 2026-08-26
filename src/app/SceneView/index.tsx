import { Engine, loadScene } from '@safe-engine/sdl'
import ScenePanelTitle from 'app/ScenePanelTitle'
import { useEffect, useRef, useState } from 'react'
import { TOGGLE_RULER, TOGGLE_SNAP } from 'shared/constant.message'
import { useActions, useSelector } from 'states/app.context'
import { selectSelectedFilePath, selectSelectedPaths } from 'states/app.selectors'
import { PreviewScene } from './PreviewScene'
import { SnapRulers } from './SnapRulers'

function getDroppedFilePath(file: File) {
  const electronRequire = (globalThis as any).require
  return electronRequire?.('electron')?.webUtils?.getPathForFile(file) || (file as any).path || ''
}

export default function SceneView() {
  const { replaceComponentTree, selectEditMultiNodes, updateMultiNodes } = useActions()
  const selectedFilePath = useSelector(selectSelectedFilePath)
  const selectedPaths = useSelector(selectSelectedPaths)
  const didStartEngine = useRef(false)
  const [isRulerVisible, setIsRulerVisible] = useState(true)

  useEffect(() => {
    if (didStartEngine.current) return
    didStartEngine.current = true
    Engine.start('Safex SDL Preview', window.innerWidth, window.innerHeight, 'fixed-width')
    loadScene(PreviewScene)
  }, [])

  useEffect(() => {
    const listener = (event) => {
      const message = event.data
      if (message.type === 'previewSelectPaths') {
        selectEditMultiNodes(message.selectPaths)
      } else if (message.type === 'previewRestoreComponentTree') {
        replaceComponentTree(message.treeData, message.selectPaths)
      } else if (message.type === 'previewUpdateSelectedNodes') {
        selectEditMultiNodes(message.selectPaths)
        updateMultiNodes(message.nodes)
      }
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  }, [replaceComponentTree, selectEditMultiNodes, updateMultiNodes])

  useEffect(() => {
    const ipcRenderer = (globalThis as any).require?.('electron')?.ipcRenderer
    const onToggleSnap = (_event: unknown, enabled: boolean) => window.postMessage({ type: 'setSnapEnabled', enabled }, '*')
    ipcRenderer?.on(TOGGLE_SNAP, onToggleSnap)
    return () => ipcRenderer?.removeListener(TOGGLE_SNAP, onToggleSnap)
  }, [])

  useEffect(() => {
    const ipcRenderer = (globalThis as any).require?.('electron')?.ipcRenderer
    const onToggleRuler = (_event: unknown, visible: boolean) => setIsRulerVisible(visible)
    ipcRenderer?.on(TOGGLE_RULER, onToggleRuler)
    return () => ipcRenderer?.removeListener(TOGGLE_RULER, onToggleRuler)
  }, [])

  useEffect(() => {
    if (!selectedFilePath) return
    window.postMessage({ type: 'changeFilePath', filePath: selectedFilePath }, '*')
  }, [selectedFilePath])

  const getDroppedItem = (event: React.DragEvent) => {
    try {
      return JSON.parse(event.dataTransfer.getData('application/x-safex-node'))
    } catch {
      return undefined
    }
  }

  const getDroppedPngPaths = (event: React.DragEvent) => Array.from(event.dataTransfer.files)
    .map(getDroppedFilePath)
    .filter((path) => /\.png$/i.test(path));

  useEffect(() => {
    window.postMessage({ type: 'changeSelectPath', selectPaths: selectedPaths }, '*')
  }, [selectedPaths])

  return (
    <div
      className='relative h-full w-full overflow-hidden bg-[#1e1e1e]'
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('application/x-safex-node') && !event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={(event) => {
        event.preventDefault()
        const item = getDroppedItem(event)
        if (item) window.postMessage({
          type: 'addDroppedNode',
          item,
          clientX: event.clientX,
          clientY: event.clientY,
        }, '*')
        else {
          const sourcePaths = getDroppedPngPaths(event)
          if (sourcePaths.length) window.postMessage({
            type: 'importPngAsSprite',
            sourcePaths,
            clientX: event.clientX,
            clientY: event.clientY,
          }, '*')
        }
      }}
    >
      <ScenePanelTitle />
      <canvas id="sdl-canvas" className='block bg-[#1e1e1e]'></canvas>
      <SnapRulers visible={isRulerVisible} />
    </div>
  )
}
