import { TreeNode } from 'app/AssetsPanel/TreeNode'
import { sendRequest } from 'app/app.ipc'
import Input from 'base/Input'
import clsx from 'clsx'
import { getLastLoadedFile, getLastRootFolder, setLastLoadedFile } from 'data/AppData'
import { ipcMain } from 'helper/electronRemote'
import { toFileUrl } from 'helper/fileUrl'
import pathUtils from 'path-browserify'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Tree, TreeApi } from 'react-arborist'
import toast from 'react-hot-toast'
import { FiRefreshCw, FiX } from 'react-icons/fi'
import { ADD_NEW_STATE, CREATE_ACTION, CREATE_ASSET_REQUEST, DELETE_COMPONENT, GET_FOLDER_FILES, NEW_COMPONENT, RE_NAME_COMPONENT, SYNC_RES_REQUEST } from 'shared/constant.message'
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
  const [isOpen, setOpen] = useState(false);
  const [openConfirmDeleteComponent, setOpenConfirmDeleteComponent] = useState(false);
  const [openRenameComponent, setOpenRenameComponent] = useState(false);
  const [createPath, setCreatePath] = useState('');
  const treeData = useSelector(selectFilesData);
  const resourceTreeData = useSelector(selectResourceFilesData);
  const rootFolder = useSelector(selectRootFolder);
  const [openCreateComponent, setOpenCreateComponent] = useState(false);
  const [isOpenNewState, setOpenNewState] = useState(false);
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
  const selectedTreeData = selectedTab === 'res' ? filteredResourceTreeData : filteredComponentTreeData;
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
    if (treeData[1] && lastFile) {
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
      setLastLoadedFile(path)
      loadComponent(path);
    }
  }

  function treeViewItemContextMenu(e) {
    setCreatePath(e.itemData.path);
  }

  function contextMenuItemClick(e) {
    // console.log(e.itemData)
    switch (e.itemData.text) {
      case CREATE_ACTION:
        setOpen(true);
        break;
      case NEW_COMPONENT:
        setOpenCreateComponent(true);
        break;
      case DELETE_COMPONENT:
        setOpenConfirmDeleteComponent(true);
        break;
      case RE_NAME_COMPONENT:
        setOpenRenameComponent(true);
        break;
      case ADD_NEW_STATE:
        setOpenNewState(true);
        break;
      default:
        // dispatch(executeFileCommandAction(type, path, rootFolder));
        break;
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
          {TreeNode}
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
    </div>
  )
}
