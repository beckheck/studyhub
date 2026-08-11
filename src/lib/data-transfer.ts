import {
  DEFAULT_DASHBOARD_WIDGET_ORDER,
  DEFAULT_DASHBOARD_WIDGET_VISIBILITY,
  DEFAULT_FOCUS_TIMER_CONFIG,
  DEFAULT_HYDRATION_SETTINGS,
  DEFAULT_MOOD_EMOJIS,
} from '@/stores/app'
import type { AppState, CourseRecord, DashboardState, Item, SemesterDates, SoundtrackPosition } from '@/types'

export function serialize(state: AppState): ExchangeFormatV2 {
  return {
    version: '2',
    courses: state.courses,
    sessions: state.sessions,
    examGrades: state.examGrades,
    sessionTasks: state.sessionTasks,
    items: convertDatesToTimestamps(state.items, /(At|^until)$/),
    projects: convertDatesToTimestamps(state.projects ?? [], /(At)$/),
    weeklyGoals: state.weeklyGoals,
    degreePlan: {
      name: state.degreePlan.name,
      semesters: state.degreePlan.semesters,
      completedCourses: state.degreePlan.completedCourses,
    },
    wellness: state.wellness,
    fileAttachments: state.fileAttachments,
    dashboard: state.dashboard,
    courseRecords: convertDatesToTimestamps(state.courseRecords ?? [], /(At)$/),
    settings: {
      selectedCourseId: state.selectedCourseId,
      soundtrackEmbed: state.soundtrack.embed,
      soundtrackPosition: state.soundtrack.position,
      weather: state.weather,
      focusTimer: state.focusTimer,
      theme: {
        darkMode: state.theme.darkMode,
        gradient: {
          enabled: state.theme.gradientEnabled,
          start: state.theme.gradientStart,
          middle: state.theme.gradientMiddle,
          end: state.theme.gradientEnd,
        },
        customCursor: state.theme.customCursor,
        accentColor: state.theme.accentColor,
        cardOpacity: state.theme.cardOpacity,
        bgImage: state.theme.bgImage,
      },
      activeTabsByMode: state.activeTabsByMode,
      googleCalendar: state.googleCalendar,
    },
    semesterDates: state.semesterDates,
  }
}

