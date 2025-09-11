import { useEffect, useRef } from 'react';
import { Tree } from 'react-arborist';
import { GEN_COMPONENT_REQUEST } from '../../shared/constant.message';
import { redoEdit, undoEdit } from '../../states/actions';
import { useActions, useSelector } from '../../states/app.context';
import { selectComponentTree, selectDragNodePath, selectRootFolder, selectSelectedFilePath } from '../../states/app.selectors';
import { sendRequest } from '../app.ipc';
import { TreeItem } from './TreeItem';

export default function NodeTree() {
  const actions = useActions();
  const { selectEditMultiNodes, createNode, arrangeNode } = actions
  const treeData = useSelector(selectComponentTree);
  const filePath = useSelector(selectSelectedFilePath);
  const rootPath = useSelector(selectRootFolder);
  const dragNode = useSelector(selectDragNodePath);
  const dragNodePathRef = useRef<string | null>(null)

  useEffect(() => {
    dragNodePathRef.current = dragNode.path
  }, [dragNode])

  useEffect(() => {
    if (!treeData || !treeData[0]) {
      return
    }
    async function genComponentCB() {
      const data: any = await sendRequest({
        key: GEN_COMPONENT_REQUEST,
        nodesData: treeData[0], filePath
      });
    }
    function onKeyDownE(event) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isSaveShortcut = (
        (isMac && event.metaKey && event.key === 's') ||
        (!isMac && event.ctrlKey && event.key === 's')
      );
      if (isSaveShortcut) {
        event.preventDefault();
        console.log('Detected Ctrl+S or Command+S');
        genComponentCB()
        return
      }
      const isUndoShortcut = (
        (isMac && event.metaKey && event.key === 'z') ||
        (!isMac && event.ctrlKey && event.key === 'z')
      );
      if (isUndoShortcut) {
        event.preventDefault();
        console.log('Detected Ctrl+Z or Command+Z');
        undoEdit(actions)
        return
      }
      const isRedoShortcut = (
        (isMac && event.metaKey && event.key === 'y') ||
        (!isMac && event.ctrlKey && event.key === 'y')
      );
      if (isRedoShortcut) {
        event.preventDefault();
        console.log('Detected Ctrl+Y or Command+Y');
        redoEdit(actions)
        return
      }
    }
    window.addEventListener('keydown', onKeyDownE);
    return () => {
      window.removeEventListener('keydown', onKeyDownE);
    }
  }, [treeData, filePath]);

  // function onItemClick(node) {
  //   console.log('onItemClick node', node.data)
  //   const { id: key, tag } = node.data;
  //   if (tag) {
  //     selectEditingTagNode(key);
  //   }
  // }

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
    // console.log(nodes)
    selectEditMultiNodes(nodes.map(n => n.data.id));
    // if (nodes[0] && nodes[0].data.tag) {
    //   selectEditingTagNode(nodes[0].data.id);
    // }
  }

  return (
    <div className='h-full' >
      <span className='text-yellow-400 text-ellipsis overflow-hidden whitespace-nowrap text-left rtl'>{filePath.replace(rootPath, '')}&nbsp;</span>
      <hr />
      <div className='overflow-y-scroll h-full'
        onDrop={(event) => {
          event.preventDefault();
          setTimeout(() => {
            console.log('drop', dragNodePathRef.current)
            if (!dragNodePathRef.current) return
            createNode()
          }, 1)
        }}>
        <Tree
          className='p-1 '
          height={window.innerHeight - 25}
          data={treeData[0]?.tag === 'SceneComponent' ? treeData[0].children : treeData}
          onSelect={onSelectNodes}
          // onRename={(node) => {
          //   console.log('onRename', node);
          // }}
          onMove={({ dragIds, parentId, index }) => {
            // console.log('onMove', dragIds, parentId, index);
            if (dragIds.length > 0) arrangeNode(parentId, dragIds)
            else createNode(parentId)
          }}
          openByDefault
        >
          {TreeItem}
        </Tree>
      </div>
      {/* <ContextMenu
        // ref={contextMenuRef}
        actions={contextMenuItems}
        width={200}
        target='#hierarchyComponent .dx-treeview-item'
        onItemClick={contextMenuItemClick} /> */}
    </div>
  );
};
