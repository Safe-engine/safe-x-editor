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
import { CREATE_ASSET_REQUEST, CREATE_COMPONENT_FILE_REQUEST, GET_FOLDER_FILES, IMPORT_RESOURCES_REQUEST, RENAME_RESOURCE_REQUEST, SYNC_RES_REQUEST } from 'shared/constant.message'
import { useActions, useSelector } from 'states/app.context'
import { selectFilesData, selectResourceFilesData, selectRootFolder } from 'states/app.selectors'
import { AssetTypeBlock } from '../../components/common'
import CreateAnimationAssetDialog from './CreateAnimationAssetDialog'
import CreateAudioAssetDialog from './CreateAudioAssetDialog'
import CreateImageAssetDialog from './CreateImageAssetDialog'
import ResourceGridView from './ResourceGridView'

const PANEL_HEADER_HEIGHT = 32;
const FILTER_HEIGHT = 40;
type CreateAssetDialogType = 'image' | 'audio' | 'animation' | null;
type CreateFileKind = 'component' | 'scene';

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

export default function AssetsPanel() {
  const { getFiles, loadComponent, toggleFolder } = useActions();
  const treeRef = useRef<TreeApi<any>>(null)
  const treeData = useSelector(selectFilesData);
  const resourceTreeData = useSelector(selectResourceFilesData);
  const rootFolder = useSelector(selectRootFolder);
  const [createFileKind, setCreateFileKind] = useState<CreateFileKind | null>(null);
  const [createDirectory, setCreateDirectory] = useState('');
  const [createClassName, setCreateClassName] = useState('');
  const [selectedTab, setSelectedTab] = useState('components');
  const [resourceViewMode, setResourceViewMode] = useState<'tree' | 'grid'>('tree');
  const [resourceFilter, setResourceFilter] = useState('');
  const [componentFilter, setComponentFilter] = useState('');
  const [createAssetDialog, setCreateAssetDialog] = useState<CreateAssetDialogType>(null);
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
  const [panelHeight, setPanelHeight] = useState(() => Math.max(0, window.innerHeight - PANEL_HEADER_HEIGHT));
  const treeHeight = Math.max(0, panelHeight - FILTER_HEIGHT);

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    const refreshResources = (event: MessageEvent) => {
      if (event.data?.type === 'resourcesImported' && event.data.rootFolder === rootFolder) getFiles(rootFolder);
    };
    window.addEventListener('message', refreshResources);
    return () => window.removeEventListener('message', refreshResources);
  }, [getFiles, rootFolder]);

  useEffect(() => {
    const lastFile = getLastLoadedFile()
    if (treeData.length && lastFile) {
      console.log('treeData Files', lastFile)
      const node = treeRef.current.get(lastFile)
      // console.log('getLastLoadedFile node', node)
      treeRef.current.select(node)
    }
  }, [treeData])

  useEffect(() => {
    function updatePanelHeight() {
      setPanelHeight(Math.max(0, window.innerHeight - PANEL_HEADER_HEIGHT));
    }
    window.addEventListener('resize', updatePanelHeight);
    return () => window.removeEventListener('resize', updatePanelHeight);
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

  function changeSelected(tab) {
    return function () {
      setSelectedTab(tab)
    }
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
    if (!rootFolder) return;
    const response: any = await sendRequest({
      key: IMPORT_RESOURCES_REQUEST,
      rootFolder,
      resourcePath: directory.path,
      sourcePaths,
    });
    if (!response || response.error) {
      toast.error(response?.message || 'Unable to import resources');
      return;
    }
    toast.success(`Imported ${sourcePaths.length} resource${sourcePaths.length === 1 ? '' : 's'}`);
    getFiles(rootFolder);
  }

  async function createFile() {
    if (!rootFolder || !createFileKind || !createClassName.trim()) return;
    const response: any = await sendRequest({
      key: CREATE_COMPONENT_FILE_REQUEST,
      rootFolder,
      directory: createDirectory,
      name: createClassName.trim(),
      kind: createFileKind,
    });
    if (!response || response.error) {
      toast.error(response?.message || 'Unable to create file');
      return;
    }
    toast.success(`${createFileKind === 'component' ? 'Component' : 'Scene'} created`);
    setCreateFileKind(null);
    getFiles(rootFolder);
    loadComponent(response.path);
  }

  return (
    <div className='h-screen w-full min-w-0 bg-[#252525] text-[#dcdcdc]'>
      <div className='flex h-8 border-b border-[#151515] bg-[#202020]'>
        <AssetTypeBlock onClick={changeSelected('components')}
          className={clsx({ 'bg-[#303846] text-[#f0f0f0] border-b-[#4a90e2]': selectedTab === 'components' })}
        >Components</AssetTypeBlock>
        <AssetTypeBlock onClick={changeSelected('res')}
          className={clsx({ 'bg-[#303846] text-[#f0f0f0] border-b-[#4a90e2]': selectedTab === 'res' })}
        >Resources</AssetTypeBlock>
      </div>
      <div className='h-[calc(100vh-2rem)] overflow-hidden'>
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
            }}
            disableEdit={(data) => selectedTab !== 'res' || data.isDirectory || data.type === 'frame'}
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
                setCreateFileKind(data.createKind);
                setCreateDirectory(data.path);
                setCreateClassName('');
              }}
              canRename={selectedTab === 'res'}
              onImport={selectedTab === 'res' ? importResources : undefined}
            />}
          </Tree>
        ) : (
          <ResourceGridView
            data={filteredResourceTreeData}
            rootFolder={rootFolder}
            resourceFilter={resourceFilter}
            onClearFilter={() => setResourceFilter('')}
            onRename={renameResource}
            onImport={importResources}
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
      <Modal isOpen={Boolean(createFileKind)} onClose={() => setCreateFileKind(null)} title={`New ${createFileKind === 'scene' ? 'Scene' : 'Component'}`}>
        <div className='mt-4 flex w-[360px] flex-col gap-3 text-[12px]'>
          <label className='flex flex-col gap-1'>
            <span className='text-[#bdbdbd]'>Class name</span>
            <Input
              value={createClassName}
              onChange={(event) => setCreateClassName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') createFile();
              }}
              placeholder={createFileKind === 'scene' ? 'GameScene' : 'PlayerComponent'}
              autoFocus
            />
          </label>
          <div className='mt-2 flex justify-end gap-2'>
            <button type='button' className='rounded-sm bg-[#3a3a3a] px-3 py-1.5 hover:bg-[#4a4a4a]' onClick={() => setCreateFileKind(null)}>Cancel</button>
            <button type='button' className='rounded-sm bg-[#3b82f6] px-3 py-1.5 text-white disabled:opacity-50' onClick={createFile} disabled={!createClassName.trim()}>Create</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
