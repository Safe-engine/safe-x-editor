import Button from 'base/Button';
import Modal from 'base/Modal';
import { dialog, getCurrentWindow } from 'helper/electronRemote';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { sendRequest } from 'app/app.ipc';
import { FiClipboard, FiUpload } from 'react-icons/fi';
import { CREATE_SPRITE_IMAGE_ASSET_CLIPBOARD_REQUEST, CREATE_SPRITE_IMAGE_ASSET_FILE_REQUEST, CREATE_SPRITE_IMAGE_ASSET_REQUEST, GENERATE_SPRITE_IMAGES_REQUEST, REPLACE_SPRITE_IMAGE_CLIPBOARD_REQUEST, REPLACE_SPRITE_IMAGE_FILE_REQUEST, REPLACE_SPRITE_IMAGE_REQUEST } from 'shared/constant.message';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  rootFolder: string;
  targetPath: string;
  targetKey: string;
  onReplaced: (key?: string) => void;
};

export default function SpriteFrameAiDialog({ isOpen, onClose, rootFolder, targetPath, targetKey, onReplaced }: Props) {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<any[]>([]);
  const [jobId, setJobId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [mode, setMode] = useState<'replace' | 'new'>('replace');

  async function generate() {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const response: any = await sendRequest({
        key: GENERATE_SPRITE_IMAGES_REQUEST,
        rootFolder,
        prompt: prompt.trim(),
        targetPath: mode === 'replace' ? targetPath : undefined,
      });
      if (!response?.success) {
        toast.error(response?.message || 'Unable to generate images');
        return;
      }
      setImages(response.images || []);
      setJobId(response.jobId);
    } catch {
      toast.error('Unable to generate images');
    } finally {
      setIsGenerating(false);
    }
  }

  async function replaceTexture(sourcePath?: string) {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const response: any = await sendRequest(sourcePath
        ? mode === 'replace'
          ? { key: REPLACE_SPRITE_IMAGE_FILE_REQUEST, rootFolder, targetPath, sourcePath }
          : { key: CREATE_SPRITE_IMAGE_ASSET_FILE_REQUEST, rootFolder, targetPath, targetKey, sourcePath }
        : mode === 'replace'
          ? { key: REPLACE_SPRITE_IMAGE_CLIPBOARD_REQUEST, rootFolder, targetPath, targetKey }
          : { key: CREATE_SPRITE_IMAGE_ASSET_CLIPBOARD_REQUEST, rootFolder, targetPath, targetKey });
      if (!response?.success) {
        toast.error(response?.message || 'Unable to replace texture');
        return;
      }
      toast.success(mode === 'replace' ? 'Texture replaced' : 'New sprite asset created');
      onReplaced(response.key);
      if (mode === 'new') onClose();
    } catch {
      toast.error('Unable to replace texture');
    } finally {
      setIsImporting(false);
    }
  }

  function uploadTexture() {
    const [sourcePath] = dialog.showOpenDialogSync(getCurrentWindow(), {
      title: 'Choose replacement image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
    }) || [];
    if (sourcePath) void replaceTexture(sourcePath);
  }

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const clipboard = (globalThis as any).require?.('electron')?.clipboard;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v' && !clipboard?.readImage?.().isEmpty()) {
        event.preventDefault();
        void replaceTexture();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isImporting, mode, rootFolder, targetPath, targetKey]);

  async function selectImage(index: number) {
    if (!jobId || isReplacing) return;
    setIsReplacing(true);
    const response: any = await sendRequest(mode === 'replace'
      ? { key: REPLACE_SPRITE_IMAGE_REQUEST, rootFolder, targetPath, targetKey, jobId, imageIndex: index }
      : { key: CREATE_SPRITE_IMAGE_ASSET_REQUEST, rootFolder, targetPath, targetKey, jobId, imageIndex: index });
    setIsReplacing(false);
    if (!response?.success) {
      toast.error(response?.message || 'Unable to replace image');
      return;
    }
    toast.success(mode === 'replace' ? 'Sprite image replaced' : 'New sprite asset created');
    onReplaced(response.key);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={() => !isImporting && onClose()} title='Change Sprite Frame'>
      <div className='relative mt-4 w-[620px] text-[12px]'>
        {isImporting && (
          <div className='absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-sm bg-[#151515]/90 text-[#c8c8c8]'>
            <span className='h-4 w-4 animate-spin rounded-full border-2 border-[#4a90e2] border-t-transparent' aria-hidden='true' />
            <span>Replacing texture…</span>
          </div>
        )}
        <div className='mb-3 flex justify-end gap-2'>
          <Button className='w-auto' type='button' disabled={isImporting} onClick={uploadTexture}><FiUpload className='mr-1' />Upload</Button>
          <Button className='w-auto' type='button' disabled={isImporting} onClick={() => void replaceTexture()} title='Paste image from clipboard (Ctrl/Cmd + V)'><FiClipboard className='mr-1' />Paste</Button>
        </div>
        <div className='grid grid-cols-4 gap-3'>
          {isGenerating && (
            <div className='col-span-4 flex aspect-[4/1] items-center justify-center gap-2 rounded-sm border border-[#111] bg-[#151515] text-[#c8c8c8]'>
              <span className='h-4 w-4 animate-spin rounded-full border-2 border-[#4a90e2] border-t-transparent' aria-hidden='true' />
              <span>Generating images…</span>
            </div>
          )}
          {images.map((image, index) => (
            <button
              key={index}
              className='flex aspect-square items-center justify-center overflow-hidden rounded-sm border border-[#111] bg-[#151515] text-[#777] hover:border-[#4a90e2] disabled:cursor-wait'
              type='button'
              disabled={isReplacing}
              onClick={() => selectImage(index)}
              title='Use this image'
            >
              <img className='h-full w-full object-contain' src={image.url} alt={`Generated variant ${index + 1}`} />
            </button>
          ))}
        </div>
        <form className='mt-4 flex gap-2' onSubmit={(event) => { event.preventDefault(); void generate(); }}>
          <textarea
            className='h-[66px] flex-1 resize-none rounded-sm border border-[#111] bg-[#151515] px-2 py-1.5 text-[12px] text-[#e2e2e2] placeholder-[#777] shadow-inner outline-none focus:border-[#4a90e2]'
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={isGenerating}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void generate();
              }
            }}
            placeholder='Describe the image you want to generate'
            rows={3}
            autoFocus
          />
          <div className='flex shrink-0 flex-col gap-2'>
            <div className='flex h-6 items-center gap-3 text-[11px] text-[#c8c8c8]'>
              <label className='flex items-center gap-1'><input type='radio' checked={mode === 'replace'} onChange={() => setMode('replace')} disabled={isGenerating} /> Replace</label>
              <label className='flex items-center gap-1'><input type='radio' checked={mode === 'new'} onChange={() => setMode('new')} disabled={isGenerating} /> New</label>
            </div>
            <Button className='w-auto shrink-0' type='submit' disabled={!prompt.trim() || isGenerating || isReplacing}>
              {isGenerating && <span className='mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]' aria-hidden='true' />}
              {isGenerating ? 'Generating' : 'Generate'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
