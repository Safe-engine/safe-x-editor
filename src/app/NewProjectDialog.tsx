import { sendRequest } from 'app/app.ipc'
import Button from 'base/Button'
import Input from 'base/Input'
import Modal from 'base/Modal'
import {
  getLastNewProjectRootFolder,
  getLastRootFolder,
  setLastNewProjectRootFolder,
} from 'data/AppData'
import { dialog, getCurrentWindow, ipcMain } from 'helper/electronRemote'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CREATE_PROJECT_REQUEST, NEW_PROJECT } from 'shared/constant.message'
import { useDispatch } from 'states/app.context'

export default function NewProjectDialog() {
  const [isOpen, setOpen] = useState(false)
  const [rootFolder, setRootFolder] = useState('')
  const [projectName, setProjectName] = useState('')
  const [isCreating, setCreating] = useState(false)
  const appDispatch = useDispatch()

  useEffect(() => {
    function openDialog() {
      setRootFolder(getLastNewProjectRootFolder() || getLastRootFolder())
      setProjectName('')
      setOpen(true)
    }

    ipcMain.on(NEW_PROJECT, openDialog)
    return () => {
      ipcMain.removeListener(NEW_PROJECT, openDialog)
    }
  }, [])

  function chooseRootFolder() {
    const folders = dialog.showOpenDialogSync(getCurrentWindow(), {
      title: 'Select root folder.',
      defaultPath: rootFolder || undefined,
      properties: ['openDirectory'],
    })
    if (folders?.[0]) setRootFolder(folders[0])
  }

  async function createProject() {
    if (!rootFolder.trim() || !projectName.trim()) return
    setCreating(true)
    const response: any = await sendRequest({
      key: CREATE_PROJECT_REQUEST,
      rootFolder: rootFolder.trim(),
      projectName: projectName.trim(),
    })
    setCreating(false)

    if (!response || response.error) {
      toast.error(response?.message || 'Unable to create project')
      return
    }

    setLastNewProjectRootFolder(rootFolder.trim())
    toast.success('Project created')
    setOpen(false)
    appDispatch({ type: 'getFiles', data: [response.workspacePath] })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => !isCreating && setOpen(false)} title='New Project'>
      <div
        className='relative mt-4 flex w-[420px] flex-col gap-3 text-[12px]'
        onKeyDown={(e) => {
          if (e.key === 'Enter' && rootFolder.trim() && projectName.trim() && !isCreating) {
            createProject()
          }
        }}
      >
        {isCreating && (
          <div className='absolute inset-0 z-10 flex items-center justify-center rounded-sm bg-[#1e1e1e]/80'>
            <svg className='h-8 w-8 animate-spin text-[#4a90e2]' viewBox='0 0 24 24' fill='none'>
              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
              <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
            </svg>
          </div>
        )}
        <label className='flex flex-col gap-1'>
          <span className='text-[#bdbdbd]'>Project Name</span>
          <Input
            className='text-lg'
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder='My Project'
          />
        </label>
        <label className='flex flex-col gap-1'>
          <span className='text-[#bdbdbd]'>Root Folder</span>
          <div className='flex gap-2'>
            <Input value={rootFolder} readOnly placeholder='Select a folder' />
            <Button type='button' className='w-auto' onClick={chooseRootFolder}>Browse</Button>
          </div>
        </label>
        <div className='mt-2 flex justify-end gap-2'>
          <Button type='button' className='w-auto' onClick={() => setOpen(false)} disabled={isCreating}>Cancel</Button>
          <Button
            type='button'
            className='w-auto'
            onClick={createProject}
            disabled={!rootFolder.trim() || !projectName.trim() || isCreating}
          >
            {isCreating ? (
              <span className='flex items-center gap-1.5'>
                <svg className='h-3.5 w-3.5 animate-spin' viewBox='0 0 24 24' fill='none'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
                </svg>
                Creating...
              </span>
            ) : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
