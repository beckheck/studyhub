import type { MoodPercentages, MonthlyMoods, DailyHydrations, HydrationSettings } from '@/types'

export function getActiveMoods(moodPercentages: MoodPercentages): string[] {
  return Object.entries(moodPercentages)
    .filter(([_, percentage]) => percentage > 0)
    .map(([key]) => key)
    .sort((a, b) => a.localeCompare(b))
}

export function getMoodForDate(monthlyMoods: MonthlyMoods, dateString: string) {
  return monthlyMoods[dateString] || null
}

export function getHydrationForDate(dailyHydration: DailyHydrations, dateString: string) {
  return dailyHydration[dateString] || null
}

export function computeMoodSelection(
  moodPercentages: MoodPercentages,
  moodKey: string,
): { moods: MoodPercentages; hasInteracted: boolean; totalPercentage: number } {
  const currentPercentage = moodPercentages[moodKey] || 0
  const newPercentage = Math.min(100, currentPercentage + 20)

  const otherMoodsTotal = Object.entries(moodPercentages)
    .filter(([key]) => key !== moodKey)
    .reduce((sum, [_, percentage]) => sum + percentage, 0)

  let updatedMoods: MoodPercentages
  if (otherMoodsTotal + newPercentage > 100) {
    updatedMoods = {
      ...moodPercentages,
      [moodKey]: Math.max(0, 100 - otherMoodsTotal),
    }
  } else {
    updatedMoods = {
      ...moodPercentages,
      [moodKey]: newPercentage,
    }
  }

  const totalPercentage = Object.values(updatedMoods).reduce((sum, p) => sum + p, 0)

  return { moods: updatedMoods, hasInteracted: true, totalPercentage }
}

export function computeDailyHydration(
  dailyHydration: DailyHydrations,
  dateString: string,
  waterIntake: number,
  settings: HydrationSettings,
): DailyHydrations {
  const goal = settings.useCups
    ? settings.unit === 'metric'
      ? Math.ceil(settings.dailyGoalML / settings.cupSizeML)
      : Math.ceil(settings.dailyGoalOZ / settings.cupSizeOZ)
    : settings.unit === 'metric'
      ? settings.dailyGoalML
      : settings.dailyGoalOZ

  return {
    ...dailyHydration,
    [dateString]: {
      intake: waterIntake,
      goal,
      unit: settings.unit,
      useCups: settings.useCups,
      savedAt: Date.now(),
    },
  }
}
