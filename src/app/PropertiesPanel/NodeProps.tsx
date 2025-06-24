import { parseVec2, Vec2 } from 'helper/node';
import { Leva, useControls } from 'leva';
import { memo, useEffect } from 'react';
import { updateEditingComponent } from 'states/app.action';
import { useDispatch, useSelector } from 'states/app.context';
import { selectEditingComponent } from 'states/app.selectors';

function NodeProps() {
  const dispatch = useDispatch();
  const selectedEditingComponent = useSelector(selectEditingComponent);
  // console.log('selectedEditingComponent', selectedEditingComponent)
  if (!selectedEditingComponent) return
  const { node = {} } = selectedEditingComponent.props
  const { x, y } = parseVec2(node?.position);

  const [, set] = useControls(() => ({
    position: {
      value: {
        x, y
      },
      label: 'Position',
      joystick: 'invertY',
      step: 1,
      // render: () => showProperties(selectedArmature!, 'position'),
      onChange: (value: { x: number; y: number }) => {
        // console.log('onChangeProp', 'position', value);
        dispatch(updateEditingComponent('props', {
          node: {
            ...node, position: Vec2(value)
          }
        }));
      },
    }
  }))

  useEffect(() => {
    const { node = {} } = selectedEditingComponent.props
    const { x, y } = parseVec2(node?.position);
    // console.log('selectedEditingComponent', 'position', x, y);
    set({ position: { x, y } })
  }, [selectedEditingComponent])

  return (<div className='p-1'>
    <div className='text-orange-600'>[Node]</div>
    <Leva fill titleBar={{ drag: false, title: 'Node' }} />
  </div>);
}

export default memo(NodeProps);
