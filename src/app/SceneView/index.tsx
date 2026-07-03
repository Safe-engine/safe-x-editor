import { Engine, loadScene } from '@safe-engine/sdl'
import { useEffect, useRef } from 'react'
import { useActions, useSelector } from 'states/app.context'
import { selectSelectedFilePath, selectSelectedPaths } from 'states/app.selectors'
import { PreviewScene } from './PreviewScene'

export default function SceneView() {
  const { selectEditMultiNodes, updateMultiNodes } = useActions()
  const selectedFilePath = useSelector(selectSelectedFilePath)
  const selectedPaths = useSelector(selectSelectedPaths)
  const didStartEngine = useRef(false)

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
      } else if (message.type === 'previewUpdateSelectedNodes') {
        selectEditMultiNodes(message.selectPaths)
        updateMultiNodes(message.nodes)
      }
    }
    window.addEventListener('message', listener)
    return () => window.removeEventListener('message', listener)
  }, [selectEditMultiNodes, updateMultiNodes])

  useEffect(() => {
    if (!selectedFilePath) return
    window.postMessage({ type: 'changeFilePath', filePath: selectedFilePath }, '*')
  }, [selectedFilePath])

  useEffect(() => {
    window.postMessage({ type: 'changeSelectPath', selectPaths: selectedPaths }, '*')
  }, [selectedPaths])

  return (
    <div className='h-full w-full bg-[#1e1e1e]'>
      <canvas id="sdl-canvas" className='block bg-[#1e1e1e]'></canvas>
    </div>
  )
}
