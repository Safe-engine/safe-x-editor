import { Leva, useControls } from 'leva';
import { memo, useEffect } from 'react';
import { getNodePosition, Vec2 } from '../../helper/node';
import { updateEditingComponent } from '../../states/app.action';
import { useDispatch, useSelector } from '../../states/app.context';
import { selectSelectedNode } from '../../states/app.selectors';

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
    },
    scale: {
      value: 1,
      label: 'Scale',
      step: 0.1,
      onChange: (value: { x: number; y: number }) => {
        if (!selectedNode.props) return
        const { node = {} } = selectedNode.props
        dispatch(updateEditingComponent('props', {
          node: {
            ...node, scale: value
          }
        }));
      }
    },
    rotation: {
      value: 1,
      label: 'Rotation',
      step: 0.1,
      onChange: (value: { x: number; y: number }) => {
        if (!selectedNode.props) return
        const { node = {} } = selectedNode.props
        dispatch(updateEditingComponent('props', {
          node: {
            ...node, rotation: value
          }
        }));
      }
    }
  }))

  useEffect(() => {
    if (!selectedNode.props) return
    const { node = {} } = selectedNode.props
    const { x, y } = getNodePosition(node);
    // console.log('selectedNode', 'position', x, y);
    set({ position: { x, y } })
    const { scaleX = 1, scaleY = 1, scale = 1, rotation = 0 } = selectedNode.props.node || {};
    if (scale !== 1) {
      set({ scale });
    }
    if (rotation !== 0) {
      set({ rotation });
    }
  }, [selectedNode])

  return (<div className='p-1'>
    <div className='text-orange-600'>[Node]</div>
    <Leva fill titleBar={{ drag: false, title: 'Node' }} />
  </div>);
}

export default memo(NodeProps);
