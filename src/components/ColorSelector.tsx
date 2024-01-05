import SelectBox from '../base/SelectBox';
import React, { } from 'react';
import { colorsList, darknessList } from 'helper/constants';

type ColorSelectorProps = {
  value?: string;
  onChange?: Function;
};

function ColorSelector({ value = '', onChange }: ColorSelectorProps) {
  const separated = value.split('-');
  const darkness = separated.pop();
  const color = separated.pop();
  const type = separated.join('-');

  function onSelectColor(selectedColor) {
    onChange(`${type}-${selectedColor}-${darkness}`);
  }

  function onSelectDarkness(selectedDarkness) {
    onChange(`${type}-${color}-${selectedDarkness}`);
  }

  return (
    <div className='flex'>
      <div>Color</div>
      <SelectBox items={colorsList} selected={color} setSelected={onSelectColor} />
      <div>Darkness</div>
      <SelectBox items={darknessList} selected={darkness} setSelected={onSelectDarkness} />
    </div>
  );
}

export default ColorSelector;
