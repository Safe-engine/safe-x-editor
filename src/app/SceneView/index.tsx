import { Engine, loadScene } from '@safe-engine/sdl'
import { useEffect, useRef, useState } from 'react'
import { FiSave } from 'react-icons/fi'
import { useActions, useSelector } from 'states/app.context'
import { selectSelectedFilePath, selectSelectedPaths } from 'states/app.selectors'
import { PreviewScene } from './PreviewScene'

export default function SceneView() {
  const { replaceComponentTree, selectEditMultiNodes, updateMultiNodes } = useActions()
  const selectedFilePath = useSelector(selectSelectedFilePath)
  const selectedPaths = useSelector(selectSelectedPaths)
  const didStartEngine = useRef(false)
  const [isProjectDirty, setIsProjectDirty] = useState(false)

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
      } else if (message.type === 'previewEditingState') {
        setIsProjectDirty(message.isEditing)
      }
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  }, [replaceComponentTree, selectEditMultiNodes, updateMultiNodes])

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

  useEffect(() => {
    window.postMessage({ type: 'changeSelectPath', selectPaths: selectedPaths }, '*')
  }, [selectedPaths])

  return (
    <div
      className='relative h-full w-full bg-[#1e1e1e]'
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('application/x-safex-node')) return
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
      }}
    >
      <button
        className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-sm border border-[#111] bg-[#2a2a2a] hover:bg-[#343434] ${isProjectDirty ? 'text-[#ff5c5c] hover:text-[#ff7777]' : 'text-[#bdbdbd] hover:text-white'}`}
        type='button'
        onClick={() => window.postMessage({ type: 'saveProject' }, '*')}
        title='Save Project (Ctrl/Cmd+S)'
        aria-label='Save Project'
      >
        <FiSave size={14} />
      </button>
      <canvas id="sdl-canvas" className='block bg-[#1e1e1e]'></canvas>
    </div>
  )
}
