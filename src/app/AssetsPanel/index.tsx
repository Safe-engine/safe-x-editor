import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import { Tree, TreeApi } from 'react-arborist'
import { AssetTypeBlock } from '../../components/common'
import { getLastLoadedFile, setLastLoadedFile } from '../../data/AppData'
import { AssetTabs } from '../../helper/constants'
import { useActions, useSelector } from '../../states/app.context'
import { selectAssetsTree, selectSelectedTab } from '../../states/app.selectors'
import { TreeNode } from './TreeNode'

export default function AssetsPanel() {
  const treeRef = useRef<TreeApi<any>>(null)
  const treeData = useSelector(selectAssetsTree);
  const selectedTab = useSelector(selectSelectedTab);
  const { setPreviewAssets, setSelectedTab, loadComponent } = useActions()

  useEffect(() => {
    const lastFile = getLastLoadedFile()
    if (treeData[1] && lastFile && selectedTab === AssetTabs.components) {
      console.log('treeData Files', treeData)
      const node = treeRef.current.get(lastFile)
      // console.log('getLastLoadedFile node', node)
      treeRef.current.select(node)
    }
  }, [treeData])

  function onItemClick(node) {
    // console.log('onItemClick', node);
    const { path, isDirectory } = node.data;
    if (isDirectory) {
      node.toggle()
    } else {
      if (selectedTab === AssetTabs.components) {
        setLastLoadedFile(path)
        loadComponent(path);
      } else {
        setPreviewAssets(node.data)
      }
    }
  }

  function changeSelected(tab) {
    return function () {
      setSelectedTab(tab)
    }
  }

  return (
    <div className='h-full'>
      <div className='flex w-[280px] space-x-1'>
        <AssetTypeBlock onClick={changeSelected(AssetTabs.components)}
          className={clsx({ 'bg-orange-600 text-white': selectedTab === AssetTabs.components })}
        >Components</AssetTypeBlock>
        <AssetTypeBlock onClick={changeSelected(AssetTabs.res)}
          className={clsx({ 'bg-orange-600 text-white': selectedTab === AssetTabs.res })}
        >Resources</AssetTypeBlock>
      </div>
      <hr />
      <div className='flex h-screen'>
        <Tree
          height={window.innerHeight - 25}
          ref={treeRef}
          data={treeData}
          idAccessor="path"
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