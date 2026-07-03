import React, { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { colorsList, darknessList } from 'helper/constants';

type ColorPickerProps = {
  dataKey?: string;
  title?: string;
  type: string;
  value: string;
  onChange: Function;
  onDeleteProp?: Function;
};

function ColorPicker({ dataKey = '', title = '', type, value = '', onChange, onDeleteProp }: ColorPickerProps) {

  function onClickColor(value, close) {
    return () => {
      onChange(dataKey || type, value);
      close();
    };
  }

  function onClickClearColor(close) {
    return () => {
      onDeleteProp(dataKey || type);
      close()
    }
  }

  return <div>
    <Popover className='relative'>
      <Popover.Button>
          <div className='flex items-center space-x-2 text-[12px] capitalize text-[#dcdcdc]'>
          {
            title !== ' ' &&
            <div className='w-20 text-left text-[#c8c8c8]'>
              {title || type}
            </div>
          }
          <div className={`${value.replace(type, 'bg')} w-4 h-4 border border-[#111] text-center text-[10px]`}>
            {value ? ''
              : 'X'
            }
          </div>
        </div>
      </Popover.Button>
      <Transition
        as={Fragment}
        enter='transition ease-out duration-200'
        enterFrom='opacity-0 translate-y-1'
        enterTo='opacity-100 translate-y-0'
        leave='transition ease-in duration-150'
        leaveFrom='opacity-100 translate-y-0'
        leaveTo='opacity-0 translate-y-1'
      >
        <Popover.Panel className='absolute z-10 rounded-sm border border-[#111] bg-[#252525] p-2 text-[11px] text-[#dcdcdc] shadow-lg'>
          {({ close }) => (
            <div className=''>
              <div className='mb-1 flex w-full border-b border-b-[#333] pb-1'>
                <span className='w-14 capitalize'>
                  recent:
                </span>
                <div
                  className={`ml-px h-4 w-4 cursor-pointer border border-[#111] bg-white text-center text-black`}
                  onClick={onClickClearColor(close)}
                >X</div>
                <div
                  className={`ml-px h-4 w-4 cursor-pointer border border-[#111] bg-black`}
                  onClick={onClickColor(`${type}-black`, close)}
                />
                <div
                  className={`ml-px h-4 w-4 cursor-pointer border border-[#111] bg-white`}
                  onClick={onClickColor(`${type}-white`, close)}
                />
              </div>
              <div>
                {
                  colorsList.map(color => <div className='flex' key={color}>
                    <span className='w-14 capitalize'>
                      {color}
                    </span>
                    {darknessList.map(darkness => <div
                      key={`${color}_${darkness}`}
                      className={`bg-${color}-${darkness} ml-px h-4 w-4 cursor-pointer border border-[#111]`}
                      onClick={onClickColor(`${type}-${color}-${darkness}`, close)} />)}
                  </div>)
                }
              </div>
            </div>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  </div>;
}

export default ColorPicker;
