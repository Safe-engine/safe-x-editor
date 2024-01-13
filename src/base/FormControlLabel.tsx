import React, { ReactNode } from 'react';
import Label from './Label';

type Props = {
  label: String;
  control: ReactNode;
}

function FormControlLabel({
  control,
  label,
}: Props) {
  return <Label className="my-auto cursor-pointer flex">
    <span className="ml-1 my-auto">{label}</span>
    {control}
  </Label>
}

export default FormControlLabel;