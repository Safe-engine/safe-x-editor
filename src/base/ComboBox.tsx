import { Combobox, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { IoMdCheckmark } from "react-icons/io";
import { TbSelector } from "react-icons/tb";

function ComboBox({ title, items, onChange, value, onCreateNew }) {
  const [query, setQuery] = useState('');

  const filteredItems =
    query === ''
      ? items
      : items.filter((item) => {
        return item.toLowerCase().includes(query.toLowerCase())
      })

  function onChangeInput(event) {
    setQuery(event.target.value)
  }

  function onClickNew(event) {
    console.log('onClickNew')
    onCreateNew(query);
  }

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative mt-1">
        <div>
          {title}
        </div>
        <div className="relative w-full text-left bg-white shadow-md cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-opacity-75 focus-visible:ring-white focus-visible:ring-offset-teal-300 focus-visible:ring-offset-2 sm:text-sm overflow-hidden">
          <Combobox.Input
            className="w-full border-none focus:ring-0 py-2 pl-3 pr-10 text-sm leading-5 text-gray-900"
            onChange={onChangeInput}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <TbSelector
              className="w-5 h-5 text-gray-400"
              aria-hidden="true"
            />
          </Combobox.Button>
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery('')}
        >
          <Combobox.Options className="absolute w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filteredItems.length === 0 && query !== '' && onCreateNew ? (
              <div className="cursor-pointer select-none relative py-2 px-4 text-gray-700" onClick={onClickNew}>
                Create New
              </div>
            ) : (
              filteredItems.map((item) => (
                <Combobox.Option
                  key={item}
                  className={({ active }) =>
                    `cursor-default select-none relative py-2 pl-10 pr-4 ${active ? 'text-white bg-teal-600' : 'text-gray-900'
                    }`
                  }
                  value={item}
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={`block truncate ${selected ? 'font-medium' : 'font-normal'
                          }`}
                      >
                        {item}
                      </span>
                      {selected ? (
                        <span
                          className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-teal-600'
                            }`}
                        >
                          <IoMdCheckmark className="w-5 h-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </Transition>
      </div>
    </Combobox>
  );
}

export default ComboBox;
