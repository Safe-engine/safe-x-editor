import tw from 'tailwind-styled-components';
import Input from 'base/Input';
import Button from 'base/Button';
import Checkbox from 'base/Checkbox';
import { useState } from 'react';
import { handleChange, handleCheck } from 'helper/utils';
import { getLibraryComponents, setLibraryComponents } from 'data/AppData';

const TitleLabel = tw.div`text-orange-500 mt-4`;

function LibraryComponents() {
  const [name, setName] = useState('');
  const [from, setFrom] = useState('');
  const [isSubModule, setIsSubModule] = useState(true);

  function onClickAdd() {
    const comps = getLibraryComponents();
    const newComp = { name, from, isSubModule };
    comps.push(newComp);
    setLibraryComponents(comps);
  }

  return <div>
    <TitleLabel>Add Component to Library</TitleLabel>
    <div className='flex'>
      <div>
        <div>Component</div>
        <Input value={name} onChange={handleChange(setName)}></Input>
      </div>
      <div>
        <div>Import from</div>
        <Input value={from} onChange={handleChange(setFrom)}></Input>
      </div>
      <div>
        <div>IsSubModule</div>
        <Checkbox checked={isSubModule} onChange={handleCheck(setIsSubModule)}></Checkbox>
      </div>
      <div>
        <Button onClick={onClickAdd}>Add</Button>
      </div>
    </div>
  </div>;
}

export default LibraryComponents;
