import { useEffect, useRef, useState } from 'react';
import { FiEdit2 } from 'react-icons/fi';
import Modal from 'base/Modal';
import { parseStringFromValue } from 'helper/node';
import { toFileUrl } from 'helper/fileUrl';

type Insets = { left: number; top: number; right: number; bottom: number };
type CapInsets = [number, number, number, number];

function parseNumber(value: any) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function parseCapInsets(value: any): Insets {
  if (Array.isArray(value)) {
    const [left, top, right, bottom] = value;
    return { left: parseNumber(left), top: parseNumber(top), right: parseNumber(right), bottom: parseNumber(bottom) };
  }
  if (value && typeof value === 'object') {
    return {
      left: parseNumber(value.left ?? value.x),
      top: parseNumber(value.top ?? value.y),
      right: parseNumber(value.right ?? value.z),
      bottom: parseNumber(value.bottom ?? value.w),
    };
  }
  const values = String(value || '').match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
  return { left: values[0] || 0, top: values[1] || 0, right: values[2] || 0, bottom: values[3] || 0 };
}

function formatCapInsets(insets: Insets): CapInsets {
  return [insets.left, insets.top, insets.right, insets.bottom];
}

function texturePreviewUrl(texture, rootFolder) {
  const path = texture?.value || texture?.path;
  if (!path) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  const normalized = String(path).replace(/\\/g, '/').replace(/^res\//, '');
  const fullPath = normalized.startsWith('/') ? normalized : `${rootFolder}/res/${normalized}`;
  return toFileUrl(fullPath);
}

function CapInsetsDialog({ isOpen, onClose, value, texture, rootFolder, onSave }) {
  const [insets, setInsets] = useState<Insets>(() => parseCapInsets(value));
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) setInsets(parseCapInsets(value));
  }, [isOpen, value]);

  function updateInset(key, nextValue) {
    const limit = key === 'left' || key === 'right' ? imageSize.width : imageSize.height;
    setInsets((current) => ({ ...current, [key]: Math.max(0, Math.min(limit || Infinity, Math.round(nextValue))) }));
  }

  function moveGuide(event) {
    const guide = dragging.current;
    const rect = previewRef.current?.getBoundingClientRect();
    if (!guide || !rect || !imageSize.width || !imageSize.height) return;
    const horizontal = guide === 'left' || guide === 'right';
    const position = horizontal ? event.clientX - rect.left : event.clientY - rect.top;
    const size = horizontal ? rect.width : rect.height;
    const naturalSize = horizontal ? imageSize.width : imageSize.height;
    const inset = position / size * naturalSize;
    updateInset(guide, guide === 'right' || guide === 'bottom' ? naturalSize - inset : inset);
  }

  useEffect(() => {
    function stopDragging() { dragging.current = null; }
    window.addEventListener('pointermove', moveGuide);
    window.addEventListener('pointerup', stopDragging);
    return () => {
      window.removeEventListener('pointermove', moveGuide);
      window.removeEventListener('pointerup', stopDragging);
    };
  });

  const imageUrl = texturePreviewUrl(texture, rootFolder);
  const previewScale = imageSize.width && imageSize.height
    ? Math.min(480 / imageSize.width, 360 / imageSize.height, 1)
    : 1;
  const previewStyle = imageSize.width && imageSize.height
    ? { width: imageSize.width * previewScale, height: imageSize.height * previewScale }
    : undefined;
  const guides = [
    { key: 'left', className: 'top-0 h-full w-3 cursor-ew-resize', style: { left: `${imageSize.width ? insets.left / imageSize.width * 100 : 0}%` }, lineClassName: 'mr-auto h-full w-0.5' },
    { key: 'right', className: 'top-0 h-full w-3 -translate-x-full cursor-ew-resize', style: { left: `${imageSize.width ? (imageSize.width - insets.right) / imageSize.width * 100 : 100}%` }, lineClassName: 'ml-auto h-full w-0.5' },
    { key: 'top', className: 'h-3 w-full -translate-y-1/2 cursor-ns-resize', style: { top: `${imageSize.height ? insets.top / imageSize.height * 100 : 0}%` }, lineClassName: 'my-auto h-0.5 w-full' },
    { key: 'bottom', className: 'h-3 w-full -translate-y-1/2 cursor-ns-resize', style: { top: `${imageSize.height ? (imageSize.height - insets.bottom) / imageSize.height * 100 : 100}%` }, lineClassName: 'my-auto h-0.5 w-full' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Edit Cap Insets'>
      <div className='mt-4 w-[520px] text-[12px]'>
        {imageUrl ? (
          <div ref={previewRef} className='relative mx-auto overflow-visible bg-[#151515]' style={previewStyle}>
            <img
              className='block h-full w-full select-none'
              src={imageUrl}
              alt='Sprite texture'
              draggable={false}
              onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            />
            {guides.map((guide) => (
              <div
                key={guide.key}
                className={`absolute z-10 flex touch-none ${guide.className}`}
                style={guide.style}
                onPointerDown={(event) => { event.preventDefault(); dragging.current = guide.key; }}
                title={`Drag ${guide.key} inset`}
              ><span className={`block bg-[#ffcc4d] shadow-[0_0_0_1px_rgba(0,0,0,.8)] ${guide.lineClassName}`} /></div>
            ))}
          </div>
        ) : (
          <div className='flex h-40 items-center justify-center border border-dashed border-[#444] text-[#8f8f8f]'>Choose a spriteFrame to load its texture.</div>
        )}
        <div className='mt-3 grid grid-cols-4 gap-2'>
          {(['left', 'top', 'right', 'bottom'] as const).map((key) => (
            <label key={key} className='text-[10px] uppercase text-[#9f9f9f]'>
              {key}
              <input
                className='mt-1 h-7 w-full rounded-sm border border-[#111] bg-[#151515] px-2 text-[12px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]'
                type='number'
                min='0'
                value={insets[key]}
                onChange={(event) => updateInset(key, event.target.value)}
              />
            </label>
          ))}
        </div>
        <div className='mt-4 flex justify-end gap-2'>
          <button className='h-8 rounded-sm px-3 text-[11px] text-[#dcdcdc] hover:bg-[#333]' onClick={onClose}>Cancel</button>
          <button className='h-8 rounded-sm bg-[#333] px-3 text-[11px] font-bold uppercase text-[#f3f3f3] hover:bg-[#3d3d3d]' onClick={() => { onSave(formatCapInsets(insets)); onClose(); }}>Save</button>
        </div>
      </div>
    </Modal>
  );
}

export default function CapInsetsField({ value, spriteFrame, textures, rootFolder, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const textureKey = parseStringFromValue(spriteFrame);
  const texture = textures.find((item) => item.key === textureKey);
  const insets = parseCapInsets(value);

  return (
    <>
      <div className='grid min-h-7 grid-cols-[70px_minmax(0,1fr)] items-center gap-2 px-2 py-0.5'>
        <div className='truncate text-[11px] text-[#c8c8c8]'>capInsets</div>
        <div className='flex min-w-0 items-center gap-1'>
          <span className='min-w-0 flex-1 truncate text-[11px] text-[#dcdcdc]'>[{formatCapInsets(insets).join(', ')}]</span>
          <button className='flex h-6 shrink-0 items-center gap-1 rounded-sm border border-[#111] bg-[#303030] px-2 text-[11px] text-[#dcdcdc] hover:text-[#f0f0f0]' onClick={() => setIsOpen(true)}>
            <FiEdit2 size={12} /> Edit
          </button>
        </div>
      </div>
      <CapInsetsDialog isOpen={isOpen} onClose={() => setIsOpen(false)} value={value} texture={texture} rootFolder={rootFolder} onSave={onChange} />
    </>
  );
}
