import { getIsAddDivText, getIsAutoSaveGenComp, setIsAutoSaveGenComp } from 'data/AppData';

import Button from 'base/Button';
import Checkbox from 'base/Checkbox';
import pathUtils from 'path-browserify';
import { useContext, useEffect, useRef, useState } from 'react';
import { Tree } from 'react-arborist';
import {
  addNode, deleteNode,
  duplicateNode, genComponent, selectEditingTagNode, selectEditingText
} from 'states/app.action';
import {
  ADD_DIV, ADD_TEXT_NODE,
  DELETE_NODE, DUPLICATE_NODE
} from 'states/app.constant';
import { AppContext } from 'states/app.context';
import { selectComponentTree, selectRootFolder, selectSelectedEditingClassNamePath, selectSelectedFilePath } from 'states/app.selectors';
import TagTreeRender from './TagTreeRender';
import { TreeItem } from './TreeItem';

export default function NodeTree() {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const treeData = useSelector(selectComponentTree);
  const filePath = useSelector(selectSelectedFilePath);
  const rootPath = useSelector(selectRootFolder);
  const selectedEditingClassNamePath = useSelector(selectSelectedEditingClassNamePath);
  const [selectedTreeItem, setSelectedTreeItem] = useState<any>({});
  const treeViewComponentRef = useRef(null);
  const contextMenuRef = useRef(null);
  const [styleType, setStyleType] = useState('tailwind');
  const [isChangeState, setIsChangeState] = useState(false);
  const [isAutoSave, setIsAutoSave] = useState(false);

  useEffect(() => {
    if (treeData && treeData[0]) {
      console.log('treeData', treeData)
      setIsChangeState(true);
      if (getIsAutoSaveGenComp()) {
        onClickGenComponent();
      }
      const editorSceneFile = pathUtils.join(rootPath, 'src', '.safex', 'EditingScene.tsx')
      dispatch(genComponent(treeData[0], editorSceneFile, 'tailwind'));
    }
  }, [treeData]);

  useEffect(() => {
    setIsChangeState(false);
    setIsAutoSave(getIsAutoSaveGenComp());
  }, []);

  function onClickGenComponent() {
    setIsChangeState(false);
    dispatch(genComponent(treeData[0], filePath, styleType));
  }

  function treeViewItemContextMenu(e) {
    // console.log(e.itemData)
    const contextMenu = contextMenuRef.current.instance;
    const { tag } = e.itemData;
    contextMenu.option('items[0].visible', !!tag && tag !== 'Image');
    contextMenu.option('items[1].visible', !!tag && tag !== 'Image');

    if (e.itemData.tag) {
      setSelectedTreeItem(e.itemData);
    } else {
      setSelectedTreeItem({});
    }
  }

  function onItemClick(event) {
    // console.log(event.node)
    if (!event.itemData.tag) {
      dispatch(selectEditingText(event.node.key));
    } else {
      dispatch(selectEditingTagNode(event.node.key));
    }
  }

  function onChangeAutoSave(value) {
    setIsAutoSave(value);
    setIsAutoSaveGenComp(value);
    if (getIsAutoSaveGenComp()) {
      onClickGenComponent();
    }
  }

  function contextMenuItemClick(e) {
    // console.log(selectedTreeItem);
    if (!selectedTreeItem.key) { return; }
    switch (e.itemData.text) {
      case ADD_DIV: {
        dispatch(addNode({ tag: 'div', name: 'div', expanded: true }, selectedTreeItem.key));
        break;
      }
      case ADD_TEXT_NODE:
        if (getIsAddDivText()) {
          dispatch(addNode({ tag: 'div', name: 'text', items: [{ key: `text_${Date.now()}`, name: 'text' }], expanded: true }, selectedTreeItem.key));
        } else {
          dispatch(addNode({ name: 'text' }, selectedTreeItem.key));
        }
        break;
      case DUPLICATE_NODE:
        dispatch(duplicateNode(selectedTreeItem));
        break;
      case DELETE_NODE:
        dispatch(deleteNode(selectedTreeItem));
        break;
      default:
        break;
    }
  }

  function renderTreeViewItem(item) {
    // console.log(item)
    if (!item.tag) {
      return <TagTreeRender editing={item.editing} name={item.name} />;
    }
    if (item.tag === 'Image') {
      return <span className='flex text-blue-800 font-medium'>
        <img src={`file://${rootPath}/public${item.props.src}`} alt='' className='h-4 mr-2' />
        {`"${item.props.src}"`}
      </span>;
    }
    return (<div
      className={selectedEditingClassNamePath === item.key ?
        'bg-blue-200 p-1 rounded-md' : ('')}>
      <span className='text-green-600 font-medium'>
        &lt;{item.tag}&gt;
      </span>
      <span className='text-orange-600 m-1 font-medium'>"{item.name}"</span>
    </div>
    );
  }

  return (
    <div className='h-screen' >
      <div className='drive-header dx-treeview-item p-1'>
        <div className='dx-treeview-item-content'>
          <i className='dx-icon dx-icon-hierarchy'></i>
          <span className='text-yellow-400'>{filePath.replace(rootPath, '')}</span>
        </div>
      </div>
      <hr />
      <Tree
        className='p-1'
        data={treeData}
        onSelect={(nodes) => {
          console.log('nodes', nodes);
        }}
        onRename={(node) => {
          console.log('onRename', node);
        }}
        openByDefault
      >
        {TreeItem}
      </Tree>
      {/* <ContextMenu
        // ref={contextMenuRef}
        actions={contextMenuItems}
        width={200}
        target='#hierarchyComponent .dx-treeview-item'
        onItemClick={contextMenuItemClick} /> */}
      <div className='fixed bottom-0 flex justify-around w-[300px]'>
        <Checkbox
          name='Auto save'
          checked={isAutoSave}
          onChange={onChangeAutoSave}></Checkbox>
        {!isAutoSave &&
          <Button
            className=''
            // stylingMode='contained'
            // type='danger'
            onClick={onClickGenComponent}
          >{`Save ${isChangeState ? '*' : ''}`}</Button>
        }
      </div>
    </div>
  );
};
