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
  return <Label className="mx-1 my-auto cursor-pointer">
    {control}
    <span className="ml-2 my-auto">{label}</span>
  </Label>
}

export default FormControlLabel;