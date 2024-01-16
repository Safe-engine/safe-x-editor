'use client'

import { useEffect, useRef } from 'react'

export default function SceneView() {
  const divRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Create the application
  }, [divRef])

  // Necessary because we will have to use Greet as a component later.
  return <div ref={divRef} className='flex justify-center'>
    <iframe className='h-screen m-auto' src='http://localhost:1234' />
  </div>
}
