import { memo, useEffect, useState } from 'react';
import { FaLink, FaUnlink } from "react-icons/fa";
import NumberInput from '../../base/NumberInput';
import { getNodePosition } from '../../helper/node';
import { useActions, useSelector } from '../../states/app.context';
import { selectSelectedNodes } from '../../states/app.selectors';

function NodeProps() {
  const { updateEditingComponent } = useActions();
  const selectedNodes = useSelector(selectSelectedNodes);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [w, setW] = useState(100);
  const [h, setH] = useState(100);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [rotation, setRotation] = useState(0);


  // link states
  const [whLinked, setWhLinked] = useState(false);
  const [scaleLinked, setScaleLinked] = useState(true);
  // console.log('selectedEditingComponent', selectedEditingComponent)
  // if (!selectedNode?.props) return
  // const { node = {} } = selectedNode.props
  // let { x, y } = parseVec2(node?.position);
  // if (node?.xy) {
  //   x = node.xy[0];
  //   y = node.xy[1];
  // }
  // const [, set] = useControls(() => ({
  //   position: {
  //     value: {
  //       x: 0, y: 0
  //     },
  //     label: 'Position',
  //     joystick: 'invertY',
  //     step: 1,
  //     // render: () => showProperties(selectedArmature!, 'position'),
  //     onChange: (value: { x: number; y: number }) => {
  //       // console.log('onChange', 'selectedNode', selectedNode);
  //       if (!selectedNode?.props) return
  //       const { node = {} } = selectedNode.props
  //       // console.log('onChangeProp', 'position', value);
  //       if (node?.position) {
  //         updateEditingComponent('props', {
  //           node: {
  //             ...node, position: Vec2(value)
  //           }
  //         });
  //       } else {
  //         const { x, y } = value
  //         updateEditingComponent('props', {
  //           node: {
  //             ...node, xy: [x, y]
  //           }
  //         });
  //       }
  //     },
  //   },
  //   scale: {
  //     value: 1,
  //     label: 'Scale',
  //     step: 0.1,
  //     onChange: (value: { x: number; y: number }) => {
  //       if (!selectedNode?.props) return
  //       const { node = {} } = selectedNode.props
  //       updateEditingComponent('props', {
  //         node: {
  //           ...node, scale: value
  //         }
  //       });
  //     }
  //   },
  //   rotation: {
  //     value: 1,
  //     label: 'Rotation',
  //     step: 0.1,
  //     onChange: (value: { x: number; y: number }) => {
  //       if (!selectedNode?.props) return
  //       const { node = {} } = selectedNode.props
  //       updateEditingComponent('props', {
  //         node: {
  //           ...node, rotation: value
  //         }
  //       });
  //     }
  //   }
  // }))

  useEffect(() => {
    if (!selectedNodes[0]?.props) return
    const { node = {} } = selectedNodes[0].props
    const { x, y } = getNodePosition(node);
    console.log('selectedNode', 'position', x, y);
    setX(x)
    setY(y)
    const { scaleX = 1, scaleY = 1, scale = 1, rotation = 0, w, h } = node || {};
    if (scale !== 1) {
      scaleX(scale);
      scaleY(scale);
    }
    if (rotation !== 0) {
      setRotation(rotation);
    }
    if (w) {
      setW(w)
    }
    if (h) {
      setH(h)
    }
  }, [selectedNodes])

  return (<div className='p-1'>
    <div className='text-orange-600'>[Node]</div>
    <div className="w-full max-w-md p-4 bg-gray-700 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-3">Node Properties</h3>
      {/* X / Y row */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <NumberInput label="X" value={x} onChange={(v) => setX(Number(v))} />
        </div>
        <div className="flex-1">
          <NumberInput label="Y" value={y} onChange={(v) => setY(Number(v))} />
        </div>
      </div>
      {/* W / H row with link icon */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <NumberInput label="Width" value={w} onChange={setW} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWhLinked((s) => !s)}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-pressed={whLinked}
            title={whLinked ? 'Unlink width/height' : 'Link width/height'}
          >
            {whLinked ? <FaLink /> : <FaUnlink />}
          </button>
        </div>
        <div className="flex-1">
          <NumberInput label={whLinked ? "Height (linked)" : "Height"} value={h} onChange={setH} />
        </div>
      </div>
      {/* ScaleX / ScaleY row with switch */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <NumberInput label="Scale X" value={scaleX} onChange={setScaleX} step={0.01} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 mb-1">Link</span>
            {/* switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={scaleLinked}
                onChange={(e) => setScaleLinked(e.target.checked)}
                aria-label="Link scale X/Y"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${scaleLinked ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
              <div
                className={`dot absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${scaleLinked ? 'translate-x-5' : 'translate-x-0'}`}
              ></div>
            </label>
          </div>
        </div>
        <div className="flex-1">
          <NumberInput label={scaleLinked ? "Scale Y (linked)" : "Scale Y"} value={scaleY} onChange={setScaleY} step={0.01} />
        </div>
      </div>
      {/* Rotation row */}
      <div className="mb-1">
        <NumberInput label="Rotation (deg)" value={rotation} onChange={(v) => setRotation(Number(v))} step={1} />
      </div>
      {/* preview / summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
        <div className="flex justify-between">
          <span>Position</span>
          <span>{`(${x}, ${y})`}</span>
        </div>
        <div className="flex justify-between">
          <span>Size</span>
          <span>{`${w} × ${h}`}</span>
        </div>
        <div className="flex justify-between">
          <span>Scale</span>
          <span>{`${scaleX} × ${scaleY}`}</span>
        </div>
        <div className="flex justify-between">
          <span>Rotation</span>
          <span>{rotation}°</span>
        </div>
      </div>
    </div>
  </div>);
}

export default memo(NodeProps);
