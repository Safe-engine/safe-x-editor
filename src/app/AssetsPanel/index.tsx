import { ipcMain } from '@electron/remote'
import { TreeNode } from 'app/AssetsPanel/TreeNode'
import clsx from 'clsx'
import { getLastLoadedFile, getLastRootFolder, setLastLoadedFile } from 'data/AppData'
import pathUtils from 'path-browserify'
import { useEffect, useRef, useState } from 'react'
import { Tree, TreeApi } from 'react-arborist'
import { ADD_NEW_STATE, CREATE_ACTION, DELETE_COMPONENT, GET_FOLDER_FILES, NEW_COMPONENT, RE_NAME_COMPONENT } from 'shared/constant.message'
import { useActions, useSelector } from 'states/app.context'
import { selectFilesData } from 'states/app.selectors'
import { AssetTypeBlock } from '../../components/common'

export default function AssetsPanel() {
  const { getFiles, loadComponent } = useActions();
  const treeRef = useRef<TreeApi<any>>(null)
  const [isOpen, setOpen] = useState(false);
  const [openConfirmDeleteComponent, setOpenConfirmDeleteComponent] = useState(false);
  const [openRenameComponent, setOpenRenameComponent] = useState(false);
  const [createPath, setCreatePath] = useState('');
  const treeData = useSelector(selectFilesData);
  const [openCreateComponent, setOpenCreateComponent] = useState(false);
  const [isOpenNewState, setOpenNewState] = useState(false);
  const [selectedTab, setSelectedTab] = useState('components');

  useEffect(() => {
    function getFilesCB(data) {
      console.log('GET_FOLDER_FILES', data)
      getFiles(data);
    }
    ipcMain.on(GET_FOLDER_FILES, getFilesCB);
    const lastProject = getLastRootFolder()
    if (lastProject) {
      getFilesCB(lastProject);
    }
    return () => {
      ipcMain.removeListener(GET_FOLDER_FILES, getFilesCB)
    }
  }, [])

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
      // dispatch({
      //   type: TOGGLE_FOLDER,
      //   key,
      // });
    } else {
      setLastLoadedFile(path)
      loadComponent(path);
    }
  }

  function treeViewItemContextMenu(e) {
    setCreatePath(e.itemData.path);
  }

  function contextMenuItemClick(e) {
    // console.log(e.itemData)
    switch (e.itemData.text) {
      case CREATE_ACTION:
        setOpen(true);
        break;
      case NEW_COMPONENT:
        setOpenCreateComponent(true);
        break;
      case DELETE_COMPONENT:
        setOpenConfirmDeleteComponent(true);
        break;
      case RE_NAME_COMPONENT:
        setOpenRenameComponent(true);
        break;
      case ADD_NEW_STATE:
        setOpenNewState(true);
        break;
      default:
        // dispatch(executeFileCommandAction(type, path, rootFolder));
        break;
    }
  }

  function getComponentName(path) {
    let name = pathUtils.basename(path)
      .replace('.js', '')
      .replace('.tsx', '');
    if (name === 'index') {
      name = pathUtils.dirname(path);
    }
    return name;
  }

  function changeSelected(tab) {
    return function () {
      setSelectedTab(tab)
    }
  }

  return (
    <div className=''>
      <div className='flex w-[280px] space-x-1'>
        {/* <AssetTypeBlock
          onClick={changeSelected('scenes')}
          className={clsx({ 'bg-orange-600': selectedTab === 'scenes' })}
        >Scene</AssetTypeBlock> */}
        <AssetTypeBlock onClick={changeSelected('components')}
          className={clsx({ 'bg-orange-600': selectedTab === 'components' })}
        >Components</AssetTypeBlock>
        <AssetTypeBlock onClick={changeSelected('res')}
          className={clsx({ 'bg-orange-600': selectedTab === 'res' })}
        >Resources</AssetTypeBlock>
      </div>
      <hr />
      <div className='flex h-screen'>
        <Tree
          ref={treeRef}
          data={treeData}
          onSelect={(nodes) => {
            // console.log('nodes', nodes);
            if (nodes[0])
              onItemClick(nodes[0])
          }}
          onRename={(node) => {
            console.log('onRename', node);
          }}
          openByDefault
        >
          {TreeNode}
        </Tree>
        {/* <ContextMenu
          ref={contextMenuRef}
          dataSource={contextMenuFilesItems}
          width={200}
          target='#hierarchyFiles .dx-treeview-item'
          onItemClick={contextMenuItemClick} /> */}
      </div>
    </div>
  )
}
