import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { TabsList } from '@/components/ui/tabs'
import { handleNavigationClick } from '@/lib/navigation-utils'
import { AppTab } from '@/types'
import { MoreHorizontal } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

interface OverflowTabsProps {
  tabs: AppTab[]
  activeTab: string
  onTabChange: (value: string) => void
  className?: string
  style?: React.CSSProperties
}

export default function OverflowTabs({ tabs, activeTab, onTabChange, className, style }: OverflowTabsProps) {
  const [visibleTabs, setVisibleTabs] = useState<AppTab[]>(tabs)
  const [overflowTabs, setOverflowTabs] = useState<AppTab[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const outerContainerRef = useRef<HTMLDivElement>(null)
  const tabsListRef = useRef<HTMLDivElement>(null)
  const measurementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkOverflow = () => {
      if (!outerContainerRef.current || !measurementRef.current) {
        return
      }

      // Use the outer container (parent) for width measurement, not the tabs container
      const outerContainer = outerContainerRef.current
      const availableWidth = outerContainer.offsetWidth

      if (availableWidth === 0) {
        setTimeout(checkOverflow, 100)
        return
      }

      // Measure all tabs using the hidden measurement container
      const measurementTabs = measurementRef.current.children
      if (measurementTabs.length === 0) {
        setTimeout(checkOverflow, 100)
        return
      }

      const dropdownWidth = 56 // Width of dropdown button
      const tabsListPadding = 24 // Padding from TabsList
      const gap = 8 // Gap between tabs

      // Calculate width of all tabs
      let totalTabsWidth = tabsListPadding
      const tabWidths: number[] = []

      for (let i = 0; i < measurementTabs.length; i++) {
        const tabElement = measurementTabs[i] as HTMLElement
        const tabWidth = tabElement.offsetWidth
        tabWidths.push(tabWidth)
        totalTabsWidth += tabWidth
        if (i > 0) totalTabsWidth += gap
      }

      // Check if all tabs fit without dropdown
      if (totalTabsWidth <= availableWidth) {
        setVisibleTabs(tabs)
        setOverflowTabs([])
        return
      }

      // Calculate how many tabs fit with dropdown (dropdown is now inside TabsList)
      const availableWidthWithDropdown = availableWidth - dropdownWidth
      let usedWidth = tabsListPadding
      let visibleCount = 0

      for (let i = 0; i < tabWidths.length; i++) {
        const nextWidth = usedWidth + tabWidths[i] + (i > 0 ? gap : 0)

        if (nextWidth <= availableWidthWithDropdown) {
          usedWidth = nextWidth
          visibleCount++
        } else {
          break
        }
      }

      // Ensure at least one tab is visible
      visibleCount = Math.max(1, visibleCount)

      setVisibleTabs(tabs.slice(0, visibleCount))
      setOverflowTabs(tabs.slice(visibleCount))
    }

    // Initial check after render
    checkOverflow() // Run immediately
    const timeoutId = setTimeout(checkOverflow, 0) // Fallback

    // Resize handler
    const handleResize = () => {
      setTimeout(checkOverflow, 100)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
    }
  }, [tabs])

  return (
    <>
      {/* Hidden measurement container - always renders all tabs for measurement */}
      <div
        ref={measurementRef}
        className="fixed invisible pointer-events-none flex gap-2"
        style={{ top: '-9999px', left: '-9999px' }}
        aria-hidden="true"
      >
        {tabs.map(({ value, label, icon: Icon }) => (
          <div
            key={`measure-${value}`}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-1.5 text-sm font-medium"
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </div>
        ))}
      </div>

      {/* Outer container that maintains consistent width */}
      <div ref={outerContainerRef} className="w-full">
        {/* Inner tabs container - centered */}
        <div className="flex items-center justify-center gap-2">
          <TabsList ref={tabsListRef} className={className} style={style}>
            {visibleTabs.map(({ value, label, icon: Icon }) => (
              <a
                key={value}
                href={`#${value}`}
                onClick={e => handleNavigationClick(e, () => onTabChange(value))}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-0.5 text-sm font-medium transition-all duration-200 no-underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-white/30 ${
                  activeTab === value
                    ? 'bg-white/75 dark:bg-white/20 text-zinc-900 dark:text-zinc-100 shadow-lg scale-105 font-semibold border border-white/40'
                    : 'hover:bg-white/60 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Icon className={`w-4 h-4 mr-2 ${activeTab === value ? 'text-current' : ''}`} />
                {label}
              </a>
            ))}

            {overflowTabs.length > 0 && (
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1 rounded-xl bg-white/70 dark:bg-white/10 backdrop-blur hover:bg-white/80 dark:hover:bg-white/20 transition-colors shadow-lg"
                    style={{
                      transform: 'translateY(-2px)',
                    }}
                    aria-label="More tabs"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-white/20 dark:border-white/10"
                >
                  {overflowTabs.map(({ value, label, icon: Icon }) => (
                    <DropdownMenuItem key={value} asChild>
                      <a
                        href={`#${value}`}
                        onClick={e => handleNavigationClick(e, () => onTabChange(value))}
                        className={`flex items-center gap-2 px-2 py-1.5 transition-all duration-200 no-underline cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/30 rounded ${
                          activeTab === value
                            ? 'bg-white/75 dark:bg-white/20 text-zinc-900 dark:text-zinc-100 shadow-lg scale-105 font-semibold border border-white/40'
                            : 'hover:bg-white/50 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300'
                        }`}
                        style={{
                          transform: activeTab === value ? 'scale(1.02)' : 'scale(1)',
                          boxShadow:
                            activeTab === value
                              ? '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 1px hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.3)'
                              : undefined,
                        }}
                      >
                        <Icon className={`w-4 h-4 ${activeTab === value ? 'text-current' : ''}`} />
                        <span className={activeTab === value ? 'font-semibold' : 'font-medium'}>{label}</span>
                      </a>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </TabsList>
        </div>
      </div>
    </>
  )
}
