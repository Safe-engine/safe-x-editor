import { Listbox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { IoMdCheckmark } from "react-icons/io";
import { LuChevronDown } from "react-icons/lu";

type Props = {
  selected: any;
  items: Array<any>;
  setSelected?: any;
}

function SelectBox({ items, selected, setSelected }: Props) {

  return (
    <Listbox value={selected} onChange={setSelected}>
      <div className="relative mx-1">
        <Listbox.Button className="relative h-7 w-full cursor-default rounded-sm border border-[#111] bg-[#151515] py-1 pl-2 pr-8 text-left text-[12px] text-[#e2e2e2] shadow-inner focus:outline-none focus-visible:border-[#4a90e2]">
          <span className="block truncate">{selected}</span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <LuChevronDown
              className="w-4 h-4 text-[#8f8f8f]"
              aria-hidden="true"
            />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-20 mt-1 max-h-64 overflow-auto rounded-sm border border-[#111] bg-[#252525] py-1 text-[12px] text-[#dcdcdc] shadow-lg focus:outline-none">
            {items.map((person, personIdx) => (
              <Listbox.Option
                key={personIdx}
                className={({ active }) =>
                  `${active ? 'bg-[#304766] text-[#ffffff]' : 'text-[#dcdcdc]'}
                          cursor-default select-none relative py-1.5 pl-8 pr-3`
                }
                value={person}
              >
                {({ selected, active }) => (
                  <>
                    <span
                      className={`${selected ? 'font-medium' : 'font-normal'
                        } block truncate`}
                    >
                      {person}
                    </span>
                    {selected ? (
                      <span
                        className={`${active ? 'text-[#ffffff]' : 'text-[#9fb7ff]'
                          }
                                absolute inset-y-0 left-0 flex items-center pl-2`}
                      >
                        <IoMdCheckmark className="w-4 h-4" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

export default SelectBox;
