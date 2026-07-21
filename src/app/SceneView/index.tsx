import { loadScene, setupCollider, setupRichText, startGame } from '@safe-engine/webgl'
import { setupDragonBones } from '@safe-engine/webgl/dist/dragonbones'
import { setupSpine } from '@safe-engine/webgl/dist/spine'
import { useEffect, useRef } from 'react'
import { useActions, useSelector } from 'states/app.context'
import { selectSelectedFilePath, selectSelectedPaths } from 'states/app.selectors'
import { PreviewScene } from './PreviewScene'

export default function SceneView() {
  const { selectEditMultiNodes, updateMultiNodes } = useActions()
  const selectedFilePath = useSelector(selectSelectedFilePath)
  const selectedPaths = useSelector(selectSelectedPaths)
  const containerRef = useRef<HTMLDivElement>(null)
  const didStartEngine = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container || didStartEngine.current) return

    const startEngine = () => {
      if (didStartEngine.current || !container.clientWidth || !container.clientHeight) return
      didStartEngine.current = true
      startGame('Arial', { width: window.innerWidth, height: window.innerHeight }).then(async () => {
        setupSpine()
        setupDragonBones()
        setupRichText()
        setupCollider([], true)
        loadScene(PreviewScene)
      })
    }

    const resizeObserver = new ResizeObserver(startEngine)
    resizeObserver.observe(container)
    const frame = requestAnimationFrame(startEngine)
    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
    }
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
    <div ref={containerRef} className='h-full w-full overflow-hidden bg-[#1e1e1e]'>
      <canvas id="gameCanvas" className='block h-full w-full bg-[#1e1e1e]'></canvas>
    </div>
  )
}
