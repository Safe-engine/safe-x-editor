import { useRef } from 'react'
import { Tree, TreeApi } from 'react-arborist'
import { useSelector } from '../../states/app.context'
import { selectAssetsTree } from '../../states/app.selectors'
import { TreeNode } from './TreeNode'

export default function AssetsPanel() {
  const treeRef = useRef<TreeApi<any>>(null)
  const treeData = useSelector(selectAssetsTree);

  // useEffect(() => {
  //   const lastFile = getLastLoadedFile()
  //   if (treeData[1] && lastFile) {
      // console.log('treeData Files', treeData)
  //     const node = treeRef.current.get(lastFile)
  //     // console.log('getLastLoadedFile node', node)
  //     treeRef.current.select(node)
  //   }
  // }, [treeData])

  function onItemClick(node) {
    // console.log('onItemClick', node.isOpen);
    const { path, isDirectory } = node.data;
    if (isDirectory) {
      // toggleFolder(path)
      node.toggle()
      // } else {
      //   setLastLoadedFile(path)
      //   loadComponent(path);
    }
  }

  return (
    <div className='h-full'>
      <div className='flex w-[280px] space-x-1'>
        <span className='text-yellow-400 text-ellipsis overflow-hidden whitespace-nowrap text-left rtl'>Assets&nbsp;</span>
      </div>
      <hr />
      <div className='flex h-screen'>
        <Tree
          height={window.innerHeight - 25}
          ref={treeRef}
          data={treeData}
          // idAccessor="path"
          onSelect={(nodes) => {
            // console.log('nodes', nodes);
            if (nodes[0])
              onItemClick(nodes[0])
          }}
          disableDrag={(drag) => {
            // console.log('disableDrag', drag)
            return drag.isDirectory;
          }}
          // onRename={(node) => {
          //   console.log('onRename', node);
          // }}
          // onMove={({ dragIds, parentId, index }) => {
          //   console.log('dragIds', dragIds, parentId, index);
          // }}
          openByDefault
        >
          {TreeNode}
        </Tree>
      </div>
    </div>
  )
}