import { sendRequest } from 'app/app.ipc';
import Modal from 'base/Modal';
import { getLastSceneScale } from 'data/AppData';
import { shell } from 'helper/electronRemote';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiCopy, FiExternalLink, FiLoader, FiPlay, FiRefreshCw, FiSave } from 'react-icons/fi';
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
  const [isQrCodeDialogOpen, setIsQrCodeDialogOpen] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(() => Math.round(getLastSceneScale() * 100));

  useEffect(() => {
    if (!devPageUrl) return;
    void QRCode.toDataURL(devPageUrl, { margin: 1, width: 200 }).then(setQrCodeUrl);
  }, [devPageUrl]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.type === 'previewEditingState') setIsProjectDirty(event.data.isEditing);
      if (event.data?.type === 'previewZoomChanged') setZoomPercent(Math.round(event.data.scale * 100));
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
    <div className='scene-panel-title' onPointerDown={stopTabInteraction}>
      <div className='pointer-events-auto flex items-center gap-0.5'>
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
          <button
            type='button'
            className='flex h-6 w-6 items-center justify-center rounded-sm text-[#aeb8c5] hover:bg-[#303846] hover:text-white'
            onClick={() => setIsQrCodeDialogOpen(true)}
            aria-label='Show dev page QR code'
            title='Show dev page QR code'
          >
            <LuQrCode size={15} />
          </button>
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
      <label className='pointer-events-auto flex h-6 items-center gap-2 text-xs text-[#aeb8c5]' title='Scene zoom'>
        <input
          type='range'
          min={10}
          max={350}
          step={5}
          value={zoomPercent}
          className='h-1 w-20 cursor-pointer accent-[#4a90e2]'
          aria-label='Scene zoom'
          onChange={(event) => {
            const nextZoomPercent = Number(event.target.value)
            setZoomPercent(nextZoomPercent)
            window.postMessage({ type: 'setSceneZoom', scale: nextZoomPercent / 100 }, '*')
          }}
        />
        <span className='w-9 text-right'>{zoomPercent}%</span>
      </label>
      <Modal isOpen={isQrCodeDialogOpen} onClose={() => setIsQrCodeDialogOpen(false)} title='Dev Page QR Code'>
        <div className='flex w-full flex-col items-center gap-3 pt-2 text-center'>
          {qrCodeUrl && (
            <div
              className='flex flex-col items-center justify-center rounded-lg bg-white p-3 shadow-md transition-transform hover:scale-[1.02] cursor-pointer'
              title='Click to open in browser'
              onClick={() => {
                if (devPageUrl) shell.openExternal(devPageUrl);
              }}
            >
              <img
                className='h-44 w-44 object-contain'
                src={qrCodeUrl}
                alt={`QR code for ${devPageUrl}`}
              />
            </div>
          )}
          <p className='text-[11px] text-[#8f8f8f]'>
            Scan with your device or click to open
          </p>
          <div className='flex w-full items-center justify-between gap-1.5 rounded border border-[#333] bg-[#1a1a1a] px-2.5 py-1.5'>
            <span
              className='flex-1 truncate text-left text-[11px] font-mono text-[#aeb8c5] hover:text-white cursor-pointer select-all'
              title={devPageUrl}
              onClick={() => {
                if (devPageUrl) shell.openExternal(devPageUrl);
              }}
            >
              {devPageUrl}
            </span>
            <button
              type='button'
              className='flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#8f8f8f] hover:bg-[#2c2c2c] hover:text-white transition-colors'
              title='Copy link'
              onClick={() => {
                if (devPageUrl) {
                  navigator.clipboard.writeText(devPageUrl);
                  toast.success('Copied link to clipboard');
                }
              }}
            >
              <FiCopy size={13} />
            </button>
            <button
              type='button'
              className='flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#8f8f8f] hover:bg-[#2c2c2c] hover:text-[#4a90e2] transition-colors'
              title='Open in browser'
              onClick={() => {
                if (devPageUrl) shell.openExternal(devPageUrl);
              }}
            >
              <FiExternalLink size={13} />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
