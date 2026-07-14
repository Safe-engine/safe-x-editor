import { parseStringFromValue } from 'helper/node';
import { TbKeyframeAlignHorizontal, TbKeyframeAlignVertical } from 'react-icons/tb';
import { WIDGET_DIRECTIONS } from './NodeProps.constants';

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseValue(value, previousValue) {
  if (typeof previousValue === 'boolean') return value === 'true';
  if (typeof previousValue === 'number') return parseNumber(value, previousValue);
  return value;
}

function WidgetInsets({ props, onChange, onToggle, onToggleCenter }) {
  const centerVertical = props.centerVertical === true || parseStringFromValue(props.centerVertical) === 'true';
  const centerHorizon = props.centerHorizon === true || parseStringFromValue(props.centerHorizon) === 'true';
  return (
    <div className='px-2 py-2'>
      <div className='grid grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] grid-rows-3 items-center gap-1'>
        {WIDGET_DIRECTIONS.map((direction) => {
          const centerLocked = ['top', 'bottom'].includes(direction.key) ? centerVertical : centerHorizon;
          const enabled = props[direction.key] !== undefined && props[direction.key] !== null;
          return (
            <div
              key={direction.key}
              className={`${direction.className} min-w-0 rounded-sm border border-[#383838] bg-[#202020] p-1 ${direction.horizontal ? 'flex items-center gap-1' : ''}`}
            >
              <label className={`${direction.horizontal ? 'w-12 shrink-0' : 'mb-0.5 justify-center'} flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-[#aaa]`}>
                <input
                  aria-label={`Enable ${direction.label}`}
                  className='h-3 w-3 accent-[#6aa7ff]'
                  type='checkbox'
                  checked={enabled}
                  disabled={centerLocked}
                  onChange={(event) => onToggle(direction.key, event.target.checked)}
                />
                {direction.label}
              </label>
              <input
                aria-label={direction.label}
                className='h-6 w-full min-w-0 rounded-sm border border-[#111] bg-[#151515] px-1 text-center text-[11px] text-[#e2e2e2] outline-none disabled:text-[#666] focus:border-[#4a90e2]'
                type={typeof props[direction.key] === 'number' ? 'number' : 'text'}
                value={props[direction.key] ?? ''}
                disabled={!enabled || centerLocked}
                onChange={(event) => onChange({
                  [direction.key]: parseValue(event.target.value, props[direction.key]),
                })}
              />
            </div>
          );
        })}
        <div className='col-start-2 row-start-2 flex h-10 items-center justify-center rounded-sm border border-[#5d7087] bg-[#2d3b4b] text-[9px] font-semibold uppercase text-[#a8c7ff]'>
          Node
        </div>
      </div>
      <div className='mt-2 grid grid-cols-2 gap-2 border-t border-[#343434] pt-2'>
        <label className='flex items-center gap-1 text-[10px] text-[#c8c8c8]'>
          <input
            className='h-3 w-3 accent-[#6aa7ff]'
            type='checkbox'
            checked={centerVertical}
            onChange={(event) => onToggleCenter('centerVertical', event.target.checked)}
          />
          <TbKeyframeAlignVertical size={14} aria-hidden />
          Center Vertical
        </label>
        <label className='flex items-center gap-1 text-[10px] text-[#c8c8c8]'>
          <input
            className='h-3 w-3 accent-[#6aa7ff]'
            type='checkbox'
            checked={centerHorizon}
            onChange={(event) => onToggleCenter('centerHorizon', event.target.checked)}
          />
          <TbKeyframeAlignHorizontal size={14} aria-hidden />
          Center Horizon
        </label>
      </div>
    </div>
  );
}

export default WidgetInsets;
