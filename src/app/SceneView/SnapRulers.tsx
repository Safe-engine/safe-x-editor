import { useEffect, useRef, useState } from 'react'

type Transform = { x: number; y: number; scaleX: number; scaleY: number; logicalWidth: number }
type Axis = 'horizontal' | 'vertical'
type GuideSelection = { axis: Axis; index: number }

const RULER_SIZE = 18
const initialTransform: Transform = { x: 100, y: 10, scaleX: 1, scaleY: 1, logicalWidth: window.innerWidth }

export function SnapRulers({ visible = true }: { visible?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const draggingGuide = useRef<{ axis: Axis; index?: number }>()
  const draftGuideRef = useRef<{ axis: Axis; value: number }>()
  const [transform, setTransform] = useState(initialTransform)
  const [verticalGuides, setVerticalGuides] = useState<number[]>([])
  const [horizontalGuides, setHorizontalGuides] = useState<number[]>([])
  const [draftGuide, setDraftGuide] = useState<{ axis: Axis; value: number }>()
  const [selectedGuide, setSelectedGuide] = useState<GuideSelection>()
  const [canvasRect, setCanvasRect] = useState<DOMRect>()

  const updateCanvasRect = () => {
    setCanvasRect(document.querySelector<HTMLCanvasElement>('#sdl-canvas')?.getBoundingClientRect())
  }

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'snapOverlayTransform') setTransform(event.data.transform)
    }
    window.addEventListener('message', onMessage)
    window.addEventListener('resize', updateCanvasRect)
    const observer = new ResizeObserver(updateCanvasRect)
    const canvas = document.querySelector('#sdl-canvas')
    if (canvas) observer.observe(canvas)
    updateCanvasRect()
    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('resize', updateCanvasRect)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    window.postMessage({ type: 'setSnapGuides', verticalGuides, horizontalGuides }, '*')
  }, [verticalGuides, horizontalGuides])

  const getGuideValue = (axis: Axis, event: PointerEvent | React.PointerEvent) => {
    const rect = document.querySelector<HTMLCanvasElement>('#sdl-canvas')?.getBoundingClientRect()
    if (!rect) return undefined
    const logicalScale = transform.logicalWidth / rect.width
    const position = axis === 'vertical'
      ? (event.clientX - rect.left) * logicalScale
      : (event.clientY - rect.top) * logicalScale
    const offset = axis === 'vertical' ? transform.x : transform.y
    const scale = axis === 'vertical' ? transform.scaleX : transform.scaleY
    return Math.round((position - offset) / scale)
  }

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const guide = draggingGuide.current
      if (!guide) return
      const value = getGuideValue(guide.axis, event)
      if (value === undefined) return
      if (guide.index === undefined) {
        const nextGuide = { axis: guide.axis, value }
        draftGuideRef.current = nextGuide
        setDraftGuide(nextGuide)
      } else if (guide.axis === 'vertical') {
        setVerticalGuides((guides) => guides.map((item, index) => index === guide.index ? value : item))
      } else {
        setHorizontalGuides((guides) => guides.map((item, index) => index === guide.index ? value : item))
      }
    }
    const onPointerUp = () => {
      const guide = draggingGuide.current
      const draft = draftGuideRef.current
      if (guide?.index === undefined && draft) {
        if (draft.axis === 'vertical') setVerticalGuides((guides) => [...guides, draft.value])
        else setHorizontalGuides((guides) => [...guides, draft.value])
        setSelectedGuide({ axis: draft.axis, index: draft.axis === 'vertical' ? verticalGuides.length : horizontalGuides.length })
      }
      draggingGuide.current = undefined
      draftGuideRef.current = undefined
      setDraftGuide(undefined)
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [transform, verticalGuides.length, horizontalGuides.length])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selectedGuide || !['Backspace', 'Delete'].includes(event.key)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (selectedGuide.axis === 'vertical') setVerticalGuides((guides) => guides.filter((_guide, index) => index !== selectedGuide.index))
      else setHorizontalGuides((guides) => guides.filter((_guide, index) => index !== selectedGuide.index))
      setSelectedGuide(undefined)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [selectedGuide])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target?.closest('[data-snap-guide]')) setSelectedGuide(undefined)
    }
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  }, [])

  const toScreenPosition = (axis: Axis, value: number) => {
    if (!canvasRect || !rootRef.current) return -1000
    const rootRect = rootRef.current.getBoundingClientRect()
    const scale = axis === 'vertical' ? transform.scaleX : transform.scaleY
    const offset = axis === 'vertical' ? transform.x : transform.y
    const logicalPosition = offset + value * scale
    const screenPosition = logicalPosition * canvasRect.width / transform.logicalWidth
    return (axis === 'vertical' ? canvasRect.left - rootRect.left : canvasRect.top - rootRect.top)
      + screenPosition
  }

  const getRulerBounds = () => {
    if (!rootRef.current) return { left: 0, top: 0 }
    const rootRect = rootRef.current.getBoundingClientRect()
    return {
      left: canvasRect ? canvasRect.left - rootRect.left : 0,
      top: canvasRect ? canvasRect.top - rootRect.top : 0,
    }
  }

  const getRulerTicks = (axis: Axis) => {
    if (!canvasRect) return []
    const scale = Math.abs(axis === 'vertical' ? transform.scaleX : transform.scaleY)
    const offset = axis === 'vertical' ? transform.x : transform.y
    const visibleSize = axis === 'vertical' ? canvasRect.width : canvasRect.height
    const screenUnits = scale * canvasRect.width / transform.logicalWidth
    const targetStep = 80 / Math.max(screenUnits, 0.001)
    const magnitude = 10 ** Math.floor(Math.log10(targetStep))
    const normalized = targetStep / magnitude
    const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude
    const start = Math.ceil((-offset / scale) / step) * step
    const end = ((visibleSize * transform.logicalWidth / canvasRect.width) - offset) / scale
    const ticks: number[] = []
    for (let value = start; value <= end; value += step) ticks.push(Math.round(value * 1000) / 1000)
    return ticks
  }

  const startGuideDrag = (axis: Axis, event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    draggingGuide.current = { axis }
    const value = getGuideValue(axis, event)
    if (value !== undefined) {
      const guide = { axis, value }
      draftGuideRef.current = guide
      setDraftGuide(guide)
    }
  }

  const startExistingGuideDrag = (axis: Axis, index: number, event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setSelectedGuide({ axis, index })
    draggingGuide.current = { axis, index }
  }

  const guideValues = (axis: Axis) => axis === 'vertical' ? verticalGuides : horizontalGuides
  const displayedGuides = (axis: Axis) => draftGuide?.axis === axis ? [...guideValues(axis), draftGuide.value] : guideValues(axis)
  const rulerBounds = getRulerBounds()

  if (!visible) return null

  return (
    <div ref={rootRef} className='pointer-events-none absolute inset-0 z-20 overflow-hidden'>
      <div className='pointer-events-auto absolute z-10 h-[18px] cursor-row-resize border-b border-[#555] bg-[#2a2a2a]'
        style={{
          top: rulerBounds.top,
          left: rulerBounds.left + RULER_SIZE,
          right: 0,
        }}
        onPointerDown={(event) => startGuideDrag('horizontal', event)}>
        {getRulerTicks('vertical').map((value) => (
          <span key={value} className='pointer-events-none absolute top-0 h-full border-l border-[#777] pl-1 text-[9px] leading-[18px] text-[#bbb]'
            style={{ left: toScreenPosition('vertical', value) - rulerBounds.left - RULER_SIZE }}>
            {value}
          </span>
        ))}
      </div>
      <div className='pointer-events-auto absolute z-10 w-[18px] cursor-col-resize border-r border-[#555] bg-[#2a2a2a]'
        style={{
          top: rulerBounds.top + RULER_SIZE,
          left: rulerBounds.left,
          bottom: 0,
        }}
        onPointerDown={(event) => startGuideDrag('vertical', event)}>
        {getRulerTicks('horizontal').map((value) => (
          <span key={value} className='pointer-events-none absolute left-0 w-full border-t border-[#777] text-center text-[9px] text-[#bbb]'
            style={{ top: toScreenPosition('horizontal', value) - rulerBounds.top - RULER_SIZE }}>
            <span className='block -rotate-90 whitespace-nowrap'>{value}</span>
          </span>
        ))}
      </div>
      <div className='absolute h-[18px] w-[18px] border-b border-r border-[#555] bg-[#333]'
        style={{
          top: rulerBounds.top,
          left: rulerBounds.left,
        }} />
      {displayedGuides('vertical').map((value, index) => (
        <div key={`vertical-${index}-${value}`} className={`pointer-events-auto absolute bottom-0 w-px cursor-ew-resize ${selectedGuide?.axis === 'vertical' && selectedGuide.index === index ? 'bg-[#ffe066]' : 'bg-[#ff4d8d]'}`}
          style={{ left: toScreenPosition('vertical', value), top: rulerBounds.top + RULER_SIZE }}
          data-snap-guide
          onPointerDown={(event) => startExistingGuideDrag('vertical', index, event)}>
          <span className={`absolute left-1 top-1 rounded px-1 text-[10px] text-white ${selectedGuide?.axis === 'vertical' && selectedGuide.index === index ? 'bg-[#c99c00]' : 'bg-[#ff4d8d]'}`}>{value}</span>
        </div>
      ))}
      {displayedGuides('horizontal').map((value, index) => (
        <div key={`horizontal-${index}-${value}`} className={`pointer-events-auto absolute right-0 h-px cursor-ns-resize ${selectedGuide?.axis === 'horizontal' && selectedGuide.index === index ? 'bg-[#ffe066]' : 'bg-[#ff4d8d]'}`}
          style={{ left: rulerBounds.left + RULER_SIZE, top: toScreenPosition('horizontal', value) }}
          data-snap-guide
          onPointerDown={(event) => startExistingGuideDrag('horizontal', index, event)}>
          <span className={`absolute left-1 top-1 rounded px-1 text-[10px] text-white ${selectedGuide?.axis === 'horizontal' && selectedGuide.index === index ? 'bg-[#c99c00]' : 'bg-[#ff4d8d]'}`}>{value}</span>
        </div>
      ))}
    </div>
  )
}
