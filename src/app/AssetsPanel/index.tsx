import { ipcMain } from '@electron/remote'
import { TreeNode } from 'app/AssetsPanel/TreeNode'
import clsx from 'clsx'
import { getIsAutoSaveGenPropTypes, setIsAutoSaveGenPropTypes } from 'data/AppData'
import pathUtils from 'path-browserify'
import { useContext, useEffect, useRef, useState } from 'react'
import { Tree } from 'react-arborist'
import { ADD_NEW_STATE, CREATE_ACTION, DELETE_COMPONENT, GET_FOLDER_FILES, NEW_COMPONENT, RE_NAME_COMPONENT } from 'shared/constant.message'
import { addNode, genPropTypes, getFiles, updatePropType } from 'states/app.action'
import { LOAD_COMPONENT, TOGGLE_FOLDER } from 'states/app.constant'
import { AppContext } from 'states/app.context'
import { selectFilesData, selectPropTypes, selectRightData, selectRootFolder, selectSelectedFilePath } from 'states/app.selectors'
import { AssetTypeBlock } from '../../components/common'

export default function AssetsPanel() {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  // const [treeData, setTreeData] = useState<any>({})
  const rightData = useSelector(selectRightData);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const treeViewProjectRef = useRef(null);
  const contextMenuRef = useRef(null);
  const root = useSelector(selectRootFolder);
  const filePath = useSelector(selectSelectedFilePath);
  const componentPropTypes = useSelector(selectPropTypes);
  const [isOpen, setOpen] = useState(false);
  const [openConfirmDeleteComponent, setOpenConfirmDeleteComponent] = useState(false);
  const [openRenameComponent, setOpenRenameComponent] = useState(false);
  const [createPath, setCreatePath] = useState('');
  const treeData = useSelector(selectFilesData);
  const [openCreateComponent, setOpenCreateComponent] = useState(false);
  const [isOpenNewState, setOpenNewState] = useState(false);
  const [isChangeState, setIsChangeState] = useState(false);
  const [isAutoSave, setIsAutoSave] = useState(false);
  const [selectedTab, setSelectedTab] = useState('components');

  function itemTitleRender(tab) {
    return <span>{tab.title}</span>;
  }

  function onSelectionChanged(args) {
    if (args.name === 'selectedIndex') {
      setSelectedIndex(args.value);
    }
  }
  useEffect(() => {
    function getFilesCB(data) {
      console.log('GET_FOLDER_FILES', data)
      dispatch(getFiles(data));
    }
    ipcMain.on(GET_FOLDER_FILES, getFilesCB);
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
    return () => {
      ipcMain.removeListener(GET_FOLDER_FILES, getFilesCB)
    }
  }, [])

  function onItemClick(node) {
    console.log('onItemClick', node);
    const { id: key, path, isDirectory } = node.data;
    if (isDirectory) {
      dispatch({
        type: TOGGLE_FOLDER,
        key,
      });
    } else {
      dispatch({
        type: LOAD_COMPONENT,
        path
      });
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

  function onDragEnd(e) {
    // console.log('comp', e.fromComponent.element())
    if (e.fromComponent === e.toComponent && e.fromIndex === e.toIndex) {
      return;
    }
    const nodeElementFrom = e.fromComponent.element().querySelectorAll('.dx-treeview-node')[e.fromIndex];
    const fromNode = nodeElementFrom.getAttribute('data-item-id');
    const nodeElementTo = e.toComponent.element().querySelectorAll('.dx-treeview-node')[e.toIndex];
    const toNode = nodeElementTo.getAttribute('data-item-id');
    let imported = pathUtils.relative(pathUtils.dirname(filePath), fromNode)
      .replace(/\.[^/.]+$/, '');
    let name = getComponentName(fromNode);
    let nameTo = getComponentName(filePath);
    if (imported === nameTo) {
      imported = undefined;
    } else if (!imported.startsWith('.')) {
      imported = `./${imported}`;
    }
    imported = `import ${name} from '${imported}';`;
    // console.log('fromNode', fromNode, toNode, nameTo, imported)
    dispatch(addNode({ tag: name, imported, expanded: true }, toNode));
  }

  function onChangeAutoSave(value) {
    setIsAutoSave(value);
    setIsAutoSaveGenPropTypes(value);
    if (getIsAutoSaveGenPropTypes()) {
      onClickGenPropTypes();
    }
  }

  function onClickGenPropTypes() {
    setIsChangeState(false);
    dispatch(genPropTypes(componentPropTypes, filePath));
  }

  function onChangePropData(name, propsData) {
    dispatch(updatePropType(name, propsData));
  }

  function changeSelected(tab) {
    return function () {
      setSelectedTab(tab)
    }
  }
  // Necessary because we will have to use Greet as a component later.
  return (
    <div className=''>
      <div className='flex w-[280px] space-x-1'>
        <AssetTypeBlock
          onClick={changeSelected('scenes')}
          className={clsx({ 'bg-orange-600': selectedTab === 'scenes' })}
        >Scene</AssetTypeBlock>
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
          data={treeData[selectedTab]}
          onSelect={(nodes) => {
            console.log('nodes', nodes);
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
