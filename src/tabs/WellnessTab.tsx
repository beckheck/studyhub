import { useSettingsDialogContext } from '@/components/settings/SettingsDialogProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  computeDailyHydration,
  computeMoodSelection,
  getActiveMoods,
  getHydrationForDate as getStoredHydrationForDate,
  getMoodForDate as getStoredMoodForDate,
} from '@/domain/wellness'
import { useLocalization } from '@/hooks/useLocalization'
import { useWellness } from '@/hooks/useStore'
import { getDateString } from '@/lib/date-utils'
import { CalendarView, MonthlyMood, MoodEmoji, DailyHydration } from '@/types'
import { motion } from 'framer-motion'
import { Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function WellnessTab() {
  // Translation hooks
  const { t } = useTranslation('wellness')
  const { formatDate } = useLocalization()
  const { openDialog: openSettingsDialog } = useSettingsDialogContext()

  const {
    wellness,
    setWater,
    setGratitude,
    setMoodPercentages,
    setHasInteracted,
    setMonthlyMoods,
    setShowWords,
    setMoodEmojis,
    setDailyHydration,
  } = useWellness()

  const {
    water,
    gratitude,
    moodPercentages,
    hasInteracted,
    monthlyMoods,
    showWords,
    moodEmojis,
    hydrationSettings,
    dailyHydration,
  } = wellness
  const [breathing, setBreathing] = useState<boolean>(false)

  // Ensure dailyHydration is always defined
  const safeDailyHydration = dailyHydration || {}

  // Local state for UI only (not persisted)
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState<boolean>(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null) // Track which mood is showing emoji picker

  // Save current water intake as daily hydration data
  useEffect(() => {
    if (water >= 0) {
      saveDailyHydration(water)
    }
  }, [water]) // Only trigger when water changes

  // Emoji library for picker
  const emojiLibrary: string[] = [
    '😠',
    '😡',
    '🤬',
    '😤',
    '💢', // Angry
    '😔',
    '😢',
    '😭',
    '😿',
    '💔', // Sad
    '😐',
    '😑',
    '😶',
    '🙄',
    '😒', // Neutral
    '🙂',
    '😊',
    '😌',
    '😇',
    '☺️', // Happy
    '😁',
    '😄',
    '🤩',
    '😍',
    '🥰', // Excited/Love
    '😴',
    '😪',
    '🥱',
    '😵',
    '🤕', // Tired/Sick
    '🤔',
    '🧐',
    '😯',
    '😲',
    '😳', // Thinking/Surprised
    '😎',
    '🤓',
    '🥳',
    '🤗',
    '😏', // Cool/Confident
    '😰',
    '😨',
    '😱',
    '🫨',
    '😬', // Anxious/Scared
    '🤐',
    '😷',
    '🤢',
    '🤮',
    '🥴', // Other
  ]

  // Color palette for picker
  const _colorPalette: string[] = [
    '#ff6b6b',
    '#ff9f43',
    '#f7dc6f',
    '#45b7d1',
    '#10ac84',
    '#ff4757',
    '#ff6348',
    '#ffa502',
    '#f1c40f',
    '#2ed573',
    '#3742fa',
    '#2f3542',
    '#a4b0be',
    '#ff3838',
    '#ff9500',
    '#ffdd59',
    '#0abde3',
    '#00d2d3',
    '#ff006e',
    '#8e44ad',
    '#e74c3c',
    '#f39c12',
    '#f1c40f',
    '#27ae60',
    '#3498db',
    '#9b59b6',
    '#34495e',
    '#95a5a6',
    '#e67e22',
    '#16a085',
  ]

  // Get today's date string
  const getTodayDateString = (): string => {
    const today = new Date()
    return getDateString(today)
  }

  // Calendar state for mood tracking
  const [calendarView, setCalendarView] = useState<CalendarView>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  // Generate calendar matrix for mood calendar
  const generateCalendarMatrix = (year: number, month: number): (number | null)[][] => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7 // Monday = 0

    const matrix: (number | null)[][] = []
    let currentDate = 1

    // Generate 6 weeks (42 days)
    for (let week = 0; week < 6; week++) {
      const weekDays: (number | null)[] = []
      for (let day = 0; day < 7; day++) {
        const dayIndex = week * 7 + day
        if (dayIndex < startingDayOfWeek || currentDate > daysInMonth) {
          weekDays.push(null)
        } else {
          weekDays.push(currentDate)
          currentDate++
        }
      }
      matrix.push(weekDays)
    }

    return matrix
  }

  // Navigate calendar months
  const navigateMonth = (delta: number): void => {
    setCalendarView(prev => {
      const newDate = new Date(prev.year, prev.month + delta, 1)
      return { year: newDate.getFullYear(), month: newDate.getMonth() }
    })
  }

  // Get mood for specific date
  const getMoodForDate = (dateString: string): MonthlyMood | null => {
    return getStoredMoodForDate(monthlyMoods, dateString)
  }

  // Calculate total mood percentage
  const totalMoodPercentage = Object.values(moodPercentages).reduce((sum, percentage) => sum + percentage, 0)

  // Build progressive gradient from mood percentages (like Present Goals)
  const buildMoodGradient = (): string => {
    const activeMoods = getActiveMoods(moodPercentages)

    if (activeMoods.length === 0) {
      return 'transparent'
    }

    if (activeMoods.length === 1) {
      // Single color for first mood
      return moodEmojis[activeMoods[0]].color
    }

    // Multiple moods - create progressive gradient like Present Goals
    const colors = activeMoods.map(moodKey => moodEmojis[moodKey].color)
    const step = 100 / (colors.length - 1)
    const gradientStops = colors.map((color, index) => `${color} ${Math.round(index * step)}%`).join(', ')

    return `linear-gradient(180deg, ${gradientStops})`
  }

  // Get border color from first active mood
  const getBorderColor = (): string => {
    const firstActiveMood = getActiveMoods(moodPercentages)[0]

    if (firstActiveMood) {
      return moodEmojis[firstActiveMood].color + '40' // Add transparency
    }
    return '#e5e7eb' // Default gray border
  }

  // Handle mood selection (add 20% each click)
  const handleMoodSelect = (moodKey: string): void => {
    const { moods: updatedMoods, totalPercentage: totalPerc } = computeMoodSelection(moodPercentages, moodKey)

    setHasInteracted(true)
    setMoodPercentages(updatedMoods)

    // Save to monthly moods immediately
    const today = getTodayDateString()

    if (totalPerc > 0) {
      const activeMoods = getActiveMoods(updatedMoods)

      let gradient = 'transparent'
      if (activeMoods.length === 1) {
        gradient = moodEmojis[activeMoods[0]].color
      } else if (activeMoods.length > 1) {
        const colors = activeMoods.map(moodKey => moodEmojis[moodKey].color)
        const step = 100 / (colors.length - 1)
        const gradientStops = colors.map((color, index) => `${color} ${Math.round(index * step)}%`).join(', ')
        gradient = `linear-gradient(180deg, ${gradientStops})`
      }

      const newMonthlyMoods = {
        ...monthlyMoods,
        [today]: {
          percentages: { ...updatedMoods },
          gradient: gradient,
          totalPercentage: totalPerc,
          savedAt: Date.now(),
        },
      }
      setMonthlyMoods(newMonthlyMoods)
    }
  }

  // Reset mood
  const resetMood = (): void => {
    setMoodPercentages({})
    setHasInteracted(false)
  }

  // Handle emoji/color customization
  const updateMoodCustomization = (moodKey: string, field: keyof MoodEmoji, value: string): void => {
    const updatedMoodEmojis = {
      ...moodEmojis,
      [moodKey]: {
        ...moodEmojis[moodKey],
        [field]: value,
      },
    }
    setMoodEmojis(updatedMoodEmojis)
  }

  // Handle emoji selection from library
  const selectEmoji = (moodKey: string, emoji: string): void => {
    updateMoodCustomization(moodKey, 'emoji', emoji)
    setShowEmojiPicker(null)
  }

  // Hydration helper functions
  const getDisplayGoal = (): string => {
    if (hydrationSettings.useCups) {
      const cupsNeeded =
        hydrationSettings.unit === 'metric'
          ? Math.ceil(hydrationSettings.dailyGoalML / hydrationSettings.cupSizeML)
          : Math.ceil(hydrationSettings.dailyGoalOZ / hydrationSettings.cupSizeOZ)
      return `${cupsNeeded} cups`
    } else {
      return hydrationSettings.unit === 'metric'
        ? `${hydrationSettings.dailyGoalML}mL`
        : `${hydrationSettings.dailyGoalOZ}oz`
    }
  }

  const getMaxWaterValue = (): number => {
    if (hydrationSettings.useCups) {
      return hydrationSettings.unit === 'metric'
        ? Math.ceil(hydrationSettings.dailyGoalML / hydrationSettings.cupSizeML)
        : Math.ceil(hydrationSettings.dailyGoalOZ / hydrationSettings.cupSizeOZ)
    } else {
      return hydrationSettings.unit === 'metric' ? hydrationSettings.dailyGoalML : hydrationSettings.dailyGoalOZ
    }
  }

  const getCurrentProgress = (): number => {
    if (hydrationSettings.useCups) {
      const totalGoalCups =
        hydrationSettings.unit === 'metric'
          ? Math.ceil(hydrationSettings.dailyGoalML / hydrationSettings.cupSizeML)
          : Math.ceil(hydrationSettings.dailyGoalOZ / hydrationSettings.cupSizeOZ)
      return (water / totalGoalCups) * 100
    } else {
      const totalGoal =
        hydrationSettings.unit === 'metric' ? hydrationSettings.dailyGoalML : hydrationSettings.dailyGoalOZ
      return (water / totalGoal) * 100
    }
  }

  // Save daily hydration data
  const saveDailyHydration = (waterIntake: number): void => {
    const today = getTodayDateString()
    setDailyHydration(computeDailyHydration(safeDailyHydration, today, waterIntake, hydrationSettings))
  }

  // Get hydration data for specific date
  const getHydrationForDate = (dateString: string): DailyHydration | null => {
    return getStoredHydrationForDate(safeDailyHydration, dateString)
  }

  return (
    <div className="space-y-6">
      {/* First row - original cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('hydration.title')}</CardTitle>
                <CardDescription>Goal: {getDisplayGoal()}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openSettingsDialog('hydration')}
                className="rounded-xl p-2 h-8 w-8"
                title="Edit hydration settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Single large drop container */}
            <div className="flex justify-center mb-6">
              <div className="relative w-28 h-36">
                {/* SVG Drop Shape */}
                <svg
                  width="112"
                  height="144"
                  viewBox="0 0 112 144"
                  className="absolute inset-0"
                  style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}
                >
                  {/* Drop outline */}
                  <path
                    d="M56 10C56 10 16 40 16 80C16 105.405 35.595 126 56 126C76.405 126 96 105.405 96 80C96 40 56 10 56 10Z"
                    fill="#e5e7eb"
                    stroke="#d1d5db"
                    strokeWidth="3"
                    className="dark:fill-gray-700 dark:stroke-gray-600"
                  />
                  {/* Water fill with clipping path */}
                  <defs>
                    <clipPath id="dropClip">
                      <path d="M56 10C56 10 16 40 16 80C16 105.405 35.595 126 56 126C76.405 126 96 105.405 96 80C96 40 56 10 56 10Z" />
                    </clipPath>
                    <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(0,0,0,0.1)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                    </linearGradient>
                  </defs>
                  <rect
                    x="0"
                    y={`${126 - (getCurrentProgress() / 100) * 116}`}
                    width="112"
                    height={`${(getCurrentProgress() / 100) * 116}`}
                    fill="#60a5fa"
                    clipPath="url(#dropClip)"
                    className="transition-all duration-1000 ease-out"
                  />
                  {/* Water surface shadow effect */}
                  {water > 0 && (
                    <rect
                      x="16"
                      y={`${126 - (getCurrentProgress() / 100) * 116}`}
                      width="80"
                      height="8"
                      fill="url(#waterGradient)"
                      clipPath="url(#dropClip)"
                      className="transition-all duration-1000 ease-out"
                    />
                  )}
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button
                className="rounded-xl"
                onClick={() => {
                  const decrement = hydrationSettings.useCups
                    ? 1
                    : hydrationSettings.unit === 'metric'
                      ? hydrationSettings.cupSizeML
                      : hydrationSettings.cupSizeOZ
                  setWater(Math.max(0, water - decrement))
                }}
              >
                -
                {hydrationSettings.useCups
                  ? '1'
                  : `${
                      hydrationSettings.unit === 'metric' ? hydrationSettings.cupSizeML : hydrationSettings.cupSizeOZ
                    }${hydrationSettings.unit === 'metric' ? 'mL' : 'oz'}`}
              </Button>
              <div className="text-4xl font-extrabold tabular-nums">
                {hydrationSettings.useCups
                  ? `${water}/${getMaxWaterValue()}`
                  : hydrationSettings.unit === 'metric'
                    ? `${water}mL`
                    : `${water}oz`}
              </div>
              <Button
                className="rounded-xl"
                onClick={() => {
                  const increment = hydrationSettings.useCups
                    ? 1
                    : hydrationSettings.unit === 'metric'
                      ? hydrationSettings.cupSizeML
                      : hydrationSettings.cupSizeOZ
                  setWater(water + increment)
                }}
              >
                +
                {hydrationSettings.useCups
                  ? '1'
                  : `${
                      hydrationSettings.unit === 'metric' ? hydrationSettings.cupSizeML : hydrationSettings.cupSizeOZ
                    }${hydrationSettings.unit === 'metric' ? 'mL' : 'oz'}`}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle>{t('gratitude.note')}</CardTitle>
            <CardDescription>{t('gratitude.protectVibe')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={gratitude}
              onChange={e => setGratitude(e.target.value)}
              className="rounded-xl"
              placeholder={t('gratitude.placeholder')}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle>{t('breathing.title')}</CardTitle>
            <CardDescription>{t('breathing.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              animate={{ scale: breathing ? [1, 1.2, 1.2, 1, 1] : 1 }}
              transition={{ duration: 16, repeat: breathing ? Infinity : 0 }}
              className="w-28 h-28 mx-auto rounded-2xl bg-gradient-to-br from-fuchsia-500 to-sky-500"
            />
            <Button onClick={() => setBreathing(b => !b)} className="rounded-xl w-full mt-4">
              {breathing ? t('breathing.stop') : t('breathing.start')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Mood Bubble Card */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💭</span>
            {t('mood.title')}
          </CardTitle>
          <CardDescription>{t('mood.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Today's Mood Bubble */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                  {t('mood.todaysMoodBubble')}
                </h3>

                {/* Mood Circle with Percentage Display */}
                <div className="flex items-center justify-center gap-6">
                  {/* Percentage Display */}
                  {hasInteracted && (
                    <div className="space-y-2 min-w-[100px]">
                      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                        {t('mood.breakdown')}
                      </div>
                      {Object.entries(moodPercentages)
                        .filter(([_, percentage]) => percentage > 0)
                        .map(([moodKey, percentage]) => (
                          <div key={moodKey} className="flex items-center gap-2">
                            <span className="text-sm">{moodEmojis[moodKey].emoji}</span>
                            <div className="flex-1">
                              <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{percentage}%</div>
                              <div
                                className="h-1.5 rounded-full"
                                style={{ backgroundColor: moodEmojis[moodKey].color + '30' }}
                              >
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${(percentage / 100) * 100}%`,
                                    backgroundColor: moodEmojis[moodKey].color,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      {totalMoodPercentage > 0 && (
                        <div className="border-t pt-2 mt-2">
                          <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {t('mood.total', { percentage: totalMoodPercentage })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mood Circle */}
                  <div className="relative w-24 h-24">
                    <div
                      className="w-full h-full rounded-full border-4 bg-white dark:bg-zinc-900 overflow-hidden relative transition-all duration-1000"
                      style={{
                        borderColor: getBorderColor(),
                      }}
                    >
                      {/* Mood Fill with Gradient */}
                      {totalMoodPercentage > 0 && (
                        <div
                          className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
                          style={{
                            height: `${Math.min(totalMoodPercentage, 100)}%`,
                            background: buildMoodGradient(),
                          }}
                        >
                          {/* Water Wave Effect */}
                          <div
                            className="absolute top-0 left-0 right-0 h-1.5 opacity-70"
                            style={{
                              background:
                                'radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, transparent 70%)',
                              animation: 'wave 2s ease-in-out infinite',
                            }}
                          />
                        </div>
                      )}

                      {/* Mood Status in Center */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          {totalMoodPercentage > 0 ? (
                            <div>
                              <div className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                                {totalMoodPercentage}%
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-lg text-zinc-400">?</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mood Selection Circles */}
                <div className="flex justify-center gap-3 mt-4">
                  {Object.entries(moodEmojis).map(([key, mood]) => {
                    const currentPercentage = moodPercentages[key] || 0
                    const isActive = currentPercentage > 0

                    return (
                      <div key={key} className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => handleMoodSelect(key)}
                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm transition-all duration-200 hover:scale-110 relative ${
                            isActive ? 'border-white shadow-lg scale-110' : 'border-white/50 hover:border-white'
                          }`}
                          style={{
                            backgroundColor: mood.color,
                            boxShadow: isActive ? `0 0 15px ${mood.color}40` : 'none',
                          }}
                          title={`${mood.emoji} ${showWords && mood.word ? mood.word : key} - ${t('mood.clickToAdd')}`}
                        >
                          {mood.emoji}
                          {/* Click indicator */}
                          {isActive && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center text-xs font-bold text-zinc-800">
                              {Math.floor(currentPercentage / 20)}
                            </div>
                          )}
                        </button>

                        {/* Word label */}
                        {showWords && mood.word && (
                          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 min-h-[14px] text-center">
                            {mood.word}
                          </div>
                        )}

                        {/* Percentage label */}
                        {hasInteracted && (
                          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 min-h-[14px]">
                            {currentPercentage > 0 ? `${currentPercentage}%` : ''}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetMood}
                    className="rounded-xl"
                    disabled={totalMoodPercentage === 0}
                  >
                    {t('mood.reset')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomizeDialogOpen(true)}
                    className="rounded-xl"
                  >
                    {t('mood.customize')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column - Monthly Calendar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">{t('mood.thisMonth')}</h3>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)} className="rounded-xl p-2">
                    ‹
                  </Button>
                  <div className="text-sm font-medium min-w-[120px] text-center">
                    {formatDate(new Date(calendarView.year, calendarView.month), {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)} className="rounded-xl p-2">
                    ›
                  </Button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="space-y-2">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 text-xs font-medium text-zinc-500 text-center">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarMatrix(calendarView.year, calendarView.month)
                    .flat()
                    .map((day, index) => {
                      if (!day) {
                        return <div key={index} className="h-8" />
                      }

                      const dateString = `${calendarView.year}-${String(calendarView.month + 1).padStart(
                        2,
                        '0',
                      )}-${String(day).padStart(2, '0')}`
                      const dayMood = getMoodForDate(dateString)
                      const dayHydration = getHydrationForDate(dateString)
                      const isToday = dateString === getTodayDateString()

                      return (
                        <div
                          key={index}
                          className={`group relative h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 hover:scale-110 ${
                            isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                          }`}
                          style={{
                            background: dayMood ? dayMood.gradient : isToday ? '#f1f5f9' : 'transparent',
                            color: dayMood ? '#fff' : isToday ? '#334155' : '#64748b',
                          }}
                        >
                          {day}

                          {/* Hydration indicator */}
                          {dayHydration && (
                            <div
                              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-zinc-800"
                              style={{
                                backgroundColor: dayHydration.intake >= dayHydration.goal ? '#10b981' : '#60a5fa',
                              }}
                              title={`Hydration: ${Math.round((dayHydration.intake / dayHydration.goal) * 100)}%`}
                            />
                          )}

                          {/* Hover Tooltip for Mood Breakdown */}
                          {(dayMood || dayHydration) && (
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                              <div className="bg-white dark:bg-zinc-800 shadow-xl rounded-xl p-3 border border-white/20 dark:border-white/10 min-w-[220px]">
                                {/* Date Header */}
                                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 text-center">
                                  {formatDate(
                                    new Date(
                                      `${calendarView.year}-${String(calendarView.month + 1).padStart(2, '0')}-${String(
                                        day,
                                      ).padStart(2, '0')}`,
                                    ),
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                    },
                                  )}
                                </div>

                                {/* Mood Section */}
                                {dayMood && (
                                  <div className="mb-4">
                                    {/* Total Percentage */}
                                    <div className="text-center mb-3">
                                      <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                        {dayMood.totalPercentage}%
                                      </div>
                                      <div className="text-xs text-zinc-500">{t('mood.totalMood')}</div>
                                    </div>

                                    {/* Mood Breakdown */}
                                    <div className="space-y-2">
                                      {Object.entries(dayMood.percentages || {})
                                        .filter(([_, percentage]) => percentage > 0)
                                        .sort(([a], [b]) => a.localeCompare(b))
                                        .map(([moodKey, percentage]) => {
                                          const moodConfig = moodEmojis[moodKey] || {
                                            emoji: '😐',
                                            word: moodKey,
                                            color: '#6b7280',
                                          }
                                          return (
                                            <div key={moodKey} className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm">{moodConfig.emoji}</span>
                                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                                                  {moodConfig.word}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <div
                                                  className="w-3 h-3 rounded-full"
                                                  style={{ backgroundColor: moodConfig.color }}
                                                />
                                                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                                  {percentage}%
                                                </span>
                                              </div>
                                            </div>
                                          )
                                        })}
                                    </div>
                                  </div>
                                )}

                                {/* Hydration Section */}
                                {(() => {
                                  const dayHydration = getHydrationForDate(dateString)
                                  if (!dayHydration) return null

                                  const hydrationProgress = (dayHydration.intake / dayHydration.goal) * 100
                                  const isOverGoal = hydrationProgress > 100

                                  return (
                                    <div
                                      className={dayMood ? 'border-t border-zinc-200 dark:border-zinc-600 pt-3' : ''}
                                    >
                                      {/* Hydration Header */}
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className="text-sm">💧</span>
                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                          Hydration
                                        </span>
                                      </div>

                                      {/* Hydration Progress */}
                                      <div className="space-y-2">
                                        {/* Progress Bar */}
                                        <div className="relative">
                                          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                                            <div
                                              className={`h-2 rounded-full transition-all duration-300 ${
                                                isOverGoal
                                                  ? 'bg-gradient-to-r from-blue-500 to-green-500'
                                                  : 'bg-blue-500'
                                              }`}
                                              style={{
                                                width: `${Math.min(hydrationProgress, 100)}%`,
                                              }}
                                            />
                                            {/* Overflow indicator */}
                                            {isOverGoal && (
                                              <div
                                                className="absolute top-0 right-0 h-2 bg-green-500 rounded-r-full"
                                                style={{
                                                  width: `${Math.min((hydrationProgress - 100) / 2, 50)}%`,
                                                }}
                                              />
                                            )}
                                          </div>
                                        </div>

                                        {/* Numbers */}
                                        <div className="flex items-center justify-between text-sm">
                                          <div className="text-zinc-600 dark:text-zinc-400">
                                            {dayHydration.useCups
                                              ? `${dayHydration.intake}/${dayHydration.goal} cups`
                                              : `${dayHydration.intake}/${dayHydration.goal}${
                                                  dayHydration.unit === 'metric' ? 'mL' : 'oz'
                                                }`}
                                          </div>
                                          <div
                                            className={`font-bold ${
                                              isOverGoal
                                                ? 'text-green-600 dark:text-green-400'
                                                : hydrationProgress >= 80
                                                  ? 'text-blue-600 dark:text-blue-400'
                                                  : 'text-zinc-700 dark:text-zinc-300'
                                            }`}
                                          >
                                            {Math.round(hydrationProgress)}%
                                          </div>
                                        </div>

                                        {/* Achievement badge */}
                                        {isOverGoal && (
                                          <div className="text-center">
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                                              <span>🎉</span>
                                              Goal exceeded!
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })()}

                                {/* Tooltip Arrow */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white dark:border-t-zinc-800"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>

                {/* Streak Indicator */}
                <div className="flex items-center justify-center gap-4 mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-600 text-sm">🔥</span>
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                      {t('mood.daysTracked', { count: Object.keys(monthlyMoods).length })}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-orange-300 dark:bg-orange-700" />
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 text-sm">💧</span>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {Object.keys(safeDailyHydration).length} days hydrated
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customize Dialog */}
      <Dialog open={customizeDialogOpen} onOpenChange={setCustomizeDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md bg-white dark:bg-white border border-gray-200 dark:border-gray-700">
          <DialogHeader className="">
            <DialogTitle>{t('customize.title')}</DialogTitle>
            <DialogDescription>{t('customize.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Word Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <Label className="font-medium">{t('customize.showMoodWords')}</Label>
              <Switch checked={showWords} onCheckedChange={setShowWords} className="data-[state=checked]:bg-blue-600" />
            </div>

            {Object.entries(moodEmojis).map(([key, mood]) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <div className="flex items-center gap-2 flex-1">
                  {/* Emoji Input with Picker */}
                  <div className="relative">
                    <Input
                      value={mood.emoji}
                      onChange={e => updateMoodCustomization(key, 'emoji', e.target.value)}
                      className="w-16 text-center rounded-xl cursor-pointer"
                      placeholder="😊"
                      onClick={() => setShowEmojiPicker(showEmojiPicker === key ? null : key)}
                      readOnly
                    />
                    {/* Emoji Picker Dropdown */}
                    {showEmojiPicker === key && (
                      <div className="absolute top-full left-0 mt-1 p-3 rounded-xl bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 shadow-lg z-50 w-64 max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-8 gap-2">
                          {emojiLibrary.map((emoji, index) => (
                            <button
                              key={index}
                              onClick={() => selectEmoji(key, emoji)}
                              className="w-8 h-8 rounded hover:bg-zinc-100 dark:hover:bg-zinc-600 flex items-center justify-center text-lg transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Color Picker */}
                  <div className="relative">
                    <input
                      type="color"
                      value={mood.color}
                      onChange={e => updateMoodCustomization(key, 'color', e.target.value)}
                      className="w-8 h-8 rounded-full border-2 border-white cursor-pointer"
                      title={t('customize.clickToChangeColor')}
                    />
                  </div>

                  {/* Word Input (only when words are enabled) */}
                  {showWords && (
                    <Input
                      value={mood.word || ''}
                      onChange={e => updateMoodCustomization(key, 'word', e.target.value)}
                      className="flex-1 rounded-xl text-sm"
                      placeholder={key}
                    />
                  )}
                </div>
                <Label className="capitalize text-sm text-zinc-600 dark:text-zinc-400 min-w-[60px]">
                  {showWords && mood.word ? mood.word : key}
                </Label>
              </div>
            ))}
            <Button
              onClick={() => {
                setCustomizeDialogOpen(false)
                setShowEmojiPicker(null)
              }}
              className="w-full rounded-xl mt-4"
            >
              {t('customize.saveChanges')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
