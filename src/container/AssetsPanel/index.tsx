'use client'

import { useContext, useEffect, useRef, useState } from 'react'

import { AssetTypeBlock, ScrollAblePanel } from '../../components/common'
import { ipcRenderer } from 'electron'
import { GET_FOLDER_FILES } from 'shared/constant.message'
import TabPanel from 'devextreme-react/tab-panel';
import Button from 'devextreme-react/button';
import CheckBox from 'devextreme-react/check-box';
import ContextMenu from 'devextreme-react/context-menu';
import Sortable from 'devextreme-react/sortable';
import TreeView from 'devextreme-react/tree-view';
import { AppContext } from 'states/app.context';
import { selectRightData } from 'states/app.selectors';
import {
  ADD_NEW_STATE, CREATE_ACTION,
  CREATE_NEW_ACTION, DELETE_COMPONENT,
  NEW_COMPONENT, RE_NAME_COMPONENT
} from 'shared/constant.message';
import { addNode, genPropTypes, updatePropType } from 'states/app.action';
import { GET_FILES, LOAD_COMPONENT, TOGGLE_FOLDER } from 'states/app.constant';
import { selectPropTypes, selectRootFolder, selectSelectedFilePath } from 'states/app.selectors';
import pathUtils from 'path-browserify';
import { getIsAutoSaveGenPropTypes, setIsAutoSaveGenPropTypes } from 'data/AppData'
import { contextMenuFilesItems } from 'data/dataContextMenu'
import PropDisplay from 'components/PropDisplay'

export default function AssetsPanel() {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const [treeData, setTreeData] = useState<any>({})
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
  // const filesData = useSelector(makeSelectFilesData());
  const [openCreateComponent, setOpenCreateComponent] = useState(false);
  const [isOpenNewState, setOpenNewState] = useState(false);
  const [isChangeState, setIsChangeState] = useState(false);
  const [isAutoSave, setIsAutoSave] = useState(false);

  function itemTitleRender(tab) {
    return <span>{tab.title}</span>;
  }

  function onSelectionChanged(args) {
    if (args.name === 'selectedIndex') {
      setSelectedIndex(args.value);
    }
  }
  useEffect(() => {
    function getFilesCB(event, data) {
      console.log('GET_FOLDER_FILES', data)
      setTreeData(data);
    }
    ipcRenderer.on(GET_FOLDER_FILES, getFilesCB);
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
      ipcRenderer.removeListener(GET_FOLDER_FILES, getFilesCB)
    }
  }, [])

  function onItemClick(event) {
    // console.log(event.node);
    const { key, itemData } = event.node;
    const { path, isDirectory } = itemData;
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
  // Necessary because we will have to use Greet as a component later.
  return (
    <div className=''>
      <div className='flex flex-wrap w-[280px]'>
        <AssetTypeBlock>Scene</AssetTypeBlock>
        <AssetTypeBlock>Components</AssetTypeBlock>
        <AssetTypeBlock>Resources</AssetTypeBlock>
      </div>
      <div className='flex h-screen'>
        <Sortable
          id='hierarchyFiles'
          className='pb-20'
          height={'100%'}
          filter='.dx-treeview-item'
          group='shared'
          data={treeData.res}
          allowDropInsideItem={false}
          allowReordering={true}
          // onDragChange={onDragChange}
          onDragEnd={onDragEnd}
        >
          <TreeView
            id='treeViewProject'
            expandNodesRecursive={false}
            dataStructure='tree'
            ref={ctx => treeViewProjectRef.current = ctx}
            onItemContextMenu={treeViewItemContextMenu}
            items={treeData.src}
            width={270}
            // height={'100%'}
            scrollDirection='vertical'
            // height={380}
            displayExpr='name'
            keyExpr='path'
            onItemClick={onItemClick}
          />
        </Sortable>
        <ContextMenu
          ref={contextMenuRef}
          dataSource={contextMenuFilesItems}
          width={200}
          target='#hierarchyFiles .dx-treeview-item'
          onItemClick={contextMenuItemClick} />
        {/* <div className='ml-4 w-1/2 border border-orange-200 bg-gray-100'>
          <div className='py-2 text-orange-800 text-lg font-bold text-center border-cool-gray-300 border-b'>Prop types</div>
          {Object.entries(componentPropTypes)
            .map(([name, value]) => {
              return <PropDisplay name={name} data={value} onChangePropData={onChangePropData} key={name} />;
            })}
          <div className='fixed bottom-0 flex justify-around px-4'>
            <CheckBox text='Auto save'
              value={isAutoSave}
              onValueChange={onChangeAutoSave}></CheckBox>
            {!isAutoSave &&
              <Button
                className='ml-36 mr-auto'
                text={`Save ${isChangeState ? '*' : ''}`}
                stylingMode='contained'
                type='success'
                onClick={onClickGenPropTypes}
              />
            }
          </div>
        </div> */}
      </div>

      {/* <CreateActionModal
        isOpen={isOpen}
        setOpen={setOpen}
        createPath={createPath}
      />
      <CreateComponentModal
        isOpen={openCreateComponent}
        setOpen={setOpenCreateComponent}
        createPath={createPath}
      />
      <ConfirmDeleteDialog
        isOpen={openConfirmDeleteComponent}
        setOpen={setOpenConfirmDeleteComponent}
        componentPath={createPath}
      />
      <ReNameComponentDialog
        isOpen={openRenameComponent}
        setOpen={setOpenRenameComponent}
        componentPath={createPath}
      />
      <AddNewStateDialog
        isOpen={isOpenNewState}
        setOpen={setOpenNewState}
        createPath={createPath}
      /> */}
    </div>
  )
}
