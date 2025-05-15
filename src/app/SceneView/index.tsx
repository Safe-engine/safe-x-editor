import { useContext, useEffect, useRef, useState } from 'react'
import ArrowControl from './ArrowControl'
import { selectComponentTree, selectEditingComponent, selectSelectedEditingPath } from 'states/app.selectors';
import { AppContext } from 'states/app.context';
import { updateEditingComponent } from 'states/app.action';
import { onStart } from './cocos';

const filePath = "/Users/antn/Documents/axmol/kingdom-defense/res/Texture/building/farm.png";
export default function SceneView() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const selectedEditingComponent = useSelector(selectComponentTree);
  const divRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const treeData = useSelector(selectSelectedEditingPath);
  const [positionStart, setPositionStart] = useState({ x: 0, y: 0 })
  useEffect(() => {
    cc.game.run({
      "debugMode": 1,
      "showFPS": false,
      "frameRate": 60,
      "id": "gameCanvas",
      "renderMode": 1
    }, onStart)
  }, [])
  useEffect(() => {
    console.log('SceneView isEditing', isEditing, treeData, selectedEditingComponent)
    if (cc.director.getRunningScene()) {
      cc.loader.load(`file://${filePath}`, function (err, font) {
        if (err) {
          cc.log("Failed to load file:", filePath, err);
          return;
        }
        console.log('font:', font[0]);
        var label = new cc.Sprite(font[0]);
        label.setPosition(cc.winSize.width / 4, cc.winSize.height / 4);
        cc.director.getRunningScene().addChild(label);
      });
    }
  }, [selectedEditingComponent]);

  function onMouseUp() {
    setIsEditing(false)
  }
  function onMouseDown(event) {
    setIsEditing(true)
    setPositionStart({ x: event.clientX, y: event.clientY })
  }
  function onMouseMove(event) {
    const x = event.clientX - divRef.current.getBoundingClientRect().left
    const y = event.clientY - divRef.current.getBoundingClientRect().top
    // console.log('Mouse move:', positionStart, isEditing)
    setPosition({ x, y })
    if (!selectedEditingComponent || !isEditing) return
    const { node = {} } = selectedEditingComponent.props
    const { x: nx = 0, y: ny = 0 } = node
    dispatch(updateEditingComponent('props', {
      node: {
        ...node,
        x: nx + event.clientX - positionStart.x,
        y: ny + event.clientY - positionStart.y,
      }
    }));
  }
  // Necessary because we will have to use Greet as a component later.
  return <div ref={divRef}
    onMouseUp={onMouseUp}
    onMouseDown={onMouseDown}
    onMouseMove={onMouseMove}
    className='flex h-screen justify-center select-none w-full' style={{ width: '40vw', height: '100vh' }}>
    {/* <iframe className='w-full' style={{ height: '50vh' }} src='http://localhost:10234' /> */}
    <canvas id='gameCanvas' className='w-full h-full' />
    {/* <ArrowControl position={position} /> */}
  </div>
}
