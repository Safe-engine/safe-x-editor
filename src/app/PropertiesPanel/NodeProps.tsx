import { getNodePosition, Vec2 } from 'helper/node';
import { Leva, useControls } from 'leva';
import { memo, useEffect } from 'react';
import { updateEditingComponent } from 'states/app.action';
import { useDispatch, useSelector } from 'states/app.context';
import { selectSelectedNode } from 'states/app.selectors';

function NodeProps() {
  const dispatch = useDispatch();
  const selectedNode = useSelector(selectSelectedNode);
  // console.log('selectedEditingComponent', selectedEditingComponent)
  // if (!selectedNode.props) return
  // const { node = {} } = selectedNode.props
  // let { x, y } = parseVec2(node?.position);
  // if (node?.xy) {
  //   x = node.xy[0];
  //   y = node.xy[1];
  // }
  const [, set] = useControls(() => ({
    position: {
      value: {
        x: 0, y: 0
      },
      label: 'Position',
      joystick: 'invertY',
      step: 1,
      // render: () => showProperties(selectedArmature!, 'position'),
      onChange: (value: { x: number; y: number }) => {
        // console.log('onChange', 'selectedNode', selectedNode);
        if (!selectedNode.props) return
        const { node = {} } = selectedNode.props
        // console.log('onChangeProp', 'position', value);
        if (node?.position) {
          dispatch(updateEditingComponent('props', {
            node: {
              ...node, position: Vec2(value)
            }
          }));
        } else {
          const { x, y } = value
          dispatch(updateEditingComponent('props', {
            node: {
              ...node, xy: [x, y]
            }
          }));
        }
      },
    }
  }))

  useEffect(() => {
    if (!selectedNode.props) return
    const { node = {} } = selectedNode.props
    const { x, y } = getNodePosition(node);
    // console.log('selectedNode', 'position', x, y);
    set({ position: { x, y } })
  }, [selectedNode])

  return (<div className='p-1'>
    <div className='text-orange-600'>[Node]</div>
    <Leva fill titleBar={{ drag: false, title: 'Node' }} />
  </div>);
}

export default memo(NodeProps);
