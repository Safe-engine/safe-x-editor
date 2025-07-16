import { Allotment } from 'allotment'
import { useEffect, useMemo } from 'react'
import { useActions, useSelector } from '../states/app.context'
import { selectAssets, selectDesignResolution } from '../states/app.selectors'
import NodeTree from './NodeTree'
import PropertiesPanel from './PropertiesPanel'
import SceneView from './SceneView'
import './globals.css'

export function App() {
  const { getFiles, loadComponent } = useActions()
  const designResolution = useSelector(selectDesignResolution);
  const assetsData = useSelector(selectAssets);
  useEffect(() => {
    console.log('rootPath path', (window as any).rootPath)
    getFiles((window as any).rootPath)
  }, [])

  useEffect(() => {
    console.log('file path', (window as any).filePath)
    loadComponent((window as any).filePath)
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'refresh') {
        loadComponent((window as any).filePath); // Hoặc xử lý theo nội dung message.content
      }
    });
  }, [assetsData])

  const width = useMemo(() => designResolution.width, [designResolution])
  const height = useMemo(() => designResolution.height, [designResolution])

  return (
    <main className="bg-gray-600 h-screen">
      <Allotment>
        {width <= height &&
          <Allotment.Pane minSize={250} maxSize={280}>
            <NodeTree />
          </Allotment.Pane>
        }
        <Allotment.Pane>
          <Allotment vertical={true}>
            <Allotment.Pane minSize={480}>
              <SceneView />
            </Allotment.Pane>
            {width > height &&
              <Allotment.Pane snap minSize={200} maxSize={300}>
                <NodeTree />
              </Allotment.Pane>
            }
          </Allotment>
        </Allotment.Pane>
        <Allotment.Pane snap minSize={200} maxSize={300}>
          <PropertiesPanel />
        </Allotment.Pane>
      </Allotment>
    </main>
  )
}
