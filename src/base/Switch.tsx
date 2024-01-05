import React, { FormEventHandler } from 'react';
import { Switch as HLSWitch } from '@headlessui/react'

type Props = {
  checked: boolean;
  onChange: ((checked: boolean) => void) | (FormEventHandler<HTMLButtonElement> & ((checked: boolean) => void));
  name: string;
  color: string;
}

function Switch({
  color,
  checked,
  name,
  onChange,
}: Props) {
  return <HLSWitch
    checked={checked}
    onChange={onChange}
    className={`${checked ? 'bg-teal-900' : 'bg-teal-700'}
          relative inline-flex flex-shrink-0 h-4 w-6 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
  >
    <span className="sr-only">{name}</span>
    <span
      aria-hidden="true"
      className={`${checked ? 'translate-x-2' : 'translate-x-0'}
            pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200`}
    />
  </HLSWitch>
}

export default Switch;