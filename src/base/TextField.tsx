import React, { ChangeEventHandler } from 'react';
import Input from './Input';
import Label from './Label';
import tw from 'tailwind-styled-components';

const Textarea = tw.textarea`rounded-sm`;

const HelperText = tw.div`text-red-600 my-1`;

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
  return <div className="my-1">
    <div className='flex'>
      <span className='m-auto mr-2'>{label}</span>
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