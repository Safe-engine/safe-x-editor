import { useEffect, useRef, useState } from 'react';
import { IoMdCheckmark } from "react-icons/io";
import { LuChevronDown } from "react-icons/lu";

type Props = {
  selected: any;
  items: Array<any>;
  setSelected?: any;
}

function SelectBox({ items, selected, setSelected }: Props) {
  const [isOpen, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  function selectItem(item: any) {
    setSelected?.(item);
    setOpen(false);
  }

  return (
    <div className="relative mx-1" ref={containerRef}>
      <button
        className="relative h-7 w-full cursor-default rounded-sm border border-[#111] bg-[#151515] py-1 pl-2 pr-8 text-left text-[12px] text-[#e2e2e2] shadow-inner focus:outline-none focus-visible:border-[#4a90e2]"
        type="button"
        onClick={() => setOpen((open) => !open)}
      >
        <span className="block truncate">{selected}</span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <LuChevronDown className="h-4 w-4 text-[#8f8f8f]" aria-hidden="true" />
        </span>
      </button>
      {isOpen && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-sm border border-[#111] bg-[#252525] py-1 text-[12px] text-[#dcdcdc] shadow-lg">
          {items.map((item, index) => (
            <button
              className="relative block w-full cursor-default select-none py-1.5 pl-8 pr-3 text-left text-[#dcdcdc] hover:bg-[#304766] hover:text-white"
              key={index}
              type="button"
              onMouseDown={() => selectItem(item)}
            >
              <span className={`block truncate ${selected === item ? 'font-medium' : 'font-normal'}`}>{item}</span>
              {selected === item && (
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[#9fb7ff]">
                  <IoMdCheckmark className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SelectBox;
