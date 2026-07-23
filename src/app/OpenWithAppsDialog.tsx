import { sendRequest } from 'app/app.ipc'
import Modal from 'base/Modal'
import { ipcMain } from 'helper/electronRemote'
import { useEffect, useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import {
  ADD_OPEN_WITH_APP_REQUEST,
  CONFIGURE_OPEN_WITH_APPS,
  GET_OPEN_WITH_APPS_REQUEST,
  REMOVE_OPEN_WITH_APP_REQUEST,
} from 'shared/constant.message'

export default function OpenWithAppsDialog() {
  const [isOpen, setOpen] = useState(false)
  const [apps, setApps] = useState<string[]>([])

  useEffect(() => {
    async function openDialog() {
      const response: any = await sendRequest({ key: GET_OPEN_WITH_APPS_REQUEST })
      setApps(response?.apps || [])
      setOpen(true)
    }

    ipcMain.on(CONFIGURE_OPEN_WITH_APPS, openDialog)
    return () => ipcMain.removeListener(CONFIGURE_OPEN_WITH_APPS, openDialog)
  }, [])

  async function addApp() {
    const response: any = await sendRequest({ key: ADD_OPEN_WITH_APP_REQUEST })
    setApps(response?.apps || [])
  }

  async function removeApp(appPath: string) {
    const response: any = await sendRequest({ key: REMOVE_OPEN_WITH_APP_REQUEST, appPath })
    setApps(response?.apps || [])
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setOpen(false)} title='Configure Other Apps'>
      <div className='mt-4 w-[420px] text-[12px]'>
        <div className='text-[#bdbdbd]'>Current connected apps</div>
        <div className='mt-2 max-h-52 overflow-auto rounded-sm border border-[#111] bg-[#151515]'>
          {apps.length === 0 ? (
            <div className='px-3 py-4 text-[#8f8f8f]'>No other apps connected.</div>
          ) : (
            apps.map((appPath) => (
              <div className='flex items-center gap-3 border-b border-[#252525] px-3 py-2 last:border-b-0' key={appPath}>
                <span className='min-w-0 flex-1 truncate text-[#dcdcdc]' title={appPath}>{appPath.split('/').pop()?.replace(/\.app$/, '')}</span>
                <button
                  className='flex h-7 w-7 items-center justify-center text-[#bdbdbd] hover:text-[#ff6565]'
                  type='button'
                  onClick={() => removeApp(appPath)}
                  title='Remove app'
                  aria-label={`Remove ${appPath}`}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))
          )}
        </div>
        <button className='mt-3 flex h-8 items-center gap-1 rounded-sm bg-[#333] px-3 text-[11px] font-bold uppercase text-[#f3f3f3] hover:bg-[#3d3d3d]' type='button' onClick={addApp}>
          <FiPlus /> Add other app
        </button>
      </div>
    </Modal>
  )
}
