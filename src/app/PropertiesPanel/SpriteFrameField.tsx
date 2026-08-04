import { Combobox } from '@headlessui/react';
import { sendRequest } from 'app/app.ipc';
import Button from 'base/Button';
import Modal from 'base/Modal';
import { dialog, getCurrentWindow } from 'helper/electronRemote';
import { toFileUrl } from 'helper/fileUrl';
import { parseStringFromValue } from 'helper/node';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiCheck, FiChevronDown, FiSave, FiUpload } from 'react-icons/fi';
import { LuSparkle } from 'react-icons/lu';
import { REPLACE_SPRITE_IMAGE_FILE_REQUEST, RESIZE_SPRITE_IMAGE_REQUEST } from 'shared/constant.message';
import SpriteFrameAiDialog from './SpriteFrameAiDialog';

function texturePreviewUrl(texture, rootFolder) {
  const path = texture.value || texture.path;
  if (!path) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  const normalized = String(path).replace(/\\/g, '/').replace(/^res\//, '');
  const fullPath = normalized.startsWith('/') ? normalized : `${rootFolder}/res/${normalized}`;
  return toFileUrl(fullPath);
}

function textureLabel(texture) {
  return texture.key.replace(/^sf_/, '');
}

export default function SpriteFrameField({ value, textures, rootFolder, onChange, onImageReplaced, resizeTo, onTextureResized }) {
  const selectedKey = parseStringFromValue(value) ?? '';
  const selectedTexture = textures.find((texture) => texture.key === selectedKey);
  const [filter, setFilter] = useState('');
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [isResizeDialogOpen, setIsResizeDialogOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const filteredTextures = textures.filter((texture) => textureLabel(texture).toLowerCase().includes(filter.toLowerCase()));
  const width = Math.round(resizeTo?.width);
  const height = Math.round(resizeTo?.height);
  const canResize = selectedTexture && Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0;

  async function resizeTexture() {
    if (!selectedTexture || !canResize || isResizing) return;
    setIsResizing(true);
    try {
      const response: any = await sendRequest({
        key: RESIZE_SPRITE_IMAGE_REQUEST,
        rootFolder,
        targetPath: selectedTexture.value || selectedTexture.path,
        width,
        height,
      });
      if (!response?.success) {
        toast.error(response?.message || 'Unable to resize texture');
        return;
      }
      toast.success('Texture resized');
      onTextureResized?.();
      onImageReplaced();
      setIsResizeDialogOpen(false);
    } catch {
      toast.error('Unable to resize texture');
    } finally {
      setIsResizing(false);
    }
  }

  async function replaceTextureFromFile() {
    if (!selectedTexture || isReplacing) return;
    const [sourcePath] = dialog.showOpenDialogSync(getCurrentWindow(), {
      title: 'Choose replacement image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
    }) || [];
    if (!sourcePath) return;

    setIsReplacing(true);
    try {
      const response: any = await sendRequest({
        key: REPLACE_SPRITE_IMAGE_FILE_REQUEST,
        rootFolder,
        targetPath: selectedTexture.value || selectedTexture.path,
        sourcePath,
      });
      if (!response?.success) {
        toast.error(response?.message || 'Unable to replace texture');
        return;
      }
      toast.success('Texture replaced');
      onImageReplaced();
    } catch {
      toast.error('Unable to replace texture');
    } finally {
      setIsReplacing(false);
    }
  }

  return (
    <label className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-center gap-2 px-2 py-0.5'>
      <div className='truncate text-[11px] text-[#c8c8c8]'>spriteFrame</div>
      <div className='flex min-w-0 gap-1'>
        <Combobox value={selectedKey} onChange={(key) => {
          setFilter('');
          onChange(key || undefined);
        }}>
          <div className='relative min-w-0 flex-1'>
            {selectedTexture && <img className='pointer-events-none absolute left-2 top-1.5 z-10 h-4 w-4 rounded-sm object-cover' src={texturePreviewUrl(selectedTexture, rootFolder)} alt='' />}
            <Combobox.Input
              className={`h-7 w-full rounded-sm border border-[#111] bg-[#151515] py-1 pr-8 text-[12px] text-[#e2e2e2] outline-none focus:border-[#4a90e2] ${selectedTexture ? 'pl-7' : 'pl-2'}`}
              displayValue={(key) => {
                const texture = textures.find((item) => item.key === key);
                return texture ? textureLabel(texture) : '';
              }}
              onChange={(event) => setFilter(event.target.value)}
              placeholder='None'
            />
            <Combobox.Button className='absolute inset-y-0 right-0 flex items-center px-2 text-[#8f8f8f]'>
              <FiChevronDown size={14} />
            </Combobox.Button>
            <Combobox.Options className='absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-[#111] bg-[#252525] py-1 text-[12px] shadow-lg focus:outline-none'>
            {/* <Combobox.Option value=''>
              {({ active, selected }) => (
                <div className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 ${active ? 'bg-[#304766] text-white' : 'text-[#dcdcdc]'}`}>
                  <span className='h-4 w-4' />
                  <span className='min-w-0 flex-1 truncate'>None</span>
                  {selected && <FiCheck size={14} />}
                </div>
              )}
            </Combobox.Option> */}
            {filteredTextures.map((texture) => (
              <Combobox.Option key={texture.key} value={texture.key}>
                {({ active, selected }) => (
                  <div className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 ${active ? 'bg-[#304766] text-white' : 'text-[#dcdcdc]'}`}>
                    <img className='h-4 w-4 rounded-sm object-cover' src={texturePreviewUrl(texture, rootFolder)} alt='' />
                    <span className='min-w-0 flex-1 truncate'>{textureLabel(texture)}</span>
                    {selected && <FiCheck className='shrink-0' size={14} />}
                  </div>
                )}
              </Combobox.Option>
            ))}
            </Combobox.Options>
          </div>
        </Combobox>
        {resizeTo && (
          <button
            className='flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[#111] bg-[#2a2a2a] text-[#bdbdbd] hover:bg-[#343434] hover:text-white disabled:cursor-not-allowed disabled:opacity-40'
            type='button'
            disabled={!selectedTexture || isReplacing}
            onClick={() => void replaceTextureFromFile()}
            title={selectedTexture ? 'Replace texture from image file' : 'Choose a sprite frame first'}
          >
            <FiUpload size={14} />
          </button>
        )}
        <button
          className='flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[#111] bg-[#2a2a2a] text-[#bdbdbd] hover:bg-[#343434] hover:text-white disabled:cursor-not-allowed disabled:opacity-40'
          type='button'
          disabled={!selectedTexture}
          onClick={() => setIsAiDialogOpen(true)}
          title={selectedTexture ? 'Edit image with AI' : 'Choose a sprite frame first'}
        >
          <LuSparkle size={14} />
        </button>
        {resizeTo && (
          <button
            className='flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[#111] bg-[#2a2a2a] text-[#bdbdbd] hover:bg-[#343434] hover:text-white disabled:cursor-not-allowed disabled:opacity-40'
            type='button'
            disabled={!canResize}
            onClick={() => setIsResizeDialogOpen(true)}
            title={canResize ? `Resize texture to ${width} × ${height}` : 'Set a positive node size first'}
          >
            <FiSave size={14} />
          </button>
        )}
      </div>
      {selectedTexture && (
        <SpriteFrameAiDialog
          isOpen={isAiDialogOpen}
          onClose={() => setIsAiDialogOpen(false)}
          rootFolder={rootFolder}
          targetPath={selectedTexture.value || selectedTexture.path}
          targetKey={selectedTexture.key}
          targetLabel={textureLabel(selectedTexture)}
          onReplaced={onImageReplaced}
        />
      )}
      <Modal isOpen={isResizeDialogOpen} onClose={() => !isResizing && setIsResizeDialogOpen(false)} title='Resize Texture'>
        <div className='mt-4 w-[360px] text-[12px] text-[#c8c8c8]'>
          <p>This will overwrite <span className='text-[#f0f0f0]'>{textureLabel(selectedTexture || { key: '' })}</span> at {width} × {height} pixels.</p>
          <p className='mt-2 text-[#8f8f8f]'>All nodes using this texture will use the new size. This cannot be undone.</p>
          <div className='mt-4 flex justify-end gap-2'>
            <Button className='w-auto bg-[#333] hover:bg-[#3d3d3d]' type='button' disabled={isResizing} onClick={() => setIsResizeDialogOpen(false)}>Cancel</Button>
            <Button className='w-auto' type='button' disabled={isResizing} onClick={() => void resizeTexture()}>{isResizing ? 'Resizing…' : 'Resize'}</Button>
          </div>
        </div>
      </Modal>
    </label>
  );
}
