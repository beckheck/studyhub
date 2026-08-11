import { describe, it, expect } from 'vite-plus/test'
import {
  getActiveMoods,
  getMoodForDate,
  getHydrationForDate,
  computeMoodSelection,
  computeDailyHydration,
} from './wellness'
import type { MoodPercentages, MonthlyMoods, DailyHydrations, HydrationSettings } from '@/types'

const defaultHydrationSettings: HydrationSettings = {
  useCups: false,
  cupSizeML: 250,
  cupSizeOZ: 8,
  dailyGoalML: 2000,
  dailyGoalOZ: 64,
  unit: 'metric',
}

describe('getActiveMoods', () => {
  it('returns mood keys with percentage greater than zero', () => {
    const moods: MoodPercentages = { happy: 60, sad: 0, calm: 40 }

    expect(getActiveMoods(moods)).toEqual(['calm', 'happy'])
  })

  it('returns an empty array when all percentages are zero', () => {
    const moods: MoodPercentages = { happy: 0, sad: 0 }

    expect(getActiveMoods(moods)).toEqual([])
  })

  it('returns an empty array for empty mood percentages', () => {
    expect(getActiveMoods({})).toEqual([])
  })

  it('returns keys sorted alphabetically', () => {
    const moods: MoodPercentages = { zebra: 10, alpha: 20, middle: 30 }

    expect(getActiveMoods(moods)).toEqual(['alpha', 'middle', 'zebra'])
  })
})

describe('getMoodForDate', () => {
  it('returns the mood for the given date string', () => {
    const monthlyMoods: MonthlyMoods = {
      '2026-01-01': {
        percentages: { happy: 100 },
        gradient: 'red',
        totalPercentage: 100,
        savedAt: 0,
      },
    }

    expect(getMoodForDate(monthlyMoods, '2026-01-01')).toEqual({
      percentages: { happy: 100 },
      gradient: 'red',
      totalPercentage: 100,
      savedAt: 0,
    })
  })

  it('returns null when no mood exists for the date', () => {
    expect(getMoodForDate({}, '2026-01-01')).toBeNull()
  })
})

describe('getHydrationForDate', () => {
  it('returns the hydration data for the given date string', () => {
    const daily: DailyHydrations = {
      '2026-01-01': { intake: 1500, goal: 2000, unit: 'metric', useCups: false, savedAt: 0 },
    }

    expect(getHydrationForDate(daily, '2026-01-01')).toEqual({
      intake: 1500,
      goal: 2000,
      unit: 'metric',
      useCups: false,
      savedAt: 0,
    })
  })

  it('returns null when no hydration data exists for the date', () => {
    expect(getHydrationForDate({}, '2026-01-01')).toBeNull()
  })
})

describe('computeMoodSelection', () => {
  it('adds 20 percent to the selected mood', () => {
    const moods: MoodPercentages = { happy: 0 }

    const result = computeMoodSelection(moods, 'happy')

    expect(result.moods.happy).toBe(20)
  })

  it('caps the selected mood at 100', () => {
    const moods: MoodPercentages = { happy: 90 }

    const result = computeMoodSelection(moods, 'happy')

    expect(result.moods.happy).toBe(100)
  })

  it('caps the selected mood at the remaining percentage when other moods are active', () => {
    const moods: MoodPercentages = { happy: 60, calm: 30 }

    const result = computeMoodSelection(moods, 'calm')

    // Other moods total 60, so calm can go up to 40
    expect(result.moods.calm).toBe(40)
  })

  it('does not let the total exceed 100', () => {
    const moods: MoodPercentages = { happy: 80, calm: 10 }

    const result = computeMoodSelection(moods, 'calm')

    const total = Object.values(result.moods).reduce((sum, p) => sum + p, 0)
    expect(total).toBeLessThanOrEqual(100)
  })

  it('returns hasInteracted true', () => {
    const result = computeMoodSelection({}, 'happy')
    expect(result.hasInteracted).toBe(true)
  })

  it('does not mutate the input', () => {
    const moods: MoodPercentages = { happy: 20 }

    computeMoodSelection(moods, 'happy')

    expect(moods.happy).toBe(20)
  })

  it('returns the total percentage of the updated moods', () => {
    const moods: MoodPercentages = { happy: 40 }

    const result = computeMoodSelection(moods, 'happy')

    expect(result.totalPercentage).toBe(60)
  })
})

describe('computeDailyHydration', () => {
  it('creates a hydration entry for today with the given intake', () => {
    const existing: DailyHydrations = {}

    const result = computeDailyHydration(existing, '2026-01-01', 1500, defaultHydrationSettings)

    const entry = result['2026-01-01']
    expect(entry.intake).toBe(1500)
    expect(entry.unit).toBe('metric')
    expect(entry.useCups).toBe(false)
  })

  it('computes the goal in cups when useCups is true and unit is metric', () => {
    const settings = {
      ...defaultHydrationSettings,
      useCups: true,
      cupSizeML: 250,
      dailyGoalML: 2000,
    }

    const result = computeDailyHydration({}, '2026-01-01', 5, settings)

    // 2000 / 250 = 8 cups
    expect(result['2026-01-01'].goal).toBe(8)
  })

  it('computes the goal in cups when useCups is true and unit is imperial', () => {
    const settings: HydrationSettings = {
      ...defaultHydrationSettings,
      useCups: true,
      unit: 'imperial',
      cupSizeOZ: 8,
      dailyGoalOZ: 64,
    }

    const result = computeDailyHydration({}, '2026-01-01', 3, settings)

    // 64 / 8 = 8 cups
    expect(result['2026-01-01'].goal).toBe(8)
  })

  it('uses the raw goal when useCups is false', () => {
    const settings: HydrationSettings = {
      ...defaultHydrationSettings,
      useCups: false,
      unit: 'metric',
      dailyGoalML: 2000,
    }

    const result = computeDailyHydration({}, '2026-01-01', 500, settings)

    expect(result['2026-01-01'].goal).toBe(2000)
  })

  it('preserves existing entries for other dates', () => {
    const existing: DailyHydrations = {
      '2025-12-31': { intake: 1000, goal: 2000, unit: 'metric', useCups: false, savedAt: 0 },
    }

    const result = computeDailyHydration(existing, '2026-01-01', 500, defaultHydrationSettings)

    expect(result['2025-12-31']).toBeDefined()
    expect(result['2026-01-01']).toBeDefined()
  })

  it('does not mutate the input', () => {
    const existing: DailyHydrations = {}

    computeDailyHydration(existing, '2026-01-01', 500, defaultHydrationSettings)

    expect(existing['2026-01-01']).toBeUndefined()
  })
})
