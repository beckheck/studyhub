import React from 'react'

interface ContextMenuProps {
  show: boolean
  position: { x: number; y: number }
  menuRef: React.RefObject<HTMLDivElement>
  children: React.ReactNode
}

export function ContextMenu({ show, position, menuRef, children }: ContextMenuProps) {
  if (!show) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-zinc-800 shadow-lg rounded-lg p-3 w-44"
      style={{
        top: `${position.y + 20}px`,
        left: `${position.x}px`,
      }}
    >
      {children}
    </div>
  )
}

interface ContextMenuItemProps {
  onClick: () => void
  variant?: 'default' | 'destructive'
  children: React.ReactNode
}

export function ContextMenuItem({ onClick, variant = 'default', children }: ContextMenuItemProps) {
  const baseClasses = 'w-full text-left px-3 py-2 text-sm rounded-md'
  const variantClasses =
    variant === 'destructive'
      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
      : 'hover:bg-gray-100 dark:hover:bg-zinc-700'

  return (
    <button className={`${baseClasses} ${variantClasses} ${variant === 'destructive' ? '' : 'mb-1'}`} onClick={onClick}>
      {children}
    </button>
  )
}
