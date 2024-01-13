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
    <Menu.Button className='border border-green-800 bg-green-600 py-1 px-2 rounded-md'>
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
      <Menu.Items className='absolute right-0 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none'>
        <div className="px-1 py-1 ">
          {items.map(it =>
            <Menu.Item key={it}>
              {({ active }) => (
                <div
                  onClick={onClickMenu(it)}
                  className={clsx('cursor-pointer', active ? 'bg-violet-500 text-white' : 'text-gray-900')}
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
