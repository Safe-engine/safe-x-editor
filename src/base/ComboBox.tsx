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
        <div className="text-[12px] text-[#c8c8c8]">
          {title}
        </div>
        <div className="relative w-full cursor-default overflow-hidden rounded-sm border border-[#111] bg-[#151515] text-left shadow-inner focus:outline-none focus-visible:border-[#4a90e2]">
          <Combobox.Input
            className="h-7 w-full border-none bg-transparent py-1 pl-2 pr-8 text-[12px] leading-5 text-[#e2e2e2] outline-none focus:ring-0"
            onChange={onChangeInput}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <TbSelector
              className="w-4 h-4 text-[#8f8f8f]"
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
          <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-sm border border-[#111] bg-[#252525] py-1 text-[12px] text-[#dcdcdc] shadow-lg focus:outline-none">
            {filteredItems.length === 0 && query !== '' && onCreateNew ? (
              <div className="relative cursor-pointer select-none px-3 py-1.5 text-[#dcdcdc] hover:bg-[#304766]" onClick={onClickNew}>
                Create New
              </div>
            ) : (
              filteredItems.map((item) => (
                <Combobox.Option
                  key={item}
                  className={({ active }) =>
                    `cursor-default select-none relative py-1.5 pl-8 pr-3 ${active ? 'bg-[#304766] text-white' : 'text-[#dcdcdc]'
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
                          className={`absolute inset-y-0 left-0 flex items-center pl-2 ${active ? 'text-white' : 'text-[#9fb7ff]'
                            }`}
                        >
                          <IoMdCheckmark className="w-4 h-4" aria-hidden="true" />
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
