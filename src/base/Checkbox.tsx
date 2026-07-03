import React, { ChangeEventHandler } from 'react';

type Props = {
  checked?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  name?: string;
  color?: string;
};

function Checkbox({
  color,
  checked,
  name,
  onChange,
}: Props) {
  return <input
    className='h-3.5 w-3.5 accent-[#6aa7ff]'
    type='checkbox'
    checked={checked}
    onChange={onChange}
  />;
}

export default Checkbox;
