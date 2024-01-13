import FormControlLabel from 'base/FormControlLabel';
import Input from 'base/Input';
import Label from 'base/Label';
import React, { memo, useContext } from 'react';
import { updateTextTag } from 'states/app.action';
import { AppContext } from 'states/app.context';
import { selectEditingText } from 'states/app.selectors';

function NodeProps() {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const text = useSelector(selectEditingText);

  function onChangeText(event) {
    dispatch(updateTextTag(event.target.value));
  }

  return (<div className='p-1'>
    <div className='text-orange-600'>[Node]</div>
    <div className='flex'>
      <Label className='my-auto'>Position: </Label>
      <FormControlLabel
        control={(
          <Input type='number' style={{ width: 60 }} />
        )}
        label='X: '
      />
      <FormControlLabel
        control={(
          <Input type='number' style={{ width: 60 }} />
        )}
        label='Y: '
      />
    </div>

  </div>);
}

export default memo(NodeProps);