export function exportFile(state: AppState): void {
  const data = serialize(state)
  try {
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const now = new Date()
    const yyyymmdd_hhmm =
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0')
    a.download = `studyhub_${yyyymmdd_hhmm}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting data:', error)
  }
}

export async function importFile(file: File): Promise<AppState | null> {
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    return deserialize(data)
  } catch (error) {
    console.error('Error importing data:', error)
    return null
  }
}

export function deserialize(data: any): AppState {
  if (data.version === '2') {
    return deserializeV2(data)
  }
  throw new Error('Unsupported exchange data format version')
}

function deserializeV2(data: ExchangeFormatV2): AppState {
  const existingItems = data.items ? (convertTimestampsToDates(data.items, /(At|^until)$/) as Item[]) : []
  const items = existingItems

  const courseRecords: CourseRecord[] = data.courseRecords
    ? (convertTimestampsToDates(data.courseRecords, /(At)$/) as CourseRecord[])
    : []

  const sessions = data.sessions.map(o => ({
    ...o,
    startTs: new Date(o.startTs).getTime(),
    endTs: new Date(o.endTs).getTime(),
  }))

  return {
    courses: data.courses,
    degreePlan: {
      ...data.degreePlan,
      name: data.degreePlan.name || 'Degree Plan',
      semesters: data.degreePlan.semesters.map((s, i) => ({ ...s, number: s.number ?? i + 1 })),
    },
    examGrades: data.examGrades,
    sessionTasks: data.sessionTasks,
    items,
    projects: normalizeProjects(data.projects),
    weeklyGoals: data.weeklyGoals,
    selectedCourseId: data.settings.selectedCourseId,
    wellness: {
      water: data.wellness.water || 0,
      gratitude: data.wellness.gratitude || '',
      moodPercentages: data.wellness.moodPercentages || {},
      hasInteracted: data.wellness.hasInteracted || false,
      monthlyMoods: data.wellness.monthlyMoods || {},
      showWords: data.wellness.showWords !== undefined ? data.wellness.showWords : true,
      moodEmojis: data.wellness.moodEmojis || {
        ...DEFAULT_MOOD_EMOJIS,
      },
      hydrationSettings: data.wellness.hydrationSettings || {
        ...DEFAULT_HYDRATION_SETTINGS,
      },
      dailyHydration: data.wellness.dailyHydration || {},
    },
    soundtrack: {
      embed: data.settings.soundtrackEmbed,
      position: data.settings.soundtrackPosition,
    },
    weather: {
      apiKey: data.settings.weather.apiKey,
      location: data.settings.weather.location,
    },
    googleCalendar: data.settings.googleCalendar || {
      syncEnabled: false,
    },
    focusTimer: data.settings.focusTimer || {
      ...DEFAULT_FOCUS_TIMER_CONFIG,
    },
    theme: {
      darkMode: data.settings.theme.darkMode,
      gradientEnabled: data.settings.theme.gradient.enabled,
      gradientStart: data.settings.theme.gradient.start,
      gradientMiddle: data.settings.theme.gradient.middle,
      gradientEnd: data.settings.theme.gradient.end,
      customCursor: data.settings.theme.customCursor,
      accentColor: data.settings.theme.accentColor,
      cardOpacity: data.settings.theme.cardOpacity,
      bgImage: data.settings.theme.bgImage,
    },
    fileAttachments: data.fileAttachments || {
      files: {},
      metadata: {},
    },
    dashboard: {
      widgetVisibility: {
        ...DEFAULT_DASHBOARD_WIDGET_VISIBILITY,
        ...data.dashboard?.widgetVisibility,
      },
      widgetOrder: data.dashboard?.widgetOrder || [...DEFAULT_DASHBOARD_WIDGET_ORDER],
      widgetCollapsed: data.dashboard?.widgetCollapsed || {},
      missionText: data.dashboard?.missionText || '',
      missionLink: data.dashboard?.missionLink || '',
    },
    activeTabsByMode: data.settings.activeTabsByMode || {},
    semesterDates: {
      firstSemesterStart: data.semesterDates?.firstSemesterStart || '',
      firstSemesterEnd: data.semesterDates?.firstSemesterEnd || '',
      secondSemesterStart: data.semesterDates?.secondSemesterStart || '',
      secondSemesterEnd: data.semesterDates?.secondSemesterEnd || '',
      finalsStart: data.semesterDates?.finalsStart || '',
      finalsEnd: data.semesterDates?.finalsEnd || '',
      recessWeekStart: data.semesterDates?.recessWeekStart || '',
      recessWeekEnd: data.semesterDates?.recessWeekEnd || '',
      winterBreakStart: data.semesterDates?.winterBreakStart || '',
      winterBreakEnd: data.semesterDates?.winterBreakEnd || '',
    },
    courseRecords,
    sessions,
  }
}

export interface ExchangeFormatV2 {
  version: '2'
  courses: Array<{
    id: string
    title: string
  }>
  sessions: Array<{
    id: string
    courseId: string
    startTs: number
    endTs: number
    durationMin: number
    technique: string
    moodStart?: number
    moodEnd?: number
    note?: string
  }>
  exams?: Array<{
    id: string
    courseId: string
    title: string
    date: string
    weight: number
    notes: string
  }>
  examGrades: Array<{
    examId: string
    grade: number
  }>
  tasks?: Array<{
    id: string
    courseId: string
    title: string
    due: string
    priority: string
    done: boolean
    notes?: string
  }>
  timetableEvents?: Array<{
    id: string
    courseId: string
    eventType: string
    classroom: string
    teacher: string
    day: string
    startTime: string
    endTime: string
    block: string
    color?: string
  }>
  regularEvents?: Array<{
    id: string
    courseId: string
    title: string
    startDate: string
    endDate: string
    isMultiDay: boolean
    location: string
    notes: string
    color?: string
  }>
  sessionTasks: Array<{
    id: string
    title: string
    done: boolean
    createdAt: number
  }>
  items: XItem[]
  projects?: Array<{
    id: string
    title: string
    type: string
    memberCount: number
    visualType: 'emoji' | 'icon'
    emoji: string
    iconName: string
    summary: string
    notes: string
    teamMembers?: Array<{
      name: string
      role: string
      email?: string
    }>
    yourRoles?: string[]
    teamRoles?: string[]
    resources: Array<{
      label: string
      url: string
    }>
    createdAt: number
    updatedAt: number
  }>
  degreePlan: {
    name: string
    semesters: Array<{
      id: string | number
      name?: string
      number?: number
      courses: Array<{
        id: string
        acronym: string
        name: string
        credits: string
        prerequisites?: string
        corequisites?: string
        completed: boolean
      }>
    }>
    completedCourses: string[]
  }
  wellness: {
    water?: number
    gratitude?: string
    moodPercentages?: Record<string, number>
    hasInteracted?: boolean
    monthlyMoods?: Record<string, any>
    showWords?: boolean
    moodEmojis?: Record<
      string,
      {
        emoji: string
        color: string
        word: string
      }
    >
    hydrationSettings?: {
      useCups: boolean
      cupSizeML: number
      cupSizeOZ: number
      dailyGoalML: number
      dailyGoalOZ: number
      unit: 'metric' | 'imperial'
    }
    dailyHydration?: Record<
      string,
      {
        intake: number
        goal: number
        unit: 'metric' | 'imperial'
        useCups: boolean
        savedAt: number
      }
    >
  }
  fileAttachments: {
    files: Record<
      string,
      {
        id: string
        fileName: string
        fileSize: string
        fileType: string
        uploadedAt: number
        fileData: string
      }
    >
    metadata: Record<
      string,
      {
        id: string
        fileName: string
        fileSize: string
        fileType: string
        uploadedAt: number
      }
    >
  }
  weeklyGoals: Array<{
    id: string
    title: string
    completed: boolean
    createdAt: number
    color?: string
  }>
  settings: {
    selectedCourseId: string
    soundtrackEmbed: string
    soundtrackPosition: SoundtrackPosition
    weather: {
      apiKey: string
      location: {
        useGeolocation: boolean
        city: string
      }
    }
    focusTimer: {
      audioEnabled: boolean
      audioVolume: number
      notificationsEnabled: boolean
      showCountdown: boolean
      blockingStrategy: 'blacklist' | 'whitelist' | 'disabled'
      sites: string
    }
    theme: {
      darkMode: boolean
      gradient: {
        enabled: boolean
        start: {
          light: string
          dark: string
        }
        middle: {
          light: string
          dark: string
        }
        end: {
          light: string
          dark: string
        }
      }
      customCursor: string
      accentColor: {
        light: string
        dark: string
      }
      cardOpacity: {
        light: number
        dark: number
      }
      bgImage: string
    }
    activeTabsByMode?: Record<string, string>
    googleCalendar?: {
      accessToken?: string
      tokenExpiresAt?: number
      calendarId?: string
      calendars?: Array<{ id: string; summary: string }>
      syncEnabled: boolean
    }
  }
  courseRecords?: Array<{
    id: string
    courseId: string
    date: string
    content: string
    type: 'note' | 'attendance' | 'homework' | 'lecture' | 'lab' | 'other'
    mood?: number
    createdAt: number
    updatedAt: number
  }>
  dashboard?: DashboardState
  semesterDates?: SemesterDates
}

// Inlined Item type definitions
type XItemBase = {
  id: string
  title?: string
  courseId: string
  color?: string
  notes?: string
  tags?: string[]
  isDeleted: boolean
  createdAt: number
  updatedAt: number
}

type XItemTask = XItemBase & {
  type: 'task'
  dueAt: number
  priority: 'low' | 'medium' | 'high'
  isCompleted: boolean
}

type XItemExam = XItemBase & {
  type: 'exam'
  startsAt: number
  weight: number
  isCompleted: boolean
}

type XItemEvent = XItemBase & {
  type: 'event'
  startsAt: number
  endsAt: number
  isAllDay: boolean
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    byWeekday?: number[]
    count?: number
    until?: number
  }
  location?: string
}

type XItemTimetable = XItemBase & {
  type: 'timetable'
  blockId: string
  weekday: number
  classroom?: string
  teacher?: string
  activityType: string
}

type XItem = XItemTask | XItemExam | XItemEvent | XItemTimetable

/**
 * Recursively converts Date objects to timestamps for properties matching the given pattern
 */
function convertDatesToTimestamps(obj: any, keyPattern: RegExp): any {
  if (obj === null || obj === undefined) {
    return obj
  }
  if (obj instanceof Date) {
    return obj.getTime()
  }
  if (Array.isArray(obj)) {
    return obj.map(item => convertDatesToTimestamps(item, keyPattern))
  }
  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (keyPattern.test(key)) {
        result[key] = value instanceof Date ? value.getTime() : value
      } else {
        result[key] = convertDatesToTimestamps(value, keyPattern)
      }
    }
    return result
  }
  return obj
}

/**
 * Recursively converts timestamps to Date objects for properties matching the given pattern
 */
function convertTimestampsToDates(obj: any, keyPattern: RegExp): any {
  if (obj === null || obj === undefined) {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(item => convertTimestampsToDates(item, keyPattern))
  }
  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (keyPattern.test(key) && typeof value === 'number') {
        result[key] = new Date(value)
      } else {
        result[key] = convertTimestampsToDates(value, keyPattern)
      }
    }
    return result
  }
  return obj
}

function normalizeProjects(projects: ExchangeFormatV2['projects']): AppState['projects'] {
  if (!projects) {
    return []
  }

  return convertTimestampsToDates(projects, /(At)$/).map(project => ({
    ...project,
    teamMembers: Array.isArray(project.teamMembers)
      ? project.teamMembers
          .map(member => ({
            name: member?.name?.trim() ?? '',
            role: member?.role?.trim() ?? '',
            email: member?.email?.trim() ?? '',
          }))
          .filter(member => member.name.length > 0 || member.role.length > 0 || member.email.length > 0)
      : [],
    yourRoles: Array.isArray(project.yourRoles)
      ? project.yourRoles.filter(role => role?.trim())
      : Array.isArray(project.teamRoles)
        ? project.teamRoles.filter(role => role?.trim())
        : [],
  })) as AppState['projects']
}
