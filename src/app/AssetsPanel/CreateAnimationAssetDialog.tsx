import Button from 'base/Button'
import Input from 'base/Input'
import Modal from 'base/Modal'
import SelectBox from 'base/SelectBox'
import { useState } from 'react'

export type AnimationAssetForm = {
  name: string
  type: string
  atlasPath: string
  skeletonPath: string
  texturePath: string
}

type Props = {
  isOpen: boolean
  setOpen: (value: boolean) => void
  onCreate: (data: AnimationAssetForm) => boolean | Promise<boolean>
}

const animationTypes = ['spine', 'dragonBones']

export default function CreateAnimationAssetDialog({ isOpen, setOpen, onCreate }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState(animationTypes[0])
  const [atlasPath, setAtlasPath] = useState('')
  const [skeletonPath, setSkeletonPath] = useState('')
  const [texturePath, setTexturePath] = useState('')
  const isDisabled = !name.trim() || !atlasPath.trim() || !skeletonPath.trim()

  async function handleCreate() {
    if (isDisabled) return
    const created = await onCreate({
      name: name.trim(),
      type,
      atlasPath: atlasPath.trim(),
      skeletonPath: skeletonPath.trim(),
      texturePath: texturePath.trim(),
    })
    if (created) setOpen(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={() => setOpen(false)} title='Create Animation Asset'>
      <div className='mt-4 flex w-[360px] flex-col gap-3 text-[12px]'>
        <label className='flex flex-col gap-1'>
          <span className='text-[#bdbdbd]'>Name</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder='hero_run' />
        </label>
        <label className='flex flex-col gap-1'>
          <span className='text-[#bdbdbd]'>Type</span>
          <SelectBox items={animationTypes} selected={type} setSelected={setType} />
        </label>
        <label className='flex flex-col gap-1'>
          <span className='text-[#bdbdbd]'>Atlas Path</span>
          <Input value={atlasPath} onChange={(event) => setAtlasPath(event.target.value)} placeholder='animations/hero.atlas' />
        </label>
        <label className='flex flex-col gap-1'>
          <span className='text-[#bdbdbd]'>Skeleton Path</span>
          <Input value={skeletonPath} onChange={(event) => setSkeletonPath(event.target.value)} placeholder='animations/hero.json' />
        </label>
        <label className='flex flex-col gap-1'>
          <span className='text-[#bdbdbd]'>Texture Path</span>
          <Input value={texturePath} onChange={(event) => setTexturePath(event.target.value)} placeholder='animations/hero.png' />
        </label>
        <div className='mt-2 flex justify-end gap-2'>
          <Button type='button' onClick={() => setOpen(false)}>Cancel</Button>
          <Button type='button' onClick={handleCreate} disabled={isDisabled}>Create</Button>
        </div>
      </div>
    </Modal>
  )
}
