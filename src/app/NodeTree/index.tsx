import { sendRequest } from 'app/app.ipc';
import { ipcMain } from 'helper/electronRemote';
import pathUtils from 'path-browserify';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Tree, TreeApi } from 'react-arborist';
import toast from 'react-hot-toast';
import { CREATE_COMPONENT_FILE_REQUEST, GEN_COMPONENT_REQUEST } from 'shared/constant.message';
import { useActions, useSelector } from 'states/app.context';
import { selectComponentTree, selectRootFolder, selectSelectedFilePath, selectSelectedPaths } from 'states/app.selectors';
import { TreeItem } from './TreeItem';

export default function NodeTree() {
  const { selectEditingTagNode, selectEditMultiNodes } = useActions();
  const treeData = useSelector(selectComponentTree) || [];
  const filePath = useSelector(selectSelectedFilePath);
  const selectedPaths = useSelector(selectSelectedPaths);
  const rootFolder = useSelector(selectRootFolder);
  const treeRef = useRef<TreeApi<any> | undefined>(undefined);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const isApplyingPreviewSelection = useRef(false);
  const [selectedTreeItem, setSelectedTreeItem] = useState<any>({});
  const [treeHeight, setTreeHeight] = useState(() => Math.max(0, typeof window !== 'undefined' ? window.innerHeight - 32 : 500));

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

    const updateTreeHeight = () => {
      if (container.clientHeight > 0) {
        setTreeHeight(container.clientHeight);
      }
    };
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
      const mostRecentPath = nextSelection[nextSelection.length - 1];
      if (mostRecentPath) void tree.scrollTo(mostRecentPath);
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

  const onFocusNode = (node: any) => {
    const path = node?.data?.id || node?.id;
    if (!path) return;
    selectEditMultiNodes([path]);
    window.postMessage({ type: 'focusPreviewNode', path }, '*');
  }

  const onMove = ({ dragIds, parentId, index }) => {
    window.postMessage({ type: 'moveHierarchyNodes', dragIds, parentId, index }, '*');
  }

  const onDropNode = (item, parentId) => {
    window.postMessage({ type: 'addDroppedNode', item, parentId }, '*');
  }

  async function createFile(kind: 'scene' | 'component', sourceNode?: any) {
    if (!rootFolder) {
      toast.error('No project is loaded');
      return;
    }
    try {
      const response: any = await sendRequest({
        key: CREATE_COMPONENT_FILE_REQUEST,
        rootFolder,
        directory: `${rootFolder}/src/${kind === 'scene' ? 'scene' : 'components'}`,
        kind,
      });
      if (!response || response.error) throw Error(response?.message || `Unable to create ${kind}`);

      if (sourceNode) {
        const generated: any = await sendRequest({
          key: GEN_COMPONENT_REQUEST,
          nodesData: sourceNode,
          filePath: response.path,
        });
        if (!generated || generated.error) throw Error(generated?.message || `Unable to copy the selected node`);
      }

      if (kind === 'component' && sourceNode?.id) {
        const componentName = response.path.split(/[\\/]/).pop()?.replace(/\.tsx$/, '') || '';
        let importPath = pathUtils.relative(pathUtils.dirname(filePath), response.path).replace(/\\/g, '/').replace(/\.tsx$/, '');
        if (!importPath.startsWith('.')) importPath = `./${importPath}`;
        window.postMessage({
          type: 'extractHierarchyNode',
          nodeId: sourceNode.id,
          componentName,
          imported: `import { ${componentName} } from '${importPath}';`,
          createdPath: response.path,
          rootFolder,
        }, '*');
      } else {
        window.postMessage({ type: 'focusComponentRename', path: response.path, rootFolder }, '*');
      }
      toast.success(`${kind === 'scene' ? 'Scene' : 'Component'} created`);
    } catch (error: any) {
      toast.error(error?.message || `Unable to create ${kind}`);
    }
  }

  const onAddNode = (name: string, parentId: string) => {
    window.postMessage({ type: 'addDroppedNode', item: { kind: 'component', name }, parentId }, '*');
  }

  function getDroppedItem(event: React.DragEvent) {
    try {
      return JSON.parse(event.dataTransfer.getData('application/x-safex-node'));
    } catch {
      return undefined;
    }
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    const item = getDroppedItem(event);
    if (!item) return;
    window.postMessage({ type: 'addDroppedNode', item }, '*');
  }

  return (
    <div className='flex w-full flex-col bg-[#252525] text-[#dcdcdc]' >
      <div
        ref={treeContainerRef}
        className='min-h-0 flex-1'
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes('application/x-safex-node')) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={onDrop}
      >
        <Tree
          ref={treeRef}
          className='px-1 py-1'
          data={treeData[0]?.tag === 'SceneComponent' ? (treeData[0].children || []) : treeData}
          height={treeHeight}
          width="100%"
          onSelect={
            onSelectNodes
            }
          onRename={(node) => {
            console.log('onRename', node);
          }}
          onMove={onMove}
          openByDefault
        >
          {(props) => <TreeItem {...props} onAddNode={onAddNode} onCreateFile={createFile} onFocusNode={onFocusNode} onDropNode={onDropNode} />}
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
