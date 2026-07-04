type Props = {
  src: string
  rect: { x: number; y: number; w: number; h: number }
  naturalSize: { w: number; h: number }
  className?: string
  rotated?: boolean
}
export function Sprite({ src, rect, naturalSize, className = '', rotated = false }: Props) {
  const width = rotated ? rect.h : rect.w
  const height = rotated ? rect.w : rect.h

  return (
    <div className={`relative ${className}`}>
      <div
        className="overflow-hidden"
        style={{
          width,
          height,
        }}
      >
        <div
          className="bg-no-repeat"
          style={{
            width: rect.w,
            height: rect.h,
            backgroundImage: `url(${src})`,
            backgroundPosition: `-${rect.x}px -${rect.y}px`,
            backgroundSize: `${naturalSize.w}px ${naturalSize.h}px`,
            transform: rotated ? `translateY(${rect.w}px) rotate(-90deg)` : undefined,
            transformOrigin: 'top left',
          }}
        />
      </div>
    </div>
  )
}
