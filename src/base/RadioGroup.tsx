import React, { ChangeEventHandler, ReactNode } from 'react';
import Radio from './Radio';

type Props = {
  options: string[];
  className?: string;
  name: string;
  fullWidth?: boolean;
  setValue: (string) => void;
  value: string;
}

const RadioGroup = ({
  options, className, name, fullWidth,
  value, setValue
}: Props) => {

  function onChangeChecked(checked = '') {
    setValue(checked.toLowerCase());
  }

  return (
    <div className="p-2">
      {options.map(opt => <Radio
        key={opt}
        name={name}
        checked={opt === value}
        onChange={() => onChangeChecked(opt)}
        label={opt}
      />)}
    </div>
  );
};

export default RadioGroup;
