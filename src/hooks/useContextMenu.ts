import React, { useEffect, useRef, useState } from 'react'

interface Position {
  x: number
  y: number
}

export function useContextMenu<T = any>() {
  const [showMenu, setShowMenu] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [selectedItem, setSelectedItem] = useState<T | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Handle clicks outside the menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Show context menu at click position
  const showContextMenu = (item: T, e: React.MouseEvent<HTMLElement> | MouseEvent) => {
    e.stopPropagation()
    setSelectedItem(item)

    const target = e.currentTarget || e.target
    const rect = (target as HTMLElement).getBoundingClientRect()
    setPosition({
      x: rect.left,
      y: rect.top,
    })

    setShowMenu(true)
  }

  const hideMenu = () => {
    setShowMenu(false)
    setSelectedItem(null)
  }

  return {
    showMenu,
    position,
    selectedItem,
    menuRef,
    showContextMenu,
    hideMenu,
  }
}
