import Checkbox from 'base/Checkbox';
import SelectBox from 'base/SelectBox';
import { propTypesList } from 'helper/constants';
import React from 'react';

type Props = {
  onChangePropData: Function;
  name: string;
  data: any;
};

function PropDisplay({
  data,
  onChangePropData,
  name,
}: Props) {
  const { type, isRequired } = data;

  function onChangeRequired(event) {
    // console.log(event.target.checked)
    onChangePropData(name, { isRequired: event.target.checked });
  }

  function onSelectType(type) {
    onChangePropData(name, { type });
  }

  return <div className='flex w-full border-cool-gray-300 last:border-t border-b p-2' key={name}>
    <div className='text-blue-600 my-auto w-32'>{name}</div>
    <div className='text-green-800 w-28'>
      <SelectBox items={propTypesList}
        selected={type}
        setSelected={onSelectType} />
    </div>
    <div className='my-auto flex'>
      <Checkbox checked={isRequired}
        name='isRequired'
        onChange={onChangeRequired} />
      <div className='ml-1 text-red-500'>isRequired</div>
    </div>
  </div>;
}

export default PropDisplay;
