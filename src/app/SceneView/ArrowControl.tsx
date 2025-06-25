
export default function ArrowControl({ position }) {
  return <div className='absolute w-svw h-svh' style={{ left: position.x - 20, top: position.y - 80 }}>
    <svg className='absolute' style={{ left: -66, top: 66 }} xmlns="http://www.w3.org/2000/svg" width="185" height="85" viewBox="0 0 40 85" fill="none">
      <path d="M20 0L40 30H26L22 85H20L15 30H0L20 0Z" fill="#00FF00" transform='rotate(90,50, 50)' />
    </svg>
    <svg className='absolute' xmlns="http://www.w3.org/2000/svg" width="40" height="85" viewBox="0 0 40 85" fill="none">
      <path d="M20 0L40 30H26L22 85H20L15 30H0L20 0Z" fill="#FF0000" />
    </svg>
    <svg className='absolute' style={{ left: 6, top: 66 }} width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" fill="#FFF951" opacity={0.8} />
    </svg>
  </div>
}
