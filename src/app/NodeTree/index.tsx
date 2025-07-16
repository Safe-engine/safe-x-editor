import { useEffect, useState } from 'react';
import { Tree } from 'react-arborist';
import { genComponent } from '../../states/app.action';
import { useActions, useSelector } from '../../states/app.context';
import { selectComponentTree, selectRootFolder, selectSelectedFilePath } from '../../states/app.selectors';
import { TreeItem } from './TreeItem';

export default function NodeTree() {
  const { selectEditingTagNode, selectEditMultiNodes } = useActions();
  const treeData = useSelector(selectComponentTree);
  const filePath = useSelector(selectSelectedFilePath);
  const rootPath = useSelector(selectRootFolder);
  const [selectedTreeItem, setSelectedTreeItem] = useState<any>({});

  useEffect(() => {
    if (treeData && treeData[0]) {
      window.addEventListener('keydown', function (event) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isSaveShortcut = (
          (isMac && event.metaKey && event.key === 's') ||
          (!isMac && event.ctrlKey && event.key === 's')
        );
        if (isSaveShortcut) {
          event.preventDefault();
          console.log('Detected Ctrl+S or Command+S');
          dispatch(genComponent(treeData[0], filePath));
        }
      });
    }
  }, [treeData, filePath]);

  function onItemClick(node) {
    console.log('onItemClick node', node.data)
    const { id: key, tag } = node.data;
    if (tag) {
      selectEditingTagNode(key);
    }
  }

  // function contextMenuItemClick(e) {
  //   // console.log(selectedTreeItem);
  //   if (!selectedTreeItem.id) { return; }
  //   switch (e.itemData.text) {
  //     case ADD_DIV: {
  //       dispatch(addNode({ tag: 'div', name: 'div', expanded: true }, selectedTreeItem.key));
  //       break;
  //     }
  //     case ADD_TEXT_NODE:
  //       dispatch(addNode({ name: 'text' }, selectedTreeItem.key));
  //       break;
  //     case DUPLICATE_NODE:
  //       dispatch(duplicateNode(selectedTreeItem));
  //       break;
  //     case DELETE_NODE:
  //       dispatch(deleteNode(selectedTreeItem));
  //       break;
  //     default:
  //       break;
  //   }
  // }

  const onSelectNodes = (nodes) => {
    console.log(nodes)
    selectEditMultiNodes(nodes.map(n => n.data.id));
    // if (nodes[0] && nodes[0].data.tag) {
    //   selectEditingTagNode(nodes[0].data.id);
    // }
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
        onSelect={
          onSelectNodes
          }
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
