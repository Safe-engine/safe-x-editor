import { useEffect, useRef, useState } from 'react'
import ArrowControl from './ArrowControl'

export default function SceneView() {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const divRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Create the application
  }, [divRef])
  useEffect(() => {
    divRef.current.onmousemove = (event) => {
      const x = event.clientX - divRef.current.getBoundingClientRect().left
      const y = event.clientY - divRef.current.getBoundingClientRect().top
      console.log('Mouse position:', x, y)
      setPosition({ x, y })
    }
  })
  // Necessary because we will have to use Greet as a component later.
  return <div ref={divRef} className='flex justify-center'>
    <iframe className='h-screen m-auto' src='http://localhost:10234' />
    <ArrowControl position={position} />
  </div>
}
