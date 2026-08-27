import { TreeNode } from 'app/AssetsPanel/TreeNode'
import { sendRequest } from 'app/app.ipc'
import Input from 'base/Input'
import Modal from 'base/Modal'
import clsx from 'clsx'
import { getLastLoadedFile, getLastRootFolder } from 'data/AppData'
import { ipcMain } from 'helper/electronRemote'
import pathUtils from 'path-browserify'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Tree, TreeApi } from 'react-arborist'
import toast from 'react-hot-toast'
import { FiGrid, FiList, FiRefreshCw, FiX } from 'react-icons/fi'
import { CREATE_ASSET_REQUEST, CREATE_COMPONENT_FILE_REQUEST, DELETE_COMPONENT, GET_FOLDER_FILES, IMPORT_RESOURCES_REQUEST, RE_NAME_COMPONENT, RENAME_RESOURCE_REQUEST, SYNC_RES_REQUEST } from 'shared/constant.message'
import { useActions, useSelector } from 'states/app.context'
import { selectFilesData, selectResourceFilesData, selectRootFolder } from 'states/app.selectors'
import CreateAnimationAssetDialog from './CreateAnimationAssetDialog'
import CreateAudioAssetDialog from './CreateAudioAssetDialog'
import CreateImageAssetDialog from './CreateImageAssetDialog'
import AiLayoutDialog from './AiLayoutDialog'
import ResourceGridView from './ResourceGridView'
import { getDroppedPaths } from './resourceUtils'

const FILTER_HEIGHT = 40;
type CreateAssetDialogType = 'image' | 'audio' | 'animation' | null;
type CreateFileKind = 'component' | 'scene';
type DeleteItem = {
  name: string;
  path: string;
  isDirectory?: boolean;
};

function addCreateButtons(items: any[]): any[] {
  return items.map((item) => {
    const children = Array.isArray(item.children) ? addCreateButtons(item.children) : [];
    const kind: CreateFileKind | undefined = item.isDirectory && item.name === 'components'
      ? 'component'
      : item.isDirectory && item.name === 'scene' ? 'scene' : undefined;
    return kind ? {
      ...item,
      createKind: kind,
      children,
    } : { ...item, children };
  });
}

function filterResourceTreeData(items: any[], query: string): any[] {
  const filterText = query.trim().toLowerCase();
  if (!filterText) return items;

  return items.reduce((result, item) => {
    const searchableText = [item.name, item.path, item.type, item.extension]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const children = Array.isArray(item.children) ? filterResourceTreeData(item.children, filterText) : [];

    if (searchableText.includes(filterText)) {
      result.push(item);
    } else if (children.length) {
      result.push({ ...item, children });
    }

    return result;
  }, []);
}

