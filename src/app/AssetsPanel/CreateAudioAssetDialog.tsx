import Button from 'base/Button'
import Input from 'base/Input'
import Modal from 'base/Modal'
import { useState } from 'react'

export type AudioAssetForm = {
  name: string
  path: string
}

type Props = {
  isOpen: boolean
  setOpen: (value: boolean) => void
  onCreate: (data: AudioAssetForm) => boolean | Promise<boolean>
}

export default function CreateAudioAssetDialog({ isOpen, setOpen, onCreate }: Props) {
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const isDisabled = !name.trim() || !path.trim()

  async function handleCreate() {
    if (isDisabled) return
    const created = await onCreate({ name: name.trim(), path: path.trim() })
    if (created) setOpen(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setOpen(false)} title='Create Audio Asset'>
      <div className='mt-4 flex w-[360px] flex-col gap-3 text-[12px]'>
        <label className='flex flex-col gap-1'>
          <span className='text-[#bdbdbd]'>Name</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder='button_click' />
        </label>
        <label className='flex flex-col gap-1'>
          <span className='text-[#bdbdbd]'>Path</span>
          <Input value={path} onChange={(event) => setPath(event.target.value)} placeholder='audio/button_click.mp3' />
        </label>
        <div className='mt-2 flex justify-end gap-2'>
          <Button type='button' onClick={() => setOpen(false)}>Cancel</Button>
          <Button type='button' onClick={handleCreate} disabled={isDisabled}>Create</Button>
        </div>
      </div>
    </Modal>
  )
}
