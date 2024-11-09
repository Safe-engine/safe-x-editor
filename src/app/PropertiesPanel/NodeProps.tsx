import FormControlLabel from 'base/FormControlLabel';
import Input from 'base/Input';
import Label from 'base/Label';
import { memo, useContext } from 'react';
import { genComponent, updateEditingComponent } from 'states/app.action';
import { AppContext } from 'states/app.context';
import { selectComponentTree, selectEditingComponent, selectRootFolder } from 'states/app.selectors';
import pathUtils from 'path-browserify';

function NodeProps() {
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const selectedEditingComponent = useSelector(selectEditingComponent);
  const treeData = useSelector(selectComponentTree);
  const rootProject = useSelector(selectRootFolder);

  function onChangeProp(type) {
    return function (event) {
      const { value } = event.target
      console.log('onChangeProp', type, value);
      dispatch(updateEditingComponent('props', {
        node: {
          ...node, [type]: value
        }
      }));
      const editorSceneFile = pathUtils.join(rootProject, 'src', '.safex', 'EditingScene.tsx')
      dispatch(genComponent(treeData[0], editorSceneFile, 'tailwind'));
    }
  }

  if (!selectedEditingComponent) return
  const { node = {} } = selectedEditingComponent.props
  const { x = 0, y = 0 } = node
  return (<div className='p-1'>
    <div className='text-orange-600'>[Node]</div>
    <div className='flex'>
      <Label className='my-auto'>Position: </Label>
      <FormControlLabel
        control={(
          <Input value={x} onChange={onChangeProp('x')} type='number' style={{ width: 60 }} />
        )}
        label='X: '
      />
      <FormControlLabel
        control={(
          <Input value={y} onChange={onChangeProp('y')} type='number' style={{ width: 60 }} />
        )}
        label='Y: '
      />
    </div>
  </div>);
}

export default memo(NodeProps);
