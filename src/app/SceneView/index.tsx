import { Engine, loadScene } from '@safe-engine/sdl'
import { useEffect, useRef } from 'react'
import { useSelector } from 'states/app.context'
import { selectSelectedFilePath, selectSelectedPaths } from 'states/app.selectors'
import { PreviewScene } from './PreviewScene'

export default function SceneView() {
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
    if (!selectedFilePath) return
    window.postMessage({ type: 'changeFilePath', filePath: selectedFilePath }, '*')
  }, [selectedFilePath])

  useEffect(() => {
    window.postMessage({ type: 'changeSelectPath', selectPaths: selectedPaths }, '*')
  }, [selectedPaths])

  return (
    <div className='w-full h-full'>
      <canvas id="sdl-canvas"></canvas>
    </div>
  )
}
