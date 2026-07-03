import React, { ChangeEventHandler } from 'react';
import Input from './Input';
import Label from './Label';
import tw from 'tailwind-styled-components';

const Textarea = tw.textarea`min-h-16 rounded-sm border border-[#111] bg-[#151515] px-2 py-1 text-[12px] text-[#e2e2e2] outline-none focus:border-[#4a90e2]`;

const HelperText = tw.div`my-1 text-[11px] text-[#ff6565]`;

type Props = {
  required?: boolean;
  id?: String;
  label: String;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  variant?: String;
  helperText?: String;
  fullWidth?: boolean;
  multiline?: boolean;
  rowsMax?: number;
}

function TextField({
  required,
  id,
  label,
  value,
  helperText,
  onChange,
  variant,
  fullWidth,
  multiline,
  rowsMax,
}: Props) {
  return <div className="my-1 text-[#dcdcdc]">
    <div className='flex items-center'>
      <span className='mr-2 w-24 truncate text-[12px] text-[#c8c8c8]'>{label}</span>
      {multiline ?
        <Textarea className="mt-1"
          rows={rowsMax}
        // placeholder="Enter some long form content."
        />
        :
        <Input
          className="mt-1"
          type="text"
          value={value}
          onChange={onChange}
        />
      }
    </div>
    {
      helperText &&
      <HelperText>{helperText}</HelperText>
    }
  </div>
}

export default TextField;
