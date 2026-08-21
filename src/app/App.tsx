import { Allotment } from 'allotment'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'

import { useSelector } from 'states/app.context'
import { selectRootFolder, selectSelectedEditingPath } from 'states/app.selectors'
import AssetsPanel from './AssetsPanel'
import NewProjectDialog from './NewProjectDialog'
import NodeTree from './NodeTree'
import PropertiesPanel from './PropertiesPanel'
import SceneView from './SceneView'
import SettingsDialog from './SettingsDialog'
import './globals.css'

export function App() {
  const rootFolder = useSelector(selectRootFolder);
  const componentName = useSelector(selectSelectedEditingPath);
  useEffect(() => {
    const projectName = rootFolder.split(/[\\/]/).filter(Boolean).pop()
    document.title = [projectName, componentName].filter(Boolean).join(' - ') || 'Safe Engine X Editor'
  }, [rootFolder, componentName])

  return (
    <main className="h-screen bg-[#1e1e1e] text-[#dcdcdc]">
      <Toaster position="top-center" />
      <NewProjectDialog />
      <SettingsDialog />
      <Allotment>
        <Allotment.Pane snap minSize={220} maxSize={350}>
          <AssetsPanel />
        </Allotment.Pane>
        <Allotment.Pane snap minSize={200} maxSize={320}>
          <NodeTree />
        </Allotment.Pane>
        <Allotment.Pane minSize={400}>
          <SceneView />
        </Allotment.Pane>
        <Allotment.Pane snap minSize={220} maxSize={350}>
          <PropertiesPanel />
        </Allotment.Pane>
      </Allotment>
    </main>
  )
}
