import { Allotment } from 'allotment'
import { useContext, useEffect, useMemo } from 'react'
import { loadComponent } from '../states/app.action'
import { AppContext, useDispatch } from '../states/app.context'
import { selectDesignResolution } from '../states/app.selectors'
import NodeTree from './NodeTree'
import PropertiesPanel from './PropertiesPanel'
import SceneView from './SceneView'
import './globals.css'

export function App() {
  const dispatch = useDispatch();
  const { useSelector } = useContext(AppContext);
  const designResolution = useSelector(selectDesignResolution);
  useEffect(() => {
    console.log('file path', (window as any).filePath)
    dispatch(loadComponent((window as any).filePath))
    window.addEventListener('message', event => {
      const message = event.data; // The JSON data our extension sent
      console.log('message', message)
      switch (message.command) {
        case 'loadComponent':
          dispatch(loadComponent(message.data))
          break;
      }
    });
  }, [])

  // if (!designResolution) return
  // const { width, height } = designResolution
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
