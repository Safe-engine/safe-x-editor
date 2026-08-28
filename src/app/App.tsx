import { Dockable, LayoutNode } from '@danfessler/react-dockable'
import '@danfessler/react-dockable/style.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Toaster } from 'react-hot-toast'

import { useSelector } from 'states/app.context'
import { selectRootFolder, selectSelectedEditingPath } from 'states/app.selectors'
import { RESET_DOCK_LAYOUT } from 'shared/constant.message'
import AssetsPanel from './AssetsPanel'
import NewProjectDialog from './NewProjectDialog'
import NodeTree from './NodeTree'
import PropertiesPanel from './PropertiesPanel'
import SceneView from './SceneView'
import SettingsDialog from './SettingsDialog'
import './globals.css'

const SCENE_TAB_ID = 'scene';
const LAYOUT_STORAGE_KEY = 'safe-x-editor:dock-layout';

function getSavedLayout(): LayoutNode[] | undefined {
  try {
    const layout = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) || 'null');
    return Array.isArray(layout) ? layout : undefined;
  } catch {
    return undefined;
  }
}

function findSceneWindow(layout: LayoutNode[]): Extract<LayoutNode, { type: 'Window' }> | undefined {
  for (const node of layout) {
    if (node.type === 'Window' && node.children.includes(SCENE_TAB_ID)) return node;
    if (node.type === 'Panel') {
      const window = findSceneWindow(node.children);
      if (window) return window;
    }
  }
}

export function App() {
  const rootFolder = useSelector(selectRootFolder);
  const componentName = useSelector(selectSelectedEditingPath);
  const [layout, setLayout] = useState<LayoutNode[] | undefined>(getSavedLayout);
  const [dockableKey, setDockableKey] = useState(0);
  const sceneWindowId = useRef<string>();
  useEffect(() => {
    const projectName = rootFolder.split(/[\\/]/).filter(Boolean).pop()
    document.title = [projectName, componentName].filter(Boolean).join(' - ') || 'Safe Engine X Editor'
  }, [rootFolder, componentName])

  useEffect(() => {
    if (!layout) return;
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  }, [layout])

  useEffect(() => {
    const ipcRenderer = (globalThis as any).require?.('electron')?.ipcRenderer;
    const resetLayout = () => {
      localStorage.removeItem(LAYOUT_STORAGE_KEY);
      sceneWindowId.current = undefined;
      setLayout(undefined);
      setDockableKey((key) => key + 1);
    };

    ipcRenderer?.on(RESET_DOCK_LAYOUT, resetLayout);
    return () => ipcRenderer?.removeListener(RESET_DOCK_LAYOUT, resetLayout);
  }, [])

  const handleLayoutChange = useCallback((nextLayout: LayoutNode[]) => {
    const sceneWindow = findSceneWindow(nextLayout);
    if (!sceneWindowId.current) {
      sceneWindowId.current = sceneWindow?.id;
      setLayout(nextLayout);
      return;
    }
    if (sceneWindow?.id === sceneWindowId.current && sceneWindow.children.length === 1) {
      setLayout(nextLayout);
      return;
    }
    setDockableKey((key) => key + 1);
  }, []);

  return (
    <main className="h-screen bg-[#1e1e1e] text-[#dcdcdc]">
      <Toaster position="top-center" />
      <NewProjectDialog />
      <SettingsDialog />
      <div className='dockable-root h-full'>
      <Dockable.Root key={dockableKey} layout={layout} onChange={handleLayoutChange} orientation='row' theme='darker' gap={0} radius={4}>
        <Dockable.Panel orientation='column' size={1}>
          <Dockable.Window>
            <Dockable.Tab id='components' name='Components'>
              <AssetsPanel tab='components' loadProject />
            </Dockable.Tab>
          </Dockable.Window>
          <Dockable.Window>
            <Dockable.Tab id='resources' name='Resources'>
              <AssetsPanel tab='res' />
            </Dockable.Tab>
          </Dockable.Window>
        </Dockable.Panel>
        <Dockable.Window size={2}>
          <Dockable.Tab id={SCENE_TAB_ID} name='Scene'>
            <SceneView />
          </Dockable.Tab>
        </Dockable.Window>
        <Dockable.Panel orientation='row' size={2}>
          <Dockable.Window>
            <Dockable.Tab id='hierarchy' name='Hierarchy'>
              <NodeTree />
            </Dockable.Tab>
          </Dockable.Window>
          <Dockable.Window>
            <Dockable.Tab id='node-properties' name='Node Properties'>
              <PropertiesPanel />
            </Dockable.Tab>
          </Dockable.Window>
        </Dockable.Panel>
      </Dockable.Root>
      </div>
    </main>
  )
}
