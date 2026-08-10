/**
 * Utility functions for handling study techniques and phase management
 */

import { TimerPhase } from '../types'

export interface TechniqueConfig {
  id: string
  name: string // Translation key
  studyMinutes: number
  breakMinutes: number
  longBreakMinutes?: number // Optional long break duration
  longBreakInterval?: number // Number of study phases before long break
}

/**
 * Available study techniques
 */
export const STUDY_TECHNIQUES: TechniqueConfig[] = [
  {
    id: 'pomodoro-25-5',
    name: 'focusTimer.techniques.pomodoro',
    studyMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 30,
    longBreakInterval: 4,
  },
  {
    id: 'deep-work-50-10',
    name: 'focusTimer.techniques.deepWork',
    studyMinutes: 50,
    breakMinutes: 10,
  },
  {
    id: 'flow',
    name: 'focusTimer.techniques.flow',
    studyMinutes: Infinity,
    breakMinutes: 0,
  },
]

// if in dev environment, add test technique
if (import.meta.env.DEV) {
  STUDY_TECHNIQUES.push({
    id: 'test',
    name: 'focusTimer.techniques.pomodoro',
    studyMinutes: 0.1,
    breakMinutes: 0.2,
    longBreakMinutes: 0.3,
    longBreakInterval: 4,
  })
}

/**
 * Get technique configuration by ID
 * @param techniqueId - Technique ID
 * @returns Configuration object with study/break durations
 */
export function getTechniqueConfig(techniqueId: string): TechniqueConfig {
  const technique = STUDY_TECHNIQUES.find(t => t.id === techniqueId)

  if (!technique) {
    // Fallback to flow technique for unknown IDs
    return STUDY_TECHNIQUES.find(t => t.id === 'flow')!
  }

  return technique
}

/**
 * Get the duration in seconds for the current phase
 * @param techniqueId - Technique ID
 * @param phase - Current phase ('focus', 'break', or 'longBreak')
 * @returns Duration in seconds, or Infinity for continuous flow
 */
export function getPhaseDurationSeconds(techniqueId: string, phase: TimerPhase): number {
  const config = getTechniqueConfig(techniqueId)

  if (config.breakMinutes === 0) {
    return Infinity // Flow technique - no time limit
  }

  let minutes: number
  if (phase === 'focus') {
    minutes = config.studyMinutes
  } else if (phase === 'longBreak') {
    minutes = config.longBreakMinutes || config.breakMinutes
  } else {
    minutes = config.breakMinutes
  }

  return minutes * 60 // Convert to seconds
}

export function getPhaseEmoji(techniqueId: string, phase: TimerPhase): string {
  const config = getTechniqueConfig(techniqueId)
  if (config.breakMinutes === 0) {
    return '⏰'
  }
  return phase === 'focus' ? '📚' : phase === 'longBreak' ? '💤' : '🧘🏻' //🧘🏻🪷💅
}

/**
 * Determine if a phase should transition to the next phase
 * @param techniqueId - Technique ID
 * @param phase - Current phase
 * @param phaseElapsed - Seconds elapsed in current phase
 * @returns Whether the phase should transition
 */
export function shouldTransitionPhase(techniqueId: string, phase: TimerPhase, phaseElapsed: number): boolean {
  const config = getTechniqueConfig(techniqueId)

  if (config.breakMinutes === 0) {
    return false // Flow technique never auto-transitions
  }

  const phaseDuration = getPhaseDurationSeconds(techniqueId, phase)
  return phaseElapsed >= phaseDuration
}

/**
 * Get the next phase in the cycle based on technique and study phases completed
 * @param currentPhase - Current phase
 * @param techniqueId - Technique ID
 * @param studyPhasesCompleted - Number of study phases completed
 * @returns Next phase
 */
export function getNextPhase(currentPhase: TimerPhase, techniqueId: string, studyPhasesCompleted: number): TimerPhase {
  const config = getTechniqueConfig(techniqueId)

  if (currentPhase === 'focus') {
    // After focus, determine if it's time for a long break
    if (config.longBreakInterval && config.longBreakMinutes) {
      const completedAfterThis = studyPhasesCompleted + 1
      if (completedAfterThis % config.longBreakInterval === 0) {
        return 'longBreak'
      }
    }
    return 'break'
  }

  // After any break (short or long), return to focus
  return 'focus'
}
