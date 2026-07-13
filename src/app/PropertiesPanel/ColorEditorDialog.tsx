import Button from 'base/Button';
import Input from 'base/Input';
import Modal from 'base/Modal';
import { useEffect, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { ColorSwatch } from './ColorSwatch';

type ProjectColor = {
  key: string;
  originalKey?: string;
  value: number[];
};

function normalizeColor(color): ProjectColor {
  return {
    key: color.key,
    originalKey: color.key,
    value: [0, 1, 2, 3].map((index) => color.value?.[index] ?? (index === 3 ? 255 : 0)),
  };
}

function hexToColor(hex: string) {
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
}

type Props = {
  colors: any[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (colors: ProjectColor[]) => Promise<boolean>;
};

export default function ColorEditorDialog({ colors: projectColors, isOpen, onClose, onSave }: Props) {
  const [colors, setColors] = useState<ProjectColor[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setColors(projectColors.map(normalizeColor));
  }, [isOpen, projectColors]);

  function updateColor(index, updated) {
    setColors((current) => current.map((color, colorIndex) => colorIndex === index ? { ...color, ...updated } : color));
  }

  function updateChannel(colorIndex, channelIndex, value) {
    updateColor(colorIndex, {
      value: colors[colorIndex].value.map((channel, index) => index === channelIndex ? Number(value) : channel),
    });
  }

  function updatePickerColor(colorIndex, hex) {
    updateColor(colorIndex, {
      value: [...hexToColor(hex), colors[colorIndex].value[3]],
    });
  }

  async function save() {
    setSaving(true);
    const saved = await onSave(colors);
    setSaving(false);
    if (saved) onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Edit Colors'>
      <div className='mt-4 w-[520px] text-[12px]'>
        <div className='mb-2 grid grid-cols-[minmax(0,1fr)_28px_repeat(4,54px)_28px] gap-1 px-1 text-[10px] uppercase text-[#8f8f8f]'>
          <span>Name</span><span>Color</span><span>R</span><span>G</span><span>B</span><span>A</span><span />
        </div>
        <div className='max-h-72 space-y-1 overflow-y-auto'>
          {colors.map((color, colorIndex) => (
            <div className='grid grid-cols-[minmax(0,1fr)_28px_repeat(4,54px)_28px] gap-1' key={color.originalKey || `${color.key}-${colorIndex}`}>
              <Input value={color.key} onChange={(event) => updateColor(colorIndex, { key: event.target.value })} />
              <ColorSwatch color={color.value} onChange={(hex) => updatePickerColor(colorIndex, hex)} />
              {color.value.map((channel, channelIndex) => (
                <Input key={channelIndex} type='number' min='0' max='255' value={channel} onChange={(event) => updateChannel(colorIndex, channelIndex, event.target.value)} />
              ))}
              <button className='flex items-center justify-center text-[#bdbdbd] hover:text-[#ff6565]' onClick={() => setColors((current) => current.filter((_, index) => index !== colorIndex))} title='Remove color'>
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
        <button
          className='mt-3 flex items-center gap-1 text-[11px] text-[#a8c7ff] hover:text-[#d7e6ff]'
          onClick={() => setColors((current) => [...current, { key: 'NewColor', value: [255, 255, 255, 255] }])}
        >
          <FiPlus /> Add color
        </button>
        <div className='mt-4 flex justify-end gap-2'>
          <button className='h-8 rounded-sm px-3 text-[11px] text-[#dcdcdc] hover:bg-[#333]' onClick={onClose}>Cancel</button>
          <Button type='button' className='w-auto' onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>
    </Modal>
  );
}
