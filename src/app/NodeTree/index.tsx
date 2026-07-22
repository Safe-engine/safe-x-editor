import { sendRequest } from 'app/app.ipc';
import { ipcMain } from 'helper/electronRemote';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Tree, TreeApi } from 'react-arborist';
import toast from 'react-hot-toast';
import { GEN_COMPONENT_REQUEST } from 'shared/constant.message';
import { useActions, useSelector } from 'states/app.context';
import { selectComponentTree, selectRootFolder, selectSelectedFilePath, selectSelectedPaths } from 'states/app.selectors';
import { TreeItem } from './TreeItem';

export default function NodeTree() {
  const { selectEditingTagNode, selectEditMultiNodes } = useActions();
  const treeData = useSelector(selectComponentTree);
  const filePath = useSelector(selectSelectedFilePath);
  const rootPath = useSelector(selectRootFolder);
  const selectedPaths = useSelector(selectSelectedPaths);
  const treeRef = useRef<TreeApi<any> | undefined>(undefined);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const isApplyingPreviewSelection = useRef(false);
  const [selectedTreeItem, setSelectedTreeItem] = useState<any>({});
  const [treeHeight, setTreeHeight] = useState(0);

  useEffect(() => {
    if (treeData && treeData[0]) {
      // console.log('treeData', treeData, filePath)
      // if (getIsAutoSaveGenComp()) {
      //   onClickGenComponent();
      // }
      async function genComponentCB() {
        const data: any = await sendRequest({
          key: GEN_COMPONENT_REQUEST,
          nodesData: treeData[0], filePath
        });
        toast.success('Generate Component Success');
      }
      ipcMain.on(GEN_COMPONENT_REQUEST, genComponentCB);
      return () => {
        ipcMain.removeListener(GEN_COMPONENT_REQUEST, genComponentCB)
      }
    }
  }, [treeData, filePath]);

  useLayoutEffect(() => {
    const container = treeContainerRef.current;
    if (!container) return;

    const updateTreeHeight = () => setTreeHeight(container.clientHeight);
    updateTreeHeight();

    const observer = new ResizeObserver(updateTreeHeight);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const tree = treeRef.current;
    if (!tree) return;

    const currentSelection = tree.selectedIds;
    const nextSelection = [...new Set(selectedPaths.filter(Boolean).map((path) => {
      let treePath = path;
      while (treePath && !tree.get(treePath)) {
        treePath = treePath.slice(0, treePath.lastIndexOf('-'));
      }
      return treePath;
    }).filter(Boolean))];
    const isSynced = currentSelection.size === nextSelection.length
      && nextSelection.every((path) => currentSelection.has(path));

    if (isSynced) return;

    isApplyingPreviewSelection.current = true;
    try {
      tree.setSelection({
        ids: nextSelection,
        anchor: nextSelection[0] || null,
        mostRecent: nextSelection[nextSelection.length - 1] || null,
      });
    } finally {
      isApplyingPreviewSelection.current = false;
    }
  }, [selectedPaths]);

  function onItemClick(node) {
    // console.log('onItemClick node', node.data)
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
    if (isApplyingPreviewSelection.current) return;
    selectEditMultiNodes(nodes.map(n => n.data.id));
    // if (nodes[0] && nodes[0].data.tag) {
    //   selectEditingTagNode(nodes[0].data.id);
    // }
  }

  const onFocusNode = (node) => {
    const path = node.data.id;
    if (!path) return;
    selectEditMultiNodes([path]);
    window.postMessage({ type: 'focusPreviewNode', path }, '*');
  }

  return (
    <div className='flex h-full flex-col bg-[#252525] text-[#dcdcdc]' >
      <div className='flex h-8 shrink-0 items-center border-b border-[#151515] bg-[#202020] px-2'>
        <div className='min-w-0 text-[11px] font-bold uppercase tracking-wide text-[#dcdcdc]'>
          Hierarchy
        </div>
        <div className='ml-2 min-w-0 flex-1 truncate text-right text-[10px] text-[#8f8f8f]' title={filePath}>
          {filePath.replace(rootPath, '')}&nbsp;
        </div>
      </div>
      <div ref={treeContainerRef} className='min-h-0 flex-1'>
        <Tree
          ref={treeRef}
          className='px-1 py-1'
          data={treeData[0]?.tag === 'SceneComponent' ? treeData[0].children : treeData}
          height={treeHeight}
          width="100%"
          onSelect={
            onSelectNodes
            }
          onRename={(node) => {
            console.log('onRename', node);
          }}
          openByDefault
        >
          {(props) => <TreeItem {...props} onFocusNode={onFocusNode} />}
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
