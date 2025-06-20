import { Allotment } from 'allotment'
import { useContext, useEffect } from 'react'

import { AppContext } from 'states/app.context'
import { selectDesignResolution } from 'states/app.selectors'
import AssetsPanel from './AssetsPanel'
import NodeTree from './NodeTree'
import PropertiesPanel from './PropertiesPanel'
import SceneView from './SceneView'
import './globals.css'

export function App() {
  const { useSelector } = useContext(AppContext);
  const { width, height } = useSelector(selectDesignResolution);
  useEffect(() => {
    // currentMonitor().then(setMonitor)
  }, [])

  return (
    <main className="bg-gray-600 h-screen">
      <Allotment>
        <Allotment.Pane snap minSize={200} maxSize={270}>
          <AssetsPanel />
        </Allotment.Pane>
        <Allotment.Pane minSize={270} maxSize={300}>
          <NodeTree />
        </Allotment.Pane>
        <Allotment.Pane>
          <Allotment vertical={true}>
            <Allotment.Pane minSize={480}>
              <SceneView />
            </Allotment.Pane>
            {width > height &&
              <Allotment.Pane snap minSize={200} maxSize={300}>
                <PropertiesPanel />
              </Allotment.Pane>
            }
          </Allotment>
        </Allotment.Pane>
        {width < height && <Allotment.Pane snap minSize={200} maxSize={300}>
          <PropertiesPanel />
        </Allotment.Pane>}
      </Allotment>
    </main>
  )
}
