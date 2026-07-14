import React, { useEffect, useRef } from "react"

type ContextMenuProps = {
  x: number
  y: number
  width?: number
  visible: boolean
  onClose: () => void
  actions: { label: string; icon?: React.ReactNode; onClick: () => void }[]
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  width,
  visible,
  onClose,
  actions,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // Bắt sự kiện click ra ngoài vùng menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (visible) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-40 rounded-sm border border-[#111] bg-[#252525] py-1 text-[12px] text-[#dcdcdc] shadow-lg"
      style={{ top: y, left: x, width }}
    >
      {actions.map((action, i) => (
        <div
          key={i}
          className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-[#304766] hover:text-[#ffffff]"
          onClick={(e) => {
            e.stopPropagation()
            action.onClick()
            onClose()
          }}
        >
          {action.icon}
          <span>{action.label}</span>
        </div>
      ))}
    </div>
  )
}
