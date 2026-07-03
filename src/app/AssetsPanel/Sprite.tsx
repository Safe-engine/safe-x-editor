type Props = {
  src: string
  rect: { x: number; y: number; w: number; h: number }
  naturalSize: { w: number; h: number }
  className?: string
}
export function Sprite({ src, rect, naturalSize, className = '' }: Props) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="bg-no-repeat"
        style={{
          // scale: 24 / rect.h,
          width: rect.w,
          height: rect.h,
          backgroundImage: `url(${src})`,
          backgroundPosition: `-${rect.x}px -${rect.y}px`,
          backgroundSize: `${naturalSize.w}px ${naturalSize.h}px`,
          // transform: `translate(-${rect.x}px, -${rect.y}px)`,
          // translate: '-20px -24px',
        }}
      />
    </div>
  )
}
