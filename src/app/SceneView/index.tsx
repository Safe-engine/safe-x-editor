import { useContext, useEffect, useRef, useState } from 'react'
import ArrowControl from './ArrowControl'
import { selectEditingComponent } from 'states/app.selectors';
import { AppContext } from 'states/app.context';
import { updateEditingComponent } from 'states/app.action';

export default function SceneView() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const { appDispatch: dispatch, useSelector } = useContext(AppContext);
  const selectedEditingComponent = useSelector(selectEditingComponent);
  const divRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [positionStart, setPositionStart] = useState({ x: 0, y: 0 })

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
    className='flex h-screen justify-center select-none'>
    <iframe className='w-full' style={{ height: '50vh' }} src='http://localhost:10234' />
    <ArrowControl position={position} />
  </div>
}
