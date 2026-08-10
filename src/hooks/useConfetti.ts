import { useEffect, useRef, useState } from 'react'

interface UseConfettiProps {
  /** Boolean trigger condition */
  trigger: boolean
  /** Duration in ms to show confetti at full intensity (default: 2000) */
  fullDuration?: number
  /** Initial number of confetti pieces (default: 500) */
  initialPieces?: number
  /** Pieces reduction rate per interval (default: 50) */
  pieceReduction?: number
  /** Interval for piece reduction in ms (default: 100) */
  reductionInterval?: number
  /** Delay before opacity fade starts in ms (default: 500) */
  opacityFadeDelay?: number
  /** Duration of opacity fade in ms (default: 1000) */
  opacityFadeDuration?: number
}

export function useConfetti({
  trigger,
  fullDuration = 2000,
  initialPieces = 500,
  pieceReduction = 50,
  reductionInterval = 100,
  opacityFadeDelay = 500,
  opacityFadeDuration = 1000,
}: UseConfettiProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiOpacity, setConfettiOpacity] = useState(1)
  const [confettiPieces, setConfettiPieces] = useState(initialPieces)
  const hookCreatedAt = useRef(Date.now())
  const lastTriggerTime = useRef(0)
  const activeTimers = useRef<{
    fadeTimer?: number
    intervalId?: number
    opacityTimeout?: number
    cleanupTimeout?: number
  }>({})

  const clearAllTimers = () => {
    if (activeTimers.current.fadeTimer) clearTimeout(activeTimers.current.fadeTimer)
    if (activeTimers.current.intervalId) clearInterval(activeTimers.current.intervalId)
    if (activeTimers.current.opacityTimeout) clearTimeout(activeTimers.current.opacityTimeout)
    if (activeTimers.current.cleanupTimeout) clearTimeout(activeTimers.current.cleanupTimeout)
    activeTimers.current = {}
  }

  const startConfetti = () => {
    // Clear any existing timers first
    clearAllTimers()

    // Immediately set confetti to show
    setShowConfetti(true)
    setConfettiOpacity(1)
    setConfettiPieces(initialPieces)

    // Start gradual fade out after full duration
    activeTimers.current.fadeTimer = window.setTimeout(() => {
      // Gradually reduce pieces
      activeTimers.current.intervalId = window.setInterval(() => {
        setConfettiPieces(prev => Math.max(0, prev - pieceReduction))
      }, reductionInterval)

      // Start opacity fade after delay
      activeTimers.current.opacityTimeout = window.setTimeout(() => {
        setConfettiOpacity(0)
      }, opacityFadeDelay)

      // Clean up and hide completely after fade
      activeTimers.current.cleanupTimeout = window.setTimeout(() => {
        setShowConfetti(false)
        if (activeTimers.current.intervalId) {
          clearInterval(activeTimers.current.intervalId)
        }
        setConfettiPieces(initialPieces) // Reset for next time
        setConfettiOpacity(1)
        activeTimers.current = {}
      }, opacityFadeDelay + opacityFadeDuration)
    }, fullDuration)

    // Return cleanup function
    return clearAllTimers
  }

  useEffect(() => {
    let cleanup: (() => void) | undefined

    const now = Date.now()
    const timeSinceHookCreated = now - hookCreatedAt.current
    const timeSinceLastTrigger = now - lastTriggerTime.current

    // Only trigger confetti if:
    // 1. trigger is true
    // 2. At least 500ms have passed since hook was created (skip initial renders)
    // 3. At least 1000ms have passed since last confetti (prevent spam)
    if (trigger && timeSinceHookCreated > 500 && timeSinceLastTrigger > 1000) {
      cleanup = startConfetti()
      lastTriggerTime.current = now
    }

    return cleanup
  }, [trigger, fullDuration, initialPieces, pieceReduction, reductionInterval, opacityFadeDelay, opacityFadeDuration])

  // Cleanup timers on unmount
  useEffect(() => {
    return clearAllTimers
  }, [])

  return {
    showConfetti,
    confettiOpacity,
    confettiPieces,
  }
}
