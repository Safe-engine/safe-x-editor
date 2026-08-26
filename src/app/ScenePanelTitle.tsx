import { sendRequest } from 'app/app.ipc';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiLoader, FiPlay, FiRefreshCw, FiSave } from 'react-icons/fi';
import { LuQrCode } from 'react-icons/lu';
import { RUN_DEV_SERVER_REQUEST } from 'shared/constant.message';
import { useActions, useSelector } from 'states/app.context';
import { selectRootFolder, selectSelectedFilePath } from 'states/app.selectors';

export default function ScenePanelTitle() {
  const { loadComponent } = useActions();
  const filePath = useSelector(selectSelectedFilePath);
  const rootFolder = useSelector(selectRootFolder);
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

  const stopTabInteraction = (event: React.PointerEvent | React.MouseEvent) => event.stopPropagation();

  return (
    <span className='scene-panel-title' onPointerDown={stopTabInteraction}>
      <button
        type='button'
        className={`flex h-6 w-6 items-center justify-center rounded-sm ${isProjectDirty ? 'text-[#ff5c5c] hover:bg-[#303846] hover:text-[#ff7777]' : 'text-[#aeb8c5] hover:bg-[#303846] hover:text-white'}`}
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
          loadComponent(filePath);
          window.postMessage({ type: 'reLoad' }, '*');
        }}
        disabled={!filePath}
        aria-label='Reload component'
        title='Reload component'
      >
        <FiRefreshCw size={14} />
      </button>
      {devPageUrl ? (
        <span className='group relative'>
          <button
            type='button'
            className='flex h-6 w-6 items-center justify-center rounded-sm text-[#aeb8c5] hover:bg-[#303846] hover:text-white'
            aria-label='Show dev page QR code'
            title='Show dev page QR code'
          >
            <LuQrCode size={15} />
          </button>
          <span className='pointer-events-none absolute right-0 top-7 z-50 hidden w-56 rounded-md border border-[#3d4654] bg-[#202020] p-3 text-center shadow-xl group-hover:block'>
            {qrCodeUrl && <img className='mx-auto h-48 w-48 rounded bg-white p-1' src={qrCodeUrl} alt={`QR code for ${devPageUrl}`} />}
            <span className='mt-2 block break-all text-[10px] text-[#aeb8c5]'>{devPageUrl}</span>
          </span>
        </span>
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
    </span>
  );
}
