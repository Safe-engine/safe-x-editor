
type HistoryEntry = {
  editingComponent: any[]
  editingPaths: string[]
}

type SelectionBounds = {
  left: number
  top: number
  right: number
  bottom: number
}

type MarqueeSelection = {
  startX: number
  startY: number
  currentX: number
  currentY: number
  active: boolean
}

type ResizeHandle = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
