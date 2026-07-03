import React, { Fragment } from 'react';
import clsx from 'clsx';
import { Menu, Transition } from '@headlessui/react'

type Props = {
  items: Array<string>;
  onChange: Function;
  value?: string;
  title?: string;
};

function DropDown({
  items,
  value,
  title,
  onChange,
}: Props) {

  function onClickMenu(it) {
    return () => {
      onChange(it);
    }
  }

  return <Menu>
    <div>
      {title}
    </div>
    <Menu.Button className='h-7 rounded-sm border border-[#111] bg-[#151515] px-2 py-1 text-[12px] text-[#e2e2e2] shadow-inner'>
      {value}
    </Menu.Button>
    <Transition
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <Menu.Items className='absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-sm border border-[#111] bg-[#252525] py-1 text-[12px] shadow-lg focus:outline-none'>
        <div className="px-1 py-1 ">
          {items.map(it =>
            <Menu.Item key={it}>
              {({ active }) => (
                <div
                  onClick={onClickMenu(it)}
                  className={clsx('cursor-pointer px-3 py-1.5', active ? 'bg-[#304766] text-white' : 'text-[#dcdcdc]')}
                >{it}</div>
              )}
            </Menu.Item>
          )}
        </div>
      </Menu.Items>
    </Transition>
  </Menu>
}

export default DropDown;
