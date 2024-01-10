import { Allotment } from 'allotment'
import { useEffect } from 'react'

// import 'allotment/dist/style.css'
import AssetsPanel from '../container/AssetsPanel'
import ConsolePanel from '../container/ConsolePanel'
import NodeTree from '../container/NodeTree'
import PropertiesPanel from '../container/PropertiesPanel'
import SceneView from '../container/SceneView'
import './globals.css'

export function App() {
  useEffect(() => {
    // currentMonitor().then(setMonitor)
  }, [])

  return (
    <main className="bg-gray-200 h-screen">
      <Allotment>
        <Allotment.Pane minSize={270} maxSize={270}>
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
            {/* <Allotment.Pane minSize={200}>
              <AssetsPanel />
            </Allotment.Pane> */}
          </Allotment>
        </Allotment.Pane>
        <Allotment.Pane snap minSize={200} maxSize={300}>
          <PropertiesPanel />
        </Allotment.Pane>
      </Allotment>
    </main>
  )
}
