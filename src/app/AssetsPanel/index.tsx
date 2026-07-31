import { TreeNode } from 'app/AssetsPanel/TreeNode'
import { sendRequest } from 'app/app.ipc'
import Input from 'base/Input'
import Modal from 'base/Modal'
import clsx from 'clsx'
import { getLastLoadedFile, getLastRootFolder } from 'data/AppData'
import { ipcMain } from 'helper/electronRemote'
import { toFileUrl } from 'helper/fileUrl'
import pathUtils from 'path-browserify'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Tree, TreeApi } from 'react-arborist'
import toast from 'react-hot-toast'
import { FiRefreshCw, FiX } from 'react-icons/fi'
import { CREATE_ASSET_REQUEST, CREATE_COMPONENT_FILE_REQUEST, GET_FOLDER_FILES, SYNC_RES_REQUEST } from 'shared/constant.message'
import { useActions, useSelector } from 'states/app.context'
import { selectFilesData, selectPreviewAsset, selectResourceFilesData, selectRootFolder } from 'states/app.selectors'
import { AssetTypeBlock } from '../../components/common'
import AssetPreview from './AssetPreview'
import CreateAnimationAssetDialog from './CreateAnimationAssetDialog'
import CreateAudioAssetDialog from './CreateAudioAssetDialog'
import CreateImageAssetDialog from './CreateImageAssetDialog'

const textureExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']);
const PANEL_HEADER_HEIGHT = 32;
const FILTER_HEIGHT = 40;
const ASSET_PREVIEW_HEIGHT = 320;
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

function resourceFileUrl(path = '', rootFolder = getLastRootFolder()) {
  if (!path) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  if (path.startsWith('/')) return toFileUrl(path);
  const normalized = path.replace(/\\/g, '/').replace(/^res\//, '');
  return toFileUrl(rootFolder ? `${rootFolder}/res/${normalized}` : normalized);
}

function spriteSheetTexturePath(data: any) {
  if (data.texture) return data.texture;
  const image = data.json?.meta?.image;
  if (image) return pathUtils.join(pathUtils.dirname(data.path), image).replace(/\\/g, '/');
  return data.path?.replace(/\.(json|plist)$/i, '.png');
}

function isTexture(data: any) {
  const extension = data.extension || data.name?.match(/\.[^.]+$/)?.[0];
  return !data.isDirectory && textureExtensions.has(extension?.toLowerCase());
}

function getPreviewAsset(data: any, rootFolder: string) {
  if (data.type === 'spriteFrame') {
    return {
      ...data,
      value: resourceFileUrl(data.value || data.path, rootFolder),
    };
  }
  if (data.type === 'frame') {
    return {
      ...data,
      texture: resourceFileUrl(spriteSheetTexturePath(data), rootFolder),
    };
  }
  if (data.type === 'spine' || data.type === 'dragonBones') {
    return {
      ...data,
      value: data.value,
    };
  }
  if (!isTexture(data)) return null;
  return {
    key: data.path,
    name: data.name,
    type: 'texture',
    value: resourceFileUrl(data.value || data.path, rootFolder),
  };
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
  const { getFiles, loadComponent, setPreviewAsset, toggleFolder } = useActions();
  const treeRef = useRef<TreeApi<any>>(null)
  const treeData = useSelector(selectFilesData);
  const resourceTreeData = useSelector(selectResourceFilesData);
  const rootFolder = useSelector(selectRootFolder);
  const [createFileKind, setCreateFileKind] = useState<CreateFileKind | null>(null);
  const [createDirectory, setCreateDirectory] = useState('');
  const [createClassName, setCreateClassName] = useState('');
  const [selectedTab, setSelectedTab] = useState('components');
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
  const previewAsset = useSelector(selectPreviewAsset);
  const showPreview = selectedTab === 'res' && Boolean(previewAsset?.type);
  const [panelHeight, setPanelHeight] = useState(() => Math.max(0, window.innerHeight - PANEL_HEADER_HEIGHT));
  const treeHeight = Math.max(
    0,
    panelHeight - FILTER_HEIGHT - (showPreview ? ASSET_PREVIEW_HEIGHT : 0)
  );

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
      } else {
        setPreviewAsset(getPreviewAsset(node.data, rootFolder))
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
        <Tree
          className='px-1 py-1'
          ref={treeRef}
          data={selectedTreeData}
          height={treeHeight}
          width="100%"
          onSelect={(nodes) => {
            // console.log('nodes', nodes);
            if (nodes[0])
              onItemClick(nodes[0])
          }}
          onRename={(node) => {
            console.log('onRename', node);
          }}
          openByDefault
        >
          {(props) => <TreeNode
            {...props}
            dragItem={getDragItem(props.node.data)}
            onCreate={(data) => {
              setCreateFileKind(data.createKind);
              setCreateDirectory(data.path);
              setCreateClassName('');
            }}
          />}
        </Tree>
        {selectedTab === 'res' && <AssetPreview />}
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
