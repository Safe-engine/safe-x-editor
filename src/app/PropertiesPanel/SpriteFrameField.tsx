import { Listbox } from '@headlessui/react';
import { FiCheck, FiChevronDown } from 'react-icons/fi';
import { useState } from 'react';
import { parseStringFromValue } from 'helper/node';

function texturePreviewUrl(texture, rootFolder) {
  const path = texture.value || texture.path;
  if (!path) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  const normalized = String(path).replace(/\\/g, '/').replace(/^res\//, '');
  const fullPath = normalized.startsWith('/') ? normalized : `${rootFolder}/res/${normalized}`;
  return `file://${fullPath.split('/').map(encodeURIComponent).join('/')}`;
}

function textureLabel(texture) {
  return texture.key.replace(/^sf_/, '');
}

export default function SpriteFrameField({ value, textures, rootFolder, onChange }) {
  const selectedKey = parseStringFromValue(value) ?? '';
  const selectedTexture = textures.find((texture) => texture.key === selectedKey);
  const [filter, setFilter] = useState('');
  const filteredTextures = textures.filter((texture) => textureLabel(texture).toLowerCase().includes(filter.toLowerCase()));

  return (
    <label className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-center gap-2 px-2 py-0.5'>
      <div className='truncate text-[11px] text-[#c8c8c8]'>spriteFrame</div>
      <Listbox value={selectedKey} onChange={(key) => onChange(key || undefined)}>
        <div className='relative min-w-0'>
          <Listbox.Button className='flex h-7 w-full items-center gap-2 rounded-sm border border-[#111] bg-[#151515] px-2 text-left text-[12px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]'>
            {selectedTexture && <img className='h-4 w-4 rounded-sm object-cover' src={texturePreviewUrl(selectedTexture, rootFolder)} alt='' />}
            <span className='min-w-0 flex-1 truncate'>{selectedTexture ? textureLabel(selectedTexture) : 'None'}</span>
            <FiChevronDown className='shrink-0 text-[#8f8f8f]' size={14} />
          </Listbox.Button>
          <Listbox.Options className='absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-sm border border-[#111] bg-[#252525] py-1 text-[12px] shadow-lg focus:outline-none'>
            <div className='px-2 pb-1'>
              <input
                className='h-7 w-full rounded-sm border border-[#111] bg-[#151515] px-2 text-[12px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]'
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder='Filter textures'
                autoFocus
              />
            </div>
            <Listbox.Option value=''>
              {({ active, selected }) => (
                <div className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 ${active ? 'bg-[#304766] text-white' : 'text-[#dcdcdc]'}`}>
                  <span className='h-4 w-4' />
                  <span className='min-w-0 flex-1 truncate'>None</span>
                  {selected && <FiCheck size={14} />}
                </div>
              )}
            </Listbox.Option>
            {filteredTextures.map((texture) => (
              <Listbox.Option key={texture.key} value={texture.key}>
                {({ active, selected }) => (
                  <div className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 ${active ? 'bg-[#304766] text-white' : 'text-[#dcdcdc]'}`}>
                    <img className='h-4 w-4 rounded-sm object-cover' src={texturePreviewUrl(texture, rootFolder)} alt='' />
                    <span className='min-w-0 flex-1 truncate'>{textureLabel(texture)}</span>
                    {selected && <FiCheck className='shrink-0' size={14} />}
                  </div>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </label>
  );
}
