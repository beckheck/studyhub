import { useSettingsDialogContext } from '@/components/settings/SettingsDialogProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppContext } from '@/contexts/AppContext'
import { SoundtrackPosition } from '@/types'
import { ArrowDownToLine, Maximize, Minimize, Music2, Settings, X } from 'lucide-react'
import React, { RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Global iframe management with better React integration
let globalIframe: HTMLIFrameElement | null = null
let currentEmbed: string | null = null
let componentInstances = new Set<string>() // Track active component instances
let mountCounter = 0 // Generate unique IDs for component instances

// Cleanup function for global iframe
function cleanupGlobalIframe(force: boolean = false): void {
  if ((componentInstances.size === 0 || force) && globalIframe) {
    globalIframe.src = 'about:blank'
    setTimeout(
      () => {
        if (globalIframe) {
          globalIframe.remove()
          globalIframe = null
          currentEmbed = null
        }
      },
      force ? 0 : 50,
    )
  }
}

function createIframeElement(embed: string, title: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe')
  iframe.src = embed
  iframe.className = 'border-0'
  iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
  iframe.loading = 'lazy'
  iframe.title = title
  iframe.frameBorder = '0'
  iframe.style.position = 'fixed'
  iframe.style.display = 'none'
  iframe.style.zIndex = '40'
  return iframe
}

function ensureGlobalIframe(embed: string, title: string): void {
  // Only recreate iframe if embed URL has changed
  if (!globalIframe || currentEmbed !== embed) {
    if (globalIframe && currentEmbed !== embed) {
      globalIframe.remove()
      globalIframe = null
    }

    if (!globalIframe) {
      globalIframe = createIframeElement(embed, title)
      currentEmbed = embed
      document.body.appendChild(globalIframe)
    }
  }
}

function positionIframeForContainer(targetElement: HTMLElement, position: SoundtrackPosition): void {
  if (!globalIframe || !targetElement) return

  const rect = targetElement.getBoundingClientRect()

  // Ensure we have valid dimensions
  if (rect.width === 0 || rect.height === 0) {
    setTimeout(() => positionIframeForContainer(targetElement, position), 10)
    return
  }

  // Check if iframe is already properly positioned to avoid unnecessary updates
  const currentLeft = parseInt(globalIframe.style.left) || 0
  const currentTop = parseInt(globalIframe.style.top) || 0
  const currentWidth = parseInt(globalIframe.style.width) || 0
  const currentHeight = parseInt(globalIframe.style.height) || 0

  const needsReposition =
    Math.abs(currentLeft - rect.left) > 1 ||
    Math.abs(currentTop - rect.top) > 1 ||
    Math.abs(currentWidth - rect.width) > 1 ||
    Math.abs(currentHeight - rect.height) > 1 ||
    globalIframe.style.display === 'none'

  if (!needsReposition) return

  // Apply all styles at once for better performance
  Object.assign(globalIframe.style, {
    display: 'block',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    pointerEvents: position === 'minimized' ? 'none' : 'auto',
    opacity: position === 'minimized' ? '0' : '1',
    borderRadius: position === 'floating' ? '0.75rem' : '1rem',
    zIndex: position === 'floating' ? '51' : '41',
  })

  // Restore the embed URL if it was cleared
  if (globalIframe.src === 'about:blank' && currentEmbed) {
    globalIframe.src = currentEmbed
  }
}

function hideIframe(): void {
  // Only hide if no other instances are active
  if (componentInstances.size !== 0) {
    return
  }
  if (globalIframe) {
    globalIframe.style.display = 'none'
  }
}

function getTargetContainer(
  position: SoundtrackPosition,
  dashboardRef: RefObject<HTMLDivElement | null>,
  floatingRef: RefObject<HTMLDivElement | null>,
): HTMLDivElement | null {
  if (position === 'dashboard' && dashboardRef.current) {
    return dashboardRef.current
  } else if ((position === 'floating' || position === 'minimized') && floatingRef.current) {
    return floatingRef.current
  }
  return null
}

interface SoundtrackCardProps {
  visible: boolean
  embed: string
  position?: SoundtrackPosition
  onPositionChange?: (position: SoundtrackPosition) => void
}

export default function SoundtrackCard({
  visible,
  embed,
  position = 'dashboard',
  onPositionChange,
}: SoundtrackCardProps) {
  const { t } = useTranslation('soundtrack')
  const { openDialog } = useSettingsDialogContext()
  const dashboardContainerRef = useRef<HTMLDivElement>(null)
  const floatingContainerRef = useRef<HTMLDivElement>(null)
  const [componentId] = useState(() => `soundtrack-${++mountCounter}`)

  // Check if component should be active (consolidate visibility checks)
  const isActive = useMemo(() => embed && visible && position !== 'off', [embed, visible, position])

  // Helper function to update iframe position
  const updateIframePosition = useCallback(() => {
    if (!isActive) return

    const targetContainer = getTargetContainer(position, dashboardContainerRef, floatingContainerRef)
    if (targetContainer) {
      requestAnimationFrame(() => {
        positionIframeForContainer(targetContainer, position)
      })
    } else {
      // If no target container is ready, try again after a short delay
      setTimeout(() => {
        const retryContainer = getTargetContainer(position, dashboardContainerRef, floatingContainerRef)
        if (retryContainer) {
          requestAnimationFrame(() => {
            positionIframeForContainer(retryContainer, position)
          })
        }
      }, 10)
    }
  }, [isActive, position])

  // Register this component instance
  useEffect(() => {
    if (isActive) {
      componentInstances.add(componentId)
      return () => {
        componentInstances.delete(componentId)
        // Only hide iframe if this is a dashboard position transition to prevent playback interruption
        // For other cases, let the main cleanup handle it
        if (position === 'dashboard') {
          // Small delay to allow for position transitions
          setTimeout(() => {
            hideIframe()
          }, 10)
        } else {
          // setTimeout(cleanupGlobalIframe, 50);
        }
      }
    } else {
      componentInstances.delete(componentId)
      hideIframe()
      const _cleanupDelay = position === 'off' ? 0 : 50
      if (position === 'off') {
        cleanupGlobalIframe(true)
      }
    }
  }, [isActive, componentId, position])

  // Handle iframe positioning and creation
  useLayoutEffect(() => {
    if (!isActive) {
      hideIframe()
      return
    }

    ensureGlobalIframe(embed, t('accessibility.iframe'))

    // Use a small delay to ensure smooth position transitions
    const positionTimeout = setTimeout(() => {
      updateIframePosition()
    }, 50)

    return () => {
      clearTimeout(positionTimeout)
    }
  }, [isActive, embed, position, t, updateIframePosition])

  // Handle scroll and resize events
  useEffect(() => {
    if (!isActive) return

    const getScrollContainer = (): Element => {
      const extensionContainer = document.querySelector('.extension-container')
      if (extensionContainer && getComputedStyle(extensionContainer).overflowY === 'auto') {
        return extensionContainer
      }
      return window as any
    }

    const scrollContainer = getScrollContainer()
    scrollContainer.addEventListener('scroll', updateIframePosition)
    window.addEventListener('resize', updateIframePosition)
    const timeoutId = setTimeout(updateIframePosition, 500)

    return () => {
      scrollContainer.removeEventListener('scroll', updateIframePosition)
      window.removeEventListener('resize', updateIframePosition)
      clearTimeout(timeoutId)
    }
  }, [isActive, position, updateIframePosition])

  const appContext = useAppContext()

  if (appContext.mode === 'popup') {
    return null
  }

  if (position === 'dashboard' && !embed) {
    return (
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Music2 className="w-5 h-5" />
                {t('title')}
              </CardTitle>
              <CardDescription className="text-sm">{t('description')}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDialog('soundtrack')}
              className="h-6 w-6 p-0 hover:bg-white/20"
              title={t('actions.configure')}
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-zinc-500" dangerouslySetInnerHTML={{ __html: t('empty.message') }} />
        </CardContent>
      </Card>
    )
  }

  // Return null if component should not be rendered
  if (!isActive) {
    return null
  }

  // Reusable components to reduce redundancy
  const ControlButton = (props: React.PropsWithChildren<{ position: SoundtrackPosition; title: string }>) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onPositionChange?.(props.position)}
      className="h-6 w-6 p-0 hover:bg-white/20"
      title={props.title}
    >
      {props.children}
    </Button>
  )

  const SoundtrackTitle = ({ size = 'normal' }: { size?: 'normal' | 'small' }) => (
    <CardTitle className={`flex items-center gap-2 ${size === 'small' ? 'text-sm' : ''}`}>
      <Music2 className={size === 'small' ? 'w-4 h-4' : 'w-5 h-5'} />
      {t('title')}
    </CardTitle>
  )

  // Dashboard position
  if (position === 'dashboard') {
    return (
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <SoundtrackTitle />
              <CardDescription className="text-sm">{t('description')}</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDialog('soundtrack')}
                className="h-6 w-6 p-0 hover:bg-white/20"
                title={t('actions.configure')}
              >
                <Settings className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPositionChange?.('floating')}
                className="h-6 w-6 p-0 hover:bg-white/20"
                title={t('actions.minimizeToFloating')}
              >
                <ArrowDownToLine className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-xl overflow-hidden">
            <div ref={dashboardContainerRef} className="aspect-video bg-black/5" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Floating and Minimized positions
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        position === 'minimized' ? 'w-16 h-16' : 'w-80 h-48'
      }`}
    >
      <Card className="h-full rounded-2xl border-none shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur flex flex-col">
        {position === 'floating' && (
          <CardHeader className="pb-1 pt-2 px-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <SoundtrackTitle size="small" />
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDialog('soundtrack')}
                  className="h-6 w-6 p-0 hover:bg-white/20"
                  title={t('actions.configure')}
                >
                  <Settings className="w-3 h-3" />
                </Button>
                <ControlButton position="minimized" title={t('actions.minimize')}>
                  <Minimize className="w-3 h-3" />
                </ControlButton>
                <ControlButton position="dashboard" title={t('actions.maximizeToDashboard')}>
                  <Maximize className="w-3 h-3" />
                </ControlButton>
                <ControlButton position="off" title={t('actions.close')}>
                  <X className="w-3 h-3" />
                </ControlButton>
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent className={`${position === 'minimized' ? 'p-2' : 'p-2 pt-0'} flex-1 relative min-h-0`}>
          {position === 'minimized' && (
            <Button
              variant="ghost"
              onClick={() => onPositionChange?.('floating')}
              className="w-full h-full p-0 flex items-center justify-center absolute inset-0 z-10"
            >
              <Music2 className="w-6 h-6" />
            </Button>
          )}
          <div
            ref={floatingContainerRef}
            className={`rounded-xl overflow-hidden h-full bg-black/5 ${
              position === 'minimized' ? 'opacity-0 pointer-events-none' : ''
            }`}
          />
        </CardContent>
      </Card>
    </div>
  )
}
