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
    className='w-4 h-4 rounded-xl'
    type='checkbox'
    checked={checked}
    onChange={onChange}
  />;
}

export default Checkbox;
