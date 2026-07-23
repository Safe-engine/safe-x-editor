import { sendRequest } from 'app/app.ipc'
import Button from 'base/Button'
import Modal from 'base/Modal'
import SelectBox from 'base/SelectBox'
import { ipcMain } from 'helper/electronRemote'
import { useEffect, useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import {
  ADD_OPEN_WITH_APP_REQUEST,
  CONFIGURE_SETTINGS,
  GET_AI_IMAGE_SETTINGS_REQUEST,
  GET_OPEN_WITH_APPS_REQUEST,
  REMOVE_OPEN_WITH_APP_REQUEST,
  SAVE_AI_IMAGE_SETTINGS_REQUEST,
} from 'shared/constant.message'

type Tab = 'editor' | 'image-ai'
type ImageAiProvider = 'agy' | 'codex' | 'claude' | 'openai-compatible'

const providerLabels: Record<ImageAiProvider, string> = {
  agy: 'agy',
  codex: 'codex',
  claude: 'claude',
  'openai-compatible': 'Open AI Compatible',
}

const cliModels: Record<Exclude<ImageAiProvider, 'openai-compatible'>, string[]> = {
  agy: [
    'gemini-3.6-flash-high',
    'gemini-3.6-flash-medium',
    'gemini-3.6-flash-low',
    'gemini-3.5-flash-high',
    'gemini-3.5-flash-medium',
    'gemini-3.5-flash-low',
    'gemini-3.1-pro-high',
    'gemini-3.1-pro-low',
    'claude-sonnet-4-6',
    'claude-opus-4-6-thinking',
    'gpt-oss-120b-medium',
  ],
  codex: ['gpt-5.3-codex'],
  claude: ['sonnet', 'opus'],
}

export default function SettingsDialog() {
  const [isOpen, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('editor')
  const [apps, setApps] = useState<string[]>([])
  const [numberOfImages, setNumberOfImages] = useState(4)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [provider, setProvider] = useState<ImageAiProvider>('agy')
  const [model, setModel] = useState(cliModels.agy[0])
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    async function openDialog() {
      const [appsResponse, imageResponse]: any[] = await Promise.all([
        sendRequest({ key: GET_OPEN_WITH_APPS_REQUEST }),
        sendRequest({ key: GET_AI_IMAGE_SETTINGS_REQUEST }),
      ])
      setApps(appsResponse?.apps || [])
      setNumberOfImages(imageResponse?.numberOfImages || 4)
      setSystemPrompt(imageResponse?.systemPrompt || '')
      setProvider(imageResponse?.provider || 'agy')
      setModel(imageResponse?.model || (imageResponse?.provider === 'openai-compatible' ? '' : cliModels.agy[0]))
      setBaseUrl(imageResponse?.baseUrl || '')
      setApiKey(imageResponse?.apiKey || '')
      setTab('editor')
      setOpen(true)
    }

    ipcMain.on(CONFIGURE_SETTINGS, openDialog)
    return () => ipcMain.removeListener(CONFIGURE_SETTINGS, openDialog)
  }, [])

  async function addApp() {
    const response: any = await sendRequest({ key: ADD_OPEN_WITH_APP_REQUEST })
    setApps(response?.apps || [])
  }

  async function removeApp(appPath: string) {
    const response: any = await sendRequest({ key: REMOVE_OPEN_WITH_APP_REQUEST, appPath })
    setApps(response?.apps || [])
  }

  async function saveImageSettings() {
    await sendRequest({ key: SAVE_AI_IMAGE_SETTINGS_REQUEST, numberOfImages, systemPrompt, provider, model, baseUrl, apiKey })
  }

  function closeDialog() {
    setOpen(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={closeDialog} title='Settings'>
      <div className='mt-4 flex w-[660px] text-[12px]'>
        <div className='min-h-[310px] flex-1 pr-4'>
          {tab === 'editor' ? (
            <div>
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
          ) : (
            <div className='flex flex-col gap-4'>
              <label className='flex flex-col gap-1'>
                <span className='text-[#bdbdbd]'>Provider</span>
                <div className='w-56'>
                  <SelectBox
                    selected={providerLabels[provider]}
                    items={Object.values(providerLabels)}
                    setSelected={(label: string) => {
                      const nextProvider = (Object.keys(providerLabels) as ImageAiProvider[]).find((key) => providerLabels[key] === label) || 'agy'
                      setProvider(nextProvider)
                      setModel(nextProvider === 'openai-compatible' ? '' : cliModels[nextProvider][0])
                    }}
                  />
                </div>
              </label>
              {provider === 'openai-compatible' ? (
                <div className='flex flex-col gap-4'>
                  <label className='flex flex-col gap-1'>
                    <span className='text-[#bdbdbd]'>Base URL</span>
                    <input
                      className='h-7 rounded-sm border border-[#111] bg-[#151515] px-2 text-[12px] text-[#e2e2e2] placeholder-[#777] shadow-inner outline-none focus:border-[#4a90e2]'
                      value={baseUrl}
                      onChange={(event) => setBaseUrl(event.target.value)}
                      placeholder='https://api.example.com/v1'
                    />
                  </label>
                  <label className='flex flex-col gap-1'>
                    <span className='text-[#bdbdbd]'>API key</span>
                    <input
                      className='h-7 rounded-sm border border-[#111] bg-[#151515] px-2 text-[12px] text-[#e2e2e2] placeholder-[#777] shadow-inner outline-none focus:border-[#4a90e2]'
                      type='password'
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                    />
                  </label>
                  <label className='flex flex-col gap-1'>
                    <span className='text-[#bdbdbd]'>Model</span>
                    <input
                      className='h-7 rounded-sm border border-[#111] bg-[#151515] px-2 text-[12px] text-[#e2e2e2] placeholder-[#777] shadow-inner outline-none focus:border-[#4a90e2]'
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                      placeholder='Model name'
                    />
                  </label>
                </div>
              ) : (
                <label className='flex flex-col gap-1'>
                  <span className='text-[#bdbdbd]'>Model</span>
                  <div className='w-56'>
                    <SelectBox selected={model} items={cliModels[provider]} setSelected={setModel} />
                  </div>
                </label>
              )}
              <label className='flex flex-col gap-1'>
                <span className='text-[#bdbdbd]'>Number of images</span>
                <div className='w-28'>
                  <SelectBox selected={numberOfImages} items={[1, 2, 3, 4]} setSelected={setNumberOfImages} />
                </div>
              </label>
              <label className='flex flex-col gap-1'>
                <span className='text-[#bdbdbd]'>System prompt</span>
                <textarea
                  className='h-44 resize-none rounded-sm border border-[#111] bg-[#151515] px-2 py-1.5 text-[12px] text-[#e2e2e2] placeholder-[#777] shadow-inner outline-none focus:border-[#4a90e2]'
                  value={systemPrompt}
                  onChange={(event) => setSystemPrompt(event.target.value)}
                  placeholder='Instructions applied to every AI image generation'
                />
              </label>
              <div className='flex justify-end'>
                <Button type='button' onClick={saveImageSettings}>Save Image AI Settings</Button>
              </div>
            </div>
          )}
        </div>
        <div className='w-32 border-l border-[#151515] pl-3'>
          <button className={`w-full rounded-sm px-3 py-2 text-left ${tab === 'editor' ? 'bg-[#304766] text-white' : 'text-[#bdbdbd] hover:bg-[#333]'}`} type='button' onClick={() => setTab('editor')}>Editor</button>
          <button className={`mt-1 w-full rounded-sm px-3 py-2 text-left ${tab === 'image-ai' ? 'bg-[#304766] text-white' : 'text-[#bdbdbd] hover:bg-[#333]'}`} type='button' onClick={() => setTab('image-ai')}>Image AI</button>
        </div>
      </div>
    </Modal>
  )
}