export default function AssetsPanel({ tab, loadProject = false }: { tab: 'components' | 'res'; loadProject?: boolean }) {
  const { getFiles, loadComponent, toggleFolder } = useActions();
  const treeRef = useRef<TreeApi<any>>(null)
  const treeData = useSelector(selectFilesData);
  const resourceTreeData = useSelector(selectResourceFilesData);
  const rootFolder = useSelector(selectRootFolder);
  const [pendingRenamePath, setPendingRenamePath] = useState<string | null>(null);
  const selectedTab = tab;
  const [resourceViewMode, setResourceViewMode] = useState<'tree' | 'grid'>('tree');
  const [resourceFilter, setResourceFilter] = useState('');
  const [componentFilter, setComponentFilter] = useState('');
  const [createAssetDialog, setCreateAssetDialog] = useState<CreateAssetDialogType>(null);
  const [isTreeDropTarget, setIsTreeDropTarget] = useState(false);
  const [deleteConfirmItems, setDeleteConfirmItems] = useState<DeleteItem[] | null>(null);
  const [aiLayoutItem, setAiLayoutItem] = useState<any>(null);

  function resolveItemFullPath(data: any): string | null {
    if (!data || data.type === 'frame') return null;
    let fullPath = data.path;
    if (!fullPath) return null;
    if (selectedTab === 'res' && !pathUtils.isAbsolute(fullPath)) {
      const cleanPath = String(fullPath || '').replace(/^res\//, '');
      fullPath = pathUtils.join(rootFolder, 'res', cleanPath);
    }
    return fullPath;
  }

  function handleDeleteFromGrid(items: any[]) {
    if (!rootFolder || !items.length) return;
    const itemsToDelete: DeleteItem[] = [];
    for (const item of items) {
      const fullPath = resolveItemFullPath(item);
      if (fullPath) {
        itemsToDelete.push({
          name: item.name || pathUtils.basename(fullPath),
          path: fullPath,
          isDirectory: Boolean(item.isDirectory),
        });
      }
    }
    if (itemsToDelete.length > 0) {
      setDeleteConfirmItems(itemsToDelete);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (createAssetDialog || deleteConfirmItems) return;
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || target.tagName === 'SELECT')) {
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedTab === 'components' || resourceViewMode === 'tree') {
          const selectedNodes = treeRef.current?.selectedNodes || [];
          if (!selectedNodes.length) return;

          const itemsToDelete: DeleteItem[] = [];
          for (const node of selectedNodes) {
            const data = node.data;
            const fullPath = resolveItemFullPath(data);
            if (fullPath) {
              itemsToDelete.push({
                name: data.name || pathUtils.basename(fullPath),
                path: fullPath,
                isDirectory: Boolean(data.isDirectory),
              });
            }
          }

          if (itemsToDelete.length > 0) {
            event.preventDefault();
            event.stopPropagation();
            setDeleteConfirmItems(itemsToDelete);
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createAssetDialog, deleteConfirmItems, selectedTab, resourceViewMode, rootFolder]);
  const filteredResourceTreeData = useMemo(
    () => filterResourceTreeData(resourceTreeData, resourceFilter),
    [resourceTreeData, resourceFilter]
  );
  const filteredComponentTreeData = useMemo(
    () => filterResourceTreeData(treeData, componentFilter),
    [treeData, componentFilter]
  );
  const selectedTreeData = useMemo(
    () => selectedTab === 'res' ? filteredResourceTreeData : addCreateButtons(filteredComponentTreeData),
    [selectedTab, filteredResourceTreeData, filteredComponentTreeData]
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const treeHeight = Math.max(0, panelHeight - FILTER_HEIGHT);

  useEffect(() => {
    if (!loadProject) return;
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
  }, [loadProject])

  useEffect(() => {
    const refreshResources = (event: MessageEvent) => {
      if (event.data?.type === 'resourcesImported' && event.data.rootFolder === rootFolder) getFiles(rootFolder);
    };
    window.addEventListener('message', refreshResources);
    return () => window.removeEventListener('message', refreshResources);
  }, [getFiles, rootFolder]);

  useEffect(() => {
    const lastFile = getLastLoadedFile()
    if (selectedTab === 'components' && treeData.length && lastFile) {
      console.log('treeData Files', lastFile)
      const node = treeRef.current.get(lastFile)
      // console.log('getLastLoadedFile node', node)
      treeRef.current.select(node)
    }
  }, [selectedTab, treeData])

  useEffect(() => {
    if (!pendingRenamePath) return;
    const node = treeRef.current?.get(pendingRenamePath);
    if (!node) return;
    node.select();
    node.edit();
    setPendingRenamePath(null);
  }, [pendingRenamePath, treeData]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const updatePanelHeight = () => setPanelHeight(content.clientHeight);
    updatePanelHeight();
    const observer = new ResizeObserver(updatePanelHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  function onItemClick(node) {
    console.log('onItemClick', node);
    const { id: key, path, isDirectory, type } = node.data;
    if (selectedTab === 'res') {
      if (isDirectory) {
        node.toggle()
      }
      return
    }
    if (isDirectory) {
      if (type === 'resource') {
        node.toggle()
      } else {
        toggleFolder(key)
        node.toggle()
      }
    } else {
      loadComponent(path);
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

  function getDragItem(data: any) {
    if (data.isDirectory) return undefined;
    if (selectedTab === 'components') {
      return { kind: 'component', name: getComponentName(data.path) };
    }
    return { kind: 'asset', asset: data, name: data.name };
  }

  async function handleCreateAsset(type: string, data: any) {
    if (!rootFolder) {
      toast.error('No project is loaded')
      return false
    }

    const response: any = await sendRequest({
      key: CREATE_ASSET_REQUEST,
      rootFolder,
      assetType: type,
      data,
    })

    if (!response || response.error) {
      toast.error(response?.message || 'Unable to create asset')
      return false
    }

    toast.success('Asset created')
    getFiles(rootFolder)
    return true
  }

  async function renameResource({ node, name }: { node: any, name: string }) {
    const data = node.data;
    if (!rootFolder || data.isDirectory || data.type === 'frame') return;
    const response: any = await sendRequest({
      key: RENAME_RESOURCE_REQUEST,
      rootFolder,
      resourcePath: data.path,
      resourceKey: data.key,
      newName: name,
    });
    if (!response || response.error) {
      toast.error(response?.message || 'Unable to rename resource');
      return;
    }
    toast.success(response.oldKey === response.newKey ? 'Resource renamed' : `Resource renamed to ${response.newKey}`);
    getFiles(rootFolder);
  }

  async function importResources(directory: any, sourcePaths: string[]) {
    if (!rootFolder || !sourcePaths?.length) return;
    const response: any = await sendRequest({
      key: IMPORT_RESOURCES_REQUEST,
      rootFolder,
      resourcePath: typeof directory === 'string' ? directory : directory?.path || '',
      sourcePaths,
    });
    if (!response || response.error) {
      toast.error(response?.message || 'Unable to import resources');
      return;
    }
    toast.success(`Imported ${sourcePaths.length} resource${sourcePaths.length === 1 ? '' : 's'}`);
    getFiles(rootFolder);
  }

  async function createFile(data: any) {
    if (!rootFolder) return;
    const response: any = await sendRequest({
      key: CREATE_COMPONENT_FILE_REQUEST,
      rootFolder,
      directory: data.path,
      kind: data.createKind,
    });
    if (!response || response.error) {
      toast.error(response?.message || 'Unable to create file');
      return;
    }
    toast.success(`${data.createKind === 'component' ? 'Component' : 'Scene'} created`);
    setComponentFilter('');
    setPendingRenamePath(response.path);
    getFiles(rootFolder);
    loadComponent(response.path);
  }

  async function renameComponentFile({ node, name }: { node: any, name: string }) {
    if (!rootFolder) return;
    const response: any = await sendRequest({
      key: RE_NAME_COMPONENT,
      rootFolder,
      componentPath: node.data.path,
      newName: name,
    });
    if (!response || response.error) {
      toast.error(response?.message || 'Unable to rename component');
      return;
    }
    toast.success('Component renamed');
    getFiles(rootFolder);
    loadComponent(response.path);
  }

  async function confirmDelete() {
    if (!deleteConfirmItems || !deleteConfirmItems.length || !rootFolder) {
      setDeleteConfirmItems(null);
      return;
    }

    const paths = deleteConfirmItems.map((item) => item.path);
    const count = deleteConfirmItems.length;
    setDeleteConfirmItems(null);

    const response: any = await sendRequest({
      key: DELETE_COMPONENT,
      rootFolder,
      paths,
    });

    if (response && response.error) {
      toast.error(response?.message || 'Unable to delete items');
      return;
    }

    toast.success(`Deleted ${count} item${count === 1 ? '' : 's'}`);
    getFiles(rootFolder);
    if (selectedTab === 'res') {
      await sendRequest({ key: SYNC_RES_REQUEST, rootFolder });
      getFiles(rootFolder);
    }
  }

  return (
    <div className='flex h-full w-full min-w-0 flex-col bg-[#252525] text-[#dcdcdc]'>
      <div ref={contentRef} className='min-h-0 flex-1 overflow-hidden'>
        {selectedTab === 'components' && (
          <div className='flex h-10 items-center gap-2 border-b border-[#151515] bg-[#202020] px-2'>
            <Input
              value={componentFilter}
              onChange={(event) => setComponentFilter(event.target.value)}
              placeholder='Filter components'
              aria-label='Filter components'
            />
            <button
              type='button'
              className='flex h-7 w-7 items-center justify-center rounded-sm border border-[#111] bg-[#2a2a2a] text-[#dcdcdc] hover:bg-[#343434]'
              onClick={() => getFiles(rootFolder)}
              aria-label='Reload project'
              title='Reload project'
            >
              <FiRefreshCw size={15} />
            </button>
            {componentFilter && (
              <button
                type='button'
                className='flex h-7 w-7 items-center justify-center rounded-sm border border-[#111] bg-[#2a2a2a] text-[#dcdcdc] hover:bg-[#343434]'
                onClick={() => setComponentFilter('')}
                aria-label='Clear component filter'
                title='Clear component filter'
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        )}
        {selectedTab === 'res' && (
          <div className='flex h-10 items-center gap-2 border-b border-[#151515] bg-[#202020] px-2'>
            <Input
              value={resourceFilter}
              onChange={(event) => setResourceFilter(event.target.value)}
              placeholder='Filter resources'
              aria-label='Filter resources'
            />
            <div className='flex items-center rounded-sm border border-[#111] bg-[#2a2a2a] p-0.5'>
              <button
                type='button'
                className={clsx(
                  'flex h-6 w-6 items-center justify-center rounded-sm text-[13px] transition-colors',
                  resourceViewMode === 'tree' ? 'bg-[#3b82f6] text-white shadow-sm' : 'text-[#8f8f8f] hover:text-[#dcdcdc]'
                )}
                onClick={() => setResourceViewMode('tree')}
                aria-label='Tree view'
                title='Tree view'
              >
                <FiList size={14} />
              </button>
              <button
                type='button'
                className={clsx(
                  'flex h-6 w-6 items-center justify-center rounded-sm text-[13px] transition-colors',
                  resourceViewMode === 'grid' ? 'bg-[#3b82f6] text-white shadow-sm' : 'text-[#8f8f8f] hover:text-[#dcdcdc]'
                )}
                onClick={() => setResourceViewMode('grid')}
                aria-label='Grid view'
                title='Grid view'
              >
                <FiGrid size={14} />
              </button>
            </div>
            <button
              type='button'
              className='flex h-7 w-7 items-center justify-center rounded-sm border border-[#111] bg-[#2a2a2a] text-[#dcdcdc] hover:bg-[#343434]'
              onClick={async () => {
                if (!rootFolder) {
                  toast.error('No project is loaded')
                  return
                }
                await sendRequest({ key: SYNC_RES_REQUEST, rootFolder })
                getFiles(rootFolder)
              }}
              aria-label='Reload resources'
              title='Reload resources (sync-res)'
            >
              <FiRefreshCw size={15} />
            </button>
            {resourceFilter && (
              <button
                type='button'
                className='flex h-7 w-7 items-center justify-center rounded-sm border border-[#111] bg-[#2a2a2a] text-[#dcdcdc] hover:bg-[#343434]'
                onClick={() => setResourceFilter('')}
                aria-label='Clear resource filter'
                title='Clear resource filter'
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        )}
        {selectedTab === 'components' || resourceViewMode === 'tree' ? (
          <div
            className={clsx(
              'h-full w-full transition-colors',
              selectedTab === 'res' && isTreeDropTarget && 'bg-[#2b3a4a] ring-2 ring-inset ring-[#4a90e2]'
            )}
            onDragOver={(event) => {
              if (selectedTab !== 'res' || !event.dataTransfer.types.includes('Files')) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
            }}
            onDragEnter={(event) => {
              if (selectedTab !== 'res' || !event.dataTransfer.types.includes('Files')) return;
              event.preventDefault();
              setIsTreeDropTarget(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setIsTreeDropTarget(false);
              }
            }}
            onDrop={(event) => {
              if (selectedTab !== 'res') return;
              const sourcePaths = getDroppedPaths(event);
              if (!sourcePaths.length) return;
              event.preventDefault();
              setIsTreeDropTarget(false);
              importResources({ path: '' }, sourcePaths);
            }}
          >
            <Tree
              className='px-1 py-1'
              ref={treeRef}
              data={selectedTreeData}
              height={treeHeight}
              width="100%"
              onSelect={(nodes) => {
                if (nodes[0])
                  onItemClick(nodes[0])
              }}
              onRename={(node) => {
                if (selectedTab === 'res') return renameResource(node);
                return renameComponentFile(node);
              }}
              disableEdit={(data) => data.isDirectory || data.type === 'frame'}
              openByDefault
            >
              {(props) => <TreeNode
                {...props}
                dragItem={getDragItem(props.node.data)}
                getDragItems={(node) => {
                  const selectedNodes = node.isSelected ? node.tree.selectedNodes : [node];
                  return selectedNodes
                    .map((selectedNode) => getDragItem(selectedNode.data))
                    .filter(Boolean);
                }}
                onCreate={(data) => {
                  createFile(data);
                }}
                canRename
                onImport={selectedTab === 'res' ? importResources : undefined}
                onAiGenerate={selectedTab === 'components' ? setAiLayoutItem : undefined}
              />}
            </Tree>
          </div>
        ) : (
          <ResourceGridView
            data={filteredResourceTreeData}
            rootFolder={rootFolder}
            resourceFilter={resourceFilter}
            onClearFilter={() => setResourceFilter('')}
            onRename={renameResource}
            onImport={importResources}
            onDeleteRequest={handleDeleteFromGrid}
            getDragItem={getDragItem}
            height={treeHeight}
          />
        )}
      </div>
      <CreateImageAssetDialog
        isOpen={createAssetDialog === 'image'}
        setOpen={(value) => setCreateAssetDialog(value ? 'image' : null)}
        onCreate={(data) => handleCreateAsset('image', data)}
      />
      <CreateAudioAssetDialog
        isOpen={createAssetDialog === 'audio'}
        setOpen={(value) => setCreateAssetDialog(value ? 'audio' : null)}
        onCreate={(data) => handleCreateAsset('audio', data)}
      />
      <CreateAnimationAssetDialog
        isOpen={createAssetDialog === 'animation'}
        setOpen={(value) => setCreateAssetDialog(value ? 'animation' : null)}
        onCreate={(data) => handleCreateAsset('animation', data)}
      />
      {aiLayoutItem && <AiLayoutDialog
        isOpen={Boolean(aiLayoutItem)}
        onClose={() => setAiLayoutItem(null)}
        rootFolder={rootFolder}
        filePath={aiLayoutItem.path}
        fileName={getComponentName(aiLayoutItem.path)}
        onGenerated={() => {
          getFiles(rootFolder)
          loadComponent(aiLayoutItem.path)
        }}
      />}
      <Modal
        isOpen={Boolean(deleteConfirmItems && deleteConfirmItems.length > 0)}
        onClose={() => setDeleteConfirmItems(null)}
        title="Confirm Delete"
      >
        <div className='mt-4 flex w-[380px] flex-col gap-4 text-[12px]'>
          <p className='text-[#dcdcdc] leading-relaxed'>
            {deleteConfirmItems?.length === 1 ? (
              <>
                Are you sure you want to delete <span className='font-semibold text-white'>"{deleteConfirmItems[0].name}"</span>?
                {deleteConfirmItems[0].isDirectory && ' All contents inside this folder will also be deleted.'}
              </>
            ) : (
              <>
                Are you sure you want to delete <span className='font-semibold text-white'>{deleteConfirmItems?.length} selected items</span>?
              </>
            )}
          </p>
          {deleteConfirmItems && deleteConfirmItems.length > 1 && (
            <div className='max-h-36 overflow-y-auto rounded border border-[#1a1a1a] bg-[#1a1a1a] p-2 text-[11px] text-[#a0a0a0]'>
              <ul className='list-disc pl-4 space-y-1'>
                {deleteConfirmItems.map((item, index) => (
                  <li key={index} className='truncate text-[#d0d0d0]'>
                    {item.name} {item.isDirectory ? '(Folder)' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className='text-[11px] text-[#ff6b6b]'>This action cannot be undone.</p>
          <div className='mt-2 flex justify-end gap-2'>
            <button
              type='button'
              className='rounded-sm bg-[#3a3a3a] px-3 py-1.5 text-[#dcdcdc] hover:bg-[#4a4a4a] transition-colors'
              onClick={() => setDeleteConfirmItems(null)}
            >
              Cancel
            </button>
            <button
              type='button'
              className='rounded-sm bg-[#dc2626] px-3 py-1.5 font-medium text-white hover:bg-[#ef4444] transition-colors'
              onClick={confirmDelete}
              autoFocus
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
