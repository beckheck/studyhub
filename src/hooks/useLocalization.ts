import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

export interface Language {
  code: string
  name: string
  nativeName: string
  flag: string
}

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
  },
]

export function useLocalization() {
  const { t, i18n } = useTranslation()

  const changeLanguage = useCallback(
    (languageCode: string) => {
      i18n.changeLanguage(languageCode).catch(console.error)
    },
    [i18n],
  )

  const getCurrentLanguage = useCallback(() => {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === i18n.language) || SUPPORTED_LANGUAGES[0]
  }, [i18n.language])

  const formatDate = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions) => {
      const defaultOptions: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...options,
      }
      return date.toLocaleDateString(i18n.language, defaultOptions)
    },
    [i18n.language],
  )

  const formatTime = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions) => {
      return date.toLocaleTimeString(i18n.language, options)
    },
    [i18n.language],
  )

  const formatNumber = useCallback(
    (number: number, options?: Intl.NumberFormatOptions) => {
      return number.toLocaleString(i18n.language, options)
    },
    [i18n.language],
  )

  const formatRelativeTime = useCallback(
    (value: number, unit: Intl.RelativeTimeFormatUnit) => {
      const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' })
      return rtf.format(value, unit)
    },
    [i18n.language],
  )

  // Format date as DD-MM-YYYY or DD/MM/YYYY
  const formatDateDDMMYYYY = useCallback((date: Date | string, separator: string = '-') => {
    let d: Date
    if (typeof date === 'string') {
      // Parse date string properly to avoid timezone issues
      // Split the date string and create date with local timezone
      const parts = date.split('-')
      if (parts.length === 3) {
        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      } else {
        d = new Date(date)
      }
    } else {
      d = date
    }
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}${separator}${month}${separator}${year}`
  }, [])

  // Helper function to generate day names array
  const getDayNamesArray = useCallback(
    (format: 'long' | 'short') => {
      const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: format })
      const days: string[] = []
      // Start from Monday (1) to Sunday (0) - JavaScript Date uses 0=Sunday, 1=Monday, etc.
      for (let i = 1; i <= 7; i++) {
        const date = new Date(2023, 0, i + 1) // January 2nd, 2023 was a Monday
        days.push(formatter.format(date))
      }
      return days
    },
    [i18n.language],
  )

  // Helper function to generate month names array
  const getMonthNamesArray = useCallback(
    (format: 'long' | 'short') => {
      const formatter = new Intl.DateTimeFormat(i18n.language, { month: format })
      const months: string[] = []
      for (let i = 0; i < 12; i++) {
        const date = new Date(2023, i, 1)
        months.push(formatter.format(date))
      }
      return months
    },
    [i18n.language],
  )

  // Get localized day names using Intl API
  const getDayNames = useCallback(() => getDayNamesArray('long'), [getDayNamesArray])

  // Get localized short day names using Intl API
  const getShortDayNames = useCallback(() => getDayNamesArray('short'), [getDayNamesArray])

  // Get localized month names using Intl API
  const getMonthNames = useCallback(() => getMonthNamesArray('long'), [getMonthNamesArray])

  // Get localized short month names using Intl API
  const getShortMonthNames = useCallback(() => getMonthNamesArray('short'), [getMonthNamesArray])

  // Format duration in seconds to localized time format (HH:MM:SS)
  const formatDurationSeconds = useCallback(
    (totalSeconds: number): string => {
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      // Create dates for formatting (using arbitrary date, only time matters)
      const baseDate = new Date(2000, 0, 1, hours, minutes, seconds)

      return baseDate.toLocaleTimeString(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    },
    [i18n.language],
  )

  // Format duration in minutes to localized HH:MM format
  const formatDurationMinutes = useCallback(
    (totalMinutes: number): string => {
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60

      // Create a date for formatting (using arbitrary date, only time matters)
      const baseDate = new Date(2000, 0, 1, hours, minutes, 0)

      return baseDate.toLocaleTimeString(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    },
    [i18n.language],
  )

  return {
    t,
    i18n,
    changeLanguage,
    getCurrentLanguage,
    formatDate,
    formatDateDDMMYYYY,
    formatTime,
    formatNumber,
    formatRelativeTime,
    formatDurationSeconds,
    formatDurationMinutes,
    getDayNames,
    getShortDayNames,
    getMonthNames,
    getShortMonthNames,
    currentLanguage: i18n.language,
    isRTL: false, // Add RTL support later if needed
  }
}
