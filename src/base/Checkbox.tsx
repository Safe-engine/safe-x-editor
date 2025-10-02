import { ChangeEventHandler } from 'react';

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
  return <div className='flex space-x-2'>
    <div className='text-white w-12'>{name}</div>
    <input
      className='w-4 h-4 rounded-xl my-auto'
      type='checkbox'
      checked={checked}
      onChange={onChange}
    />
  </div>


}

export default Checkbox;
