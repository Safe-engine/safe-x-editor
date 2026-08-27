import { sendRequest } from 'app/app.ipc';
import Button from 'base/Button';
import Modal from 'base/Modal';
import { dialog, getCurrentWindow } from 'helper/electronRemote';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiClipboard, FiUpload, FiX } from 'react-icons/fi';
import { GENERATE_LAYOUT_WITH_AI_REQUEST } from 'shared/constant.message';
import { getDroppedPaths } from './resourceUtils';

const DEFAULT_PROMPT = 'Rearrange this screen into a clear, visually balanced, and user-friendly layout. Preserve the existing content and make spacing, hierarchy, alignment, and grouping feel intentional.';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  rootFolder: string;
  filePath: string;
  fileName: string;
  onGenerated: () => void;
};

export default function AiLayoutDialog({ isOpen, onClose, rootFolder, filePath, fileName, onGenerated }: Props) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [referenceImagePath, setReferenceImagePath] = useState('');
  const [useClipboardReference, setUseClipboardReference] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReferenceDropTarget, setIsReferenceDropTarget] = useState(false);

  useEffect(() => {
    if (isOpen) setPrompt(DEFAULT_PROMPT);
  }, [isOpen]);

  function chooseReferenceImage() {
    const [sourcePath] = dialog.showOpenDialogSync(getCurrentWindow(), {
      title: 'Choose reference image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
    }) || [];
    if (sourcePath) setReferenceImage(sourcePath);
  }

  function useClipboardImage() {
    const clipboard = (globalThis as any).require?.('electron')?.clipboard;
    if (clipboard?.readImage?.().isEmpty()) {
      toast.error('The clipboard does not contain an image');
      return;
    }
    setReferenceImagePath('');
    setUseClipboardReference(true);
  }

  function setReferenceImage(sourcePath: string) {
    if (!/\.(png|jpe?g|webp|svg)$/i.test(sourcePath)) {
      toast.error('Drop a PNG, JPG, WebP, or SVG image');
      return;
    }
    setReferenceImagePath(sourcePath);
    setUseClipboardReference(false);
  }

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const clipboard = (globalThis as any).require?.('electron')?.clipboard;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v' && !clipboard?.readImage?.().isEmpty()) {
        event.preventDefault();
        useClipboardImage();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  async function generate() {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const response: any = await sendRequest({
        key: GENERATE_LAYOUT_WITH_AI_REQUEST,
        rootFolder,
        filePath,
        prompt: prompt.trim(),
        referenceImagePath: referenceImagePath || undefined,
        useClipboardReference,
      });
      if (!response?.success) {
        toast.error(response?.message || 'Unable to generate layout');
        return;
      }
      toast.success('Layout generated');
      onGenerated();
      onClose();
    } catch {
      toast.error('Unable to generate layout');
    } finally {
      setIsGenerating(false);
    }
  }

  const referenceLabel = useClipboardReference ? 'Image from clipboard' : referenceImagePath;

  return (
    <Modal isOpen={isOpen} onClose={() => !isGenerating && onClose()} title={`AI Generate: ${fileName}`}>
      <form className='mt-4 w-[560px] text-[12px]' onSubmit={(event) => { event.preventDefault(); void generate(); }}>
        <label className='block text-[#c8c8c8]'>Prompt</label>
        <textarea
          className='mt-1 h-28 w-full resize-y rounded-sm border border-[#111] bg-[#151515] px-2 py-1.5 text-[12px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]'
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={isGenerating}
          autoFocus
        />
        <div className='mt-4 flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <span className='text-[#c8c8c8]'>Reference image</span>
            <Button className='w-auto' type='button' disabled={isGenerating} onClick={chooseReferenceImage}><FiUpload className='mr-1' />Upload</Button>
            <Button className='w-auto' type='button' disabled={isGenerating} onClick={useClipboardImage} title='Paste image from clipboard (Ctrl/Cmd + V)'><FiClipboard className='mr-1' />Paste</Button>
            {referenceLabel && <span className='min-w-0 flex-1 truncate text-[#8f8f8f]' title={referenceLabel}>{referenceLabel}</span>}
            {referenceLabel && <button className='text-[#8f8f8f] hover:text-[#f0f0f0]' type='button' onClick={() => { setReferenceImagePath(''); setUseClipboardReference(false); }} aria-label='Clear reference image'><FiX size={15} /></button>}
          </div>
          <div
            className={`flex h-16 items-center justify-center rounded-sm border border-dashed text-[#8f8f8f] transition-colors ${isReferenceDropTarget ? 'border-[#4a90e2] bg-[#304766]/40 text-[#dcdcdc]' : 'border-[#444] bg-[#1d1d1d]'}`}
            onDragOver={(event) => {
              if (isGenerating || !event.dataTransfer.types.includes('Files')) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
            }}
            onDragEnter={(event) => {
              if (isGenerating || !event.dataTransfer.types.includes('Files')) return;
              event.preventDefault();
              setIsReferenceDropTarget(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsReferenceDropTarget(false);
            }}
            onDrop={(event) => {
              if (!event.dataTransfer.types.includes('Files')) return;
              event.preventDefault();
              setIsReferenceDropTarget(false);
              if (isGenerating) return;
              const [sourcePath] = getDroppedPaths(event);
              if (!sourcePath) return;
              setReferenceImage(sourcePath);
            }}
          >
            Drag and drop a reference image here
          </div>
        </div>
        <p className='mt-2 text-[#8f8f8f]'>The AI will update only this file. A reference image is optional.</p>
        <div className='mt-4 flex justify-end gap-2'>
          <Button className='w-auto' type='button' disabled={isGenerating} onClick={onClose}>Cancel</Button>
          <Button className='w-auto bg-[#304766] hover:bg-[#3a577d]' type='submit' disabled={!prompt.trim() || isGenerating}>
            {isGenerating ? 'Generating…' : 'Generate'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
