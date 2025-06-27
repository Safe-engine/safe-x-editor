import { Leva, useControls } from 'leva';
import { memo, useEffect } from 'react';
import { parseVec2, Vec2 } from '../../helper/node';
import { updateEditingComponent } from '../../states/app.action';
import { useDispatch, useSelector } from '../../states/app.context';
import { selectSelectedNode } from '../../states/app.selectors';

function NodeProps() {
  const dispatch = useDispatch();
  const selectedNode = useSelector(selectSelectedNode);
  // console.log('selectedEditingComponent', selectedEditingComponent)
  if (!selectedNode.props) return
  const { node = {} } = selectedNode.props
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
    if (!selectedNode.props) return
    const { node = {} } = selectedNode.props
    const { x, y } = parseVec2(node?.position);
    // console.log('selectedNode', 'position', x, y);
    set({ position: { x, y } })
  }, [selectedNode])

  return (<div className='p-1'>
    <div className='text-orange-600'>[Node]</div>
    <Leva fill titleBar={{ drag: false, title: 'Node' }} />
  </div>);
}

export default memo(NodeProps);
