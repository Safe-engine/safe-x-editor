import FormControlLabel from 'base/FormControlLabel';
import Input from 'base/Input';
import Label from 'base/Label';
import React, { memo, useContext } from 'react';
import { updateEditingComponent, updateTextTag } from 'states/app.action';
import { AppContext } from 'states/app.context';
import { selectComponentTree, selectEditingComponent, selectEditingText, selectSelectedFilePath } from 'states/app.selectors';

function NodeProps() {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const text = useSelector(selectEditingText);
  const selectedEditingComponent = useSelector(selectEditingComponent);
  const filePath = useSelector(selectSelectedFilePath);
  const treeData = useSelector(selectComponentTree);

  function onChangeText(event) {
    dispatch(updateTextTag(event.target.value));
  }

  function onChangeProp(type) {
    return function (event) {
      const { value } = event.target
      console.log('onChangeProp', type, value);
      dispatch(updateEditingComponent('node', {
        ...node, [type]: value
      }));
    }
  }

  if (!selectedEditingComponent || !selectedEditingComponent.node) return
  const { node } = selectedEditingComponent

  return (<div className='p-1'>
    <div className='text-orange-600'>[Node]</div>
    <div className='flex'>
      <Label className='my-auto'>Position: </Label>
      <FormControlLabel
        control={(
          <Input value={node.x} onChange={onChangeProp('x')} type='number' style={{ width: 60 }} />
        )}
        label='X: '
      />
      <FormControlLabel
        control={(
          <Input value={node.y} onChange={onChangeProp('y')} type='number' style={{ width: 60 }} />
        )}
        label='Y: '
      />
    </div>

  </div>);
}

export default memo(NodeProps);
