import { sendRequest } from 'app/app.ipc';
import { ipcMain } from 'helper/electronRemote';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Tree, TreeApi } from 'react-arborist';
import toast from 'react-hot-toast';
import { GEN_COMPONENT_REQUEST, RUN_DEV_SERVER_REQUEST } from 'shared/constant.message';
import { useActions, useSelector } from 'states/app.context';
import { selectComponentTree, selectRootFolder, selectSelectedFilePath, selectSelectedPaths } from 'states/app.selectors';
import { TreeItem } from './TreeItem';
import QRCode from 'qrcode';
import { FiLoader, FiPlay, FiRefreshCw, FiSave } from 'react-icons/fi';
import { LuQrCode } from 'react-icons/lu';

export default function NodeTree() {
  const { loadComponent, selectEditingTagNode, selectEditMultiNodes } = useActions();
  const treeData = useSelector(selectComponentTree) || [];
  const filePath = useSelector(selectSelectedFilePath);
  const rootFolder = useSelector(selectRootFolder);
  const selectedPaths = useSelector(selectSelectedPaths);
  const treeRef = useRef<TreeApi<any> | undefined>(undefined);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const isApplyingPreviewSelection = useRef(false);
  const [selectedTreeItem, setSelectedTreeItem] = useState<any>({});
  const [treeHeight, setTreeHeight] = useState(() => Math.max(0, typeof window !== 'undefined' ? window.innerHeight - 32 : 500));
  const [isProjectDirty, setIsProjectDirty] = useState(false);
  const [isStartingDevServer, setIsStartingDevServer] = useState(false);
  const [devPageUrl, setDevPageUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (!devPageUrl) return;
    void QRCode.toDataURL(devPageUrl, { margin: 1, width: 200 }).then(setQrCodeUrl);
  }, [devPageUrl]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.type === 'previewEditingState') setIsProjectDirty(event.data.isEditing);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

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

  const onFocusNode = (node) => {
    const path = node.data.id;
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

  async function runDevServer() {
    if (!rootFolder) return;
    setIsStartingDevServer(true);
    try {
      const response: any = await sendRequest({ key: RUN_DEV_SERVER_REQUEST, rootFolder });
      if (response?.error) throw Error(response.message);
      setDevPageUrl(response.url);
      toast.success('Dev page is running in your browser.');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to start the dev server.');
    } finally {
      setIsStartingDevServer(false);
    }
  }

  return (
    <div className='flex h-full flex-col bg-[#252525] text-[#dcdcdc]' >
      <div className='flex h-8 shrink-0 items-center border-b border-[#151515] bg-[#202020] px-2'>
        <div className='min-w-0 text-[11px] font-bold uppercase tracking-wide text-[#dcdcdc]'>
          Hierarchy
        </div>
        <button
          type='button'
          className={`ml-auto flex h-6 w-6 items-center justify-center rounded-sm ${isProjectDirty ? 'text-[#ff5c5c] hover:bg-[#303846] hover:text-[#ff7777]' : 'text-[#aeb8c5] hover:bg-[#303846] hover:text-white'}`}
          onClick={() => window.postMessage({ type: 'saveProject' }, '*')}
          title='Save Project (Ctrl/Cmd+S)'
          aria-label='Save Project'
        >
          <FiSave size={14} />
        </button>
        <button
          type='button'
          className='flex h-6 w-6 items-center justify-center rounded-sm text-[#aeb8c5] hover:bg-[#303846] hover:text-white disabled:cursor-not-allowed disabled:opacity-40'
          onClick={() => {
            loadComponent(filePath)
            window.postMessage({ type: 'reLoad' }, '*')
          }}
          disabled={!filePath}
          aria-label='Reload component'
          title='Reload component'
        >
          <FiRefreshCw size={14} />
        </button>
        {devPageUrl ? (
          <div className='group relative'>
            <button
              type='button'
              className='flex h-6 w-6 items-center justify-center rounded-sm text-[#aeb8c5] hover:bg-[#303846] hover:text-white'
              aria-label='Show dev page QR code'
              title='Show dev page QR code'
            >
              <LuQrCode size={15} />
            </button>
            <div className='pointer-events-none absolute right-0 top-7 z-50 hidden w-56 rounded-md border border-[#3d4654] bg-[#202020] p-3 text-center shadow-xl group-hover:block'>
              {qrCodeUrl && <img className='mx-auto h-48 w-48 rounded bg-white p-1' src={qrCodeUrl} alt={`QR code for ${devPageUrl}`} />}
              <div className='mt-2 break-all text-[10px] text-[#aeb8c5]'>{devPageUrl}</div>
            </div>
          </div>
        ) : (
          <button
            type='button'
            className='flex h-6 w-6 items-center justify-center rounded-sm text-[#aeb8c5] hover:bg-[#303846] hover:text-white disabled:cursor-not-allowed disabled:opacity-40'
            onClick={() => void runDevServer()}
            disabled={!rootFolder || isStartingDevServer}
            aria-label='Run dev server'
            title='Run dev server'
          >
            {isStartingDevServer ? <FiLoader className='animate-spin' size={14} /> : <FiPlay size={14} />}
          </button>
        )}
      </div>
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
          {(props) => <TreeItem {...props} onAddNode={onAddNode} onFocusNode={onFocusNode} onDropNode={onDropNode} />}
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
