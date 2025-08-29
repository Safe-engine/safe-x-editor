import { useEffect, useRef } from 'react'
import { Tree, TreeApi } from 'react-arborist'
import { getLastLoadedFile, setLastLoadedFile } from '../../data/AppData'
import { useActions, useSelector } from '../../states/app.context'
import { selectImagesTree } from '../../states/app.selectors'
import { TreeNode } from './TreeNode'

export default function AssetsPanel() {
  const { loadComponent, toggleFolder } = useActions();
  const treeRef = useRef<TreeApi<any>>(null)
  const treeData = useSelector(selectImagesTree);

  useEffect(() => {
    const lastFile = getLastLoadedFile()
    if (treeData[1] && lastFile) {
      console.log('treeData Files', lastFile)
      const node = treeRef.current.get(lastFile)
      // console.log('getLastLoadedFile node', node)
      treeRef.current.select(node)
    }
  }, [treeData])

  function onItemClick(node) {
    console.log('onItemClick', node);
    const { id: key, path, isDirectory } = node.data;
    if (isDirectory) {
      toggleFolder(key)
    } else {
      setLastLoadedFile(path)
      loadComponent(path);
    }
  }

  return (
    <div className='h-full'>
      <div className='flex w-[280px] space-x-1'>
        <span className='text-yellow-400 text-ellipsis overflow-hidden whitespace-nowrap text-left rtl'>Images&nbsp;</span>
      </div>
      <hr />
      <div className='flex h-screen'>
        <Tree
          height={window.innerHeight}
          ref={treeRef}
          data={treeData}
          onSelect={(nodes) => {
            // console.log('nodes', nodes);
            if (nodes[0])
              onItemClick(nodes[0])
          }}
          // onRename={(node) => {
          //   console.log('onRename', node);
          // }}
          onMove={({ dragIds, parentId, index }) => {
            console.log('dragIds', dragIds, parentId, index);
          }}
          openByDefault
        >
          {TreeNode}
        </Tree>
      </div>
    </div>
  )
}