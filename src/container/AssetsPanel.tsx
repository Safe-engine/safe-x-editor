'use client'

import { useEffect, useState } from 'react'

import { ScrollAblePanel } from '../component/common'
import TreeView from '../component/TreeView'

export default function AssetsPanel() {
  const [treeData, setTreeData] = useState<any[]>([])
  useEffect(() => {
    // event.event is the event name (useful if you want to use a single callback fn for multiple event types)
    // event.payload is the payload object
    // const selectedProject = await selectFolder()
    // console.log(selectedProject)
    // if (typeof selectedProject === 'string') {
    //   const entries = await readDir(selectedProject, {
    //     dir: BaseDirectory.AppData,
    //     recursive: true,
    //   })
    //   // const tree = processEntries(entries)
    //   console.log(entries)
    //   setTreeData(entries)
    // }
    // }
  }, [])

  // Necessary because we will have to use Greet as a component later.
  return (
    <ScrollAblePanel>
      {treeData.map((tree) => (
        <TreeView data={tree} key={tree.path} />
      ))}
    </ScrollAblePanel>
  )
}
