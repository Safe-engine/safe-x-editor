import { ipcMain } from '@electron/remote';
import { useEffect, useState } from 'react';
import { Tree } from 'react-arborist';
import { GEN_COMPONENT_REQUEST } from 'shared/constant.message';
import {
  addNode, deleteNode,
  duplicateNode, genComponent, selectEditingTagNode, selectEditingText
} from 'states/app.action';
import {
  ADD_DIV, ADD_TEXT_NODE,
  DELETE_NODE, DUPLICATE_NODE
} from 'states/app.constant';
import { useDispatch, useSelector } from 'states/app.context';
import { selectComponentTree, selectRootFolder, selectSelectedFilePath } from 'states/app.selectors';
import { TreeItem } from './TreeItem';

export default function NodeTree() {
  const dispatch = useDispatch();
  const treeData = useSelector(selectComponentTree);
  const filePath = useSelector(selectSelectedFilePath);
  const rootPath = useSelector(selectRootFolder);
  const [selectedTreeItem, setSelectedTreeItem] = useState<any>({});

  useEffect(() => {
    if (treeData && treeData[0]) {
      // console.log('treeData', treeData, filePath)
      // if (getIsAutoSaveGenComp()) {
      //   onClickGenComponent();
      // }
      function genComponentCB() {
        dispatch(genComponent(treeData[0], filePath));
      }
      ipcMain.on(GEN_COMPONENT_REQUEST, genComponentCB);
      return () => {
        ipcMain.removeListener(GEN_COMPONENT_REQUEST, genComponentCB)
      }
    }
  }, [treeData, filePath]);

  function onItemClick(node) {
    console.log('onItemClick node', node.data)
    const { id: key, tag } = node.data;
    if (!tag) {
      dispatch(selectEditingText(key));
    } else {
      dispatch(selectEditingTagNode(key));
    }
  }

  function contextMenuItemClick(e) {
    // console.log(selectedTreeItem);
    if (!selectedTreeItem.id) { return; }
    switch (e.itemData.text) {
      case ADD_DIV: {
        dispatch(addNode({ tag: 'div', name: 'div', expanded: true }, selectedTreeItem.key));
        break;
      }
      case ADD_TEXT_NODE:
        dispatch(addNode({ name: 'text' }, selectedTreeItem.key));
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

  return (
    <div className='h-screen' >
      <div className='drive-header dx-treeview-item p-1'>
        <div className='dx-treeview-item-content '>
          <i className='dx-icon dx-icon-hierarchy'></i>
          <span className='text-yellow-400 text-ellipsis overflow-hidden whitespace-nowrap text-left rtl'>{filePath.replace(rootPath, '')}&nbsp;</span>
        </div>
      </div>
      <hr />
      <Tree
        className='p-1'
        data={treeData[0]?.tag === 'SceneComponent' ? treeData[0].children : treeData}
        onSelect={(nodes) => {
          console.log('node tree', nodes);
          if (nodes[0])
            onItemClick(nodes[0])
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
    </div>
  );
};
