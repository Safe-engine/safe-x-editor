import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { colorsList, darknessList } from '../helper/constants';

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
        <div className='flex space-x-2 capitalize '>
          {
            title !== ' ' &&
            <div className='w-20 text-left'>
              {title || type}
            </div>
          }
          <div className={`${value.replace(type, 'bg')} w-4 h-4 border border-black`}>
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
        <Popover.Panel className='absolute z-10 p-1 bg-white border border-black rounded-sm'>
          {({ close }) => (
            <div className=''>
              <div className='w-full flex mb-1 border-b border-b-black'>
                <span className='w-14 capitalize'>
                  recent:
                </span>
                <div
                  className={`bg-white w-4 h-4 cursor-pointer ml-px border border-black text-center`}
                  onClick={onClickClearColor(close)}
                >X</div>
                <div
                  className={`bg-black w-4 h-4 cursor-pointer ml-px border border-black`}
                  onClick={onClickColor(`${type}-black`, close)}
                />
                <div
                  className={`bg-white w-4 h-4 cursor-pointer ml-px border border-black`}
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
                      className={`bg-${color}-${darkness} w-4 h-4 cursor-pointer ml-px border border-black`}
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
