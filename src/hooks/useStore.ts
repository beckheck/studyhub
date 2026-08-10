import { useEffect } from 'react'
import { useSnapshot } from 'valtio'
import { uid } from '../lib/utils'
import { store, storeLoadingState } from '../stores/app'
import type {
  Course,
  CourseContact,
  CourseRecord,
  DegreePlan,
  ExamGrade,
  Item,
  Project,
  SoundtrackPosition,
  StudySession,
  StudySessionTask,
  SemesterDates,
  WeatherLocation,
  WeeklyGoal,
  GoogleCalendarConfig,
} from '../types'

const DEFAULT_DASHBOARD_WIDGET_ORDER = ['schedule', 'nextUp', 'calendar', 'soundtrack', 'tips']

// Hook for loading state
export function useStoreLoading() {
  const loadingState = useSnapshot(storeLoadingState)
  return loadingState
}
/**
 * Main hook to access the entire app state snapshot
 */
export function useAppState() {
  return useSnapshot(store)
}

/**
 * Hook to access and modify dashboard widget layout
 */
export function useDashboardLayout() {
  const dashboard = useSnapshot(store.dashboard)

  return {
    dashboard,
    missionText: dashboard.missionText ?? '',
    missionLink: dashboard.missionLink ?? '',
    setMissionText: (missionText: string) => {
      store.dashboard.missionText = missionText
    },
    setMissionLink: (missionLink: string) => {
      store.dashboard.missionLink = missionLink
    },
    setWidgetVisibility: (widgetId: string, visible: boolean) => {
      store.dashboard.widgetVisibility[widgetId] = visible
    },
    toggleWidgetVisibility: (widgetId: string) => {
      const currentVisibility = store.dashboard.widgetVisibility[widgetId] !== false
      store.dashboard.widgetVisibility[widgetId] = !currentVisibility
    },
    setWidgetOrder: (widgetOrder: string[]) => {
      store.dashboard.widgetOrder = widgetOrder
    },
    moveWidgetBefore: (widgetId: string, targetWidgetId: string) => {
      const currentOrder = [...(store.dashboard.widgetOrder ?? DEFAULT_DASHBOARD_WIDGET_ORDER)]
      const fromIndex = currentOrder.indexOf(widgetId)
      const targetIndex = currentOrder.indexOf(targetWidgetId)

      if (fromIndex === -1 || targetIndex === -1 || widgetId === targetWidgetId) {
        return
      }

      currentOrder.splice(fromIndex, 1)

      const adjustedTargetIndex = currentOrder.indexOf(targetWidgetId)
      currentOrder.splice(adjustedTargetIndex, 0, widgetId)
      store.dashboard.widgetOrder = currentOrder
    },
    moveWidgetToEnd: (widgetId: string) => {
      const currentOrder = [...(store.dashboard.widgetOrder ?? DEFAULT_DASHBOARD_WIDGET_ORDER)]
      const fromIndex = currentOrder.indexOf(widgetId)

      if (fromIndex === -1 || fromIndex === currentOrder.length - 1) {
        return
      }

      currentOrder.splice(fromIndex, 1)
      currentOrder.push(widgetId)
      store.dashboard.widgetOrder = currentOrder
    },
    isWidgetCollapsed: (widgetId: string) => {
      return store.dashboard.widgetCollapsed?.[widgetId] === true
    },
    setWidgetCollapsed: (widgetId: string, collapsed: boolean) => {
      if (!store.dashboard.widgetCollapsed) {
        store.dashboard.widgetCollapsed = {}
      }
      store.dashboard.widgetCollapsed[widgetId] = collapsed
    },
  }
}

/**
 * Hook to access and modify courses
 */
export function useCourses() {
  const state = useSnapshot(store)

  const clearCourseData = (courseId: string) => {
    // Clear exams and their grades
    const examIdsToDelete: string[] = []

    // Clear items
    for (let i = store.items.length - 1; i >= 0; i--) {
      if (store.items[i].courseId === courseId) {
        if (store.items[i].type === 'exam') {
          examIdsToDelete.push(store.items[i].id)
        }
        store.items.splice(i, 1)
      }
    }

    // Clear exam grades for deleted exams
    for (let i = store.examGrades.length - 1; i >= 0; i--) {
      if (examIdsToDelete.includes(store.examGrades[i].examId)) {
        store.examGrades.splice(i, 1)
      }
    }

    // Clear study sessions
    for (let i = store.sessions.length - 1; i >= 0; i--) {
      if (store.sessions[i].courseId === courseId) {
        store.sessions.splice(i, 1)
      }
    }
  }

  return {
    courses: state.courses,
    selectedCourseId: state.selectedCourseId,
    getCourseById: (courseId: string) => {
      return state.courses.find(c => c.id === courseId)
    },
    getCourseTitle: (courseId?: string) => {
      return state.courses.find(c => c.id === courseId)?.title || ''
    },
    setSelectedCourse: (courseId: string) => {
      store.selectedCourseId = courseId
    },
    renameCourse: (courseId: string, title: string) => {
      const course = store.courses.find(c => c.id === courseId)
      if (course) {
        course.title = title
      }
    },
    addCourse: (title: string, emoji?: string) => {
      const newCourse = { id: uid(), title, emoji: emoji || '📚' }
      store.courses.push(newCourse)
      // If this is the first course, select it
      if (store.courses.length === 1) {
        store.selectedCourseId = newCourse.id
      }
      return newCourse
    },
    /**
     * Clear all data related to a specific course
     */
    clearCourseData,
    removeCourse: (courseId: string) => {
      // Don't allow removing if it's the only course
      if (store.courses.length <= 1) {
        return false
      }

      // Clear all data related to this course first
      clearCourseData(courseId)

      // Remove the course
      const courseIndex = store.courses.findIndex(c => c.id === courseId)
      if (courseIndex !== -1) {
        store.courses.splice(courseIndex, 1)

        // If the removed course was selected, select another one
        if (store.selectedCourseId === courseId) {
          store.selectedCourseId = store.courses[0]?.id || ''
        }
      }
      return true
    },
    setCourses: (courses: Course[]) => {
      store.courses = courses
    },
    updateCourseSyllabus: (courseId: string, syllabusFileId: string | undefined) => {
      const course = store.courses.find(c => c.id === courseId)
      if (course) {
        course.syllabusFileId = syllabusFileId
      }
    },
    updateCourseEmoji: (courseId: string, emoji: string) => {
      const course = store.courses.find(c => c.id === courseId)
      if (course) {
        course.emoji = emoji
      }
    },
    updateCourseLinks: (courseId: string, links: { label: string; url: string }[]) => {
      const course = store.courses.find(c => c.id === courseId)
      if (course) {
        course.links = links
      }
    },
    updateCourseContacts: (courseId: string, contacts: CourseContact[]) => {
      const course = store.courses.find(c => c.id === courseId)
      if (course) {
        course.contacts = contacts
      }
    },
  }
}

/**
 * Hook to access and modify exams
 */
export function useExamGrades() {
  const state = useSnapshot(store)

  return {
    examGrades: state.examGrades,

    setExamGrades: (grades: ExamGrade[]) => {
      store.examGrades = grades
    },
  }
}

/**
 * Hook to access and modify study sessions
 */
export function useStudySessions() {
  const sessions = useSnapshot(store.sessions)
  const sessionTasks = useSnapshot(store.sessionTasks)

  return {
    sessions,
    sessionTasks,
    setSessions: (sessions: StudySession[]) => {
      store.sessions = sessions
    },
    setSessionTasks: (tasks: StudySessionTask[]) => {
      store.sessionTasks = tasks
    },
    addSession: (session: StudySession) => {
      store.sessions.unshift(session)
    },
    deleteSession: (id: string) => {
      const sessionIndex = store.sessions.findIndex(s => s.id === id)
      if (sessionIndex !== -1) {
        store.sessions.splice(sessionIndex, 1)
      }
    },
    updateSession: (id: string, updates: Partial<StudySession>) => {
      const sessionIndex = store.sessions.findIndex(s => s.id === id)
      if (sessionIndex !== -1) {
        store.sessions[sessionIndex] = { ...store.sessions[sessionIndex], ...updates }
      }
    },
    addSessionTask: (title: string) => {
      const task = { id: uid(), title, done: false, createdAt: Date.now() }
      store.sessionTasks.unshift(task)
    },
    toggleSessionTask: (id: string) => {
      const taskIndex = store.sessionTasks.findIndex(t => t.id === id)
      if (taskIndex !== -1) {
        store.sessionTasks[taskIndex].done = !store.sessionTasks[taskIndex].done
      }
    },
    deleteSessionTask: (id: string) => {
      const taskIndex = store.sessionTasks.findIndex(t => t.id === id)
      if (taskIndex !== -1) {
        store.sessionTasks.splice(taskIndex, 1)
      }
    },
    clearCompletedSessionTasks: () => {
      store.sessionTasks = store.sessionTasks.filter(t => !t.done)
    },
  }
}

/**
 * Hook to access and modify theme settings
 */
export function useTheme() {
  // Only subscribe to theme changes, not the entire store
  const theme = useSnapshot(store.theme)

  return {
    theme,
    setDarkMode: (darkMode: boolean) => {
      store.theme.darkMode = darkMode
    },
    setBgImage: (bgImage: string) => {
      store.theme.bgImage = bgImage
    },
    setCustomCursor: (customCursor: string) => {
      store.theme.customCursor = customCursor
    },
    setAccentColor: (accentColor: typeof theme.accentColor) => {
      store.theme.accentColor = accentColor
    },
    setCardOpacity: (cardOpacity: typeof theme.cardOpacity) => {
      store.theme.cardOpacity = cardOpacity
    },
    setGradientEnabled: (gradientEnabled: boolean) => {
      store.theme.gradientEnabled = gradientEnabled
    },
    setGradientStart: (gradientStart: typeof theme.gradientStart) => {
      store.theme.gradientStart = gradientStart
    },
    setGradientMiddle: (gradientMiddle: typeof theme.gradientMiddle) => {
      store.theme.gradientMiddle = gradientMiddle
    },
    setGradientEnd: (gradientEnd: typeof theme.gradientEnd) => {
      store.theme.gradientEnd = gradientEnd
    },
  }
}

/**
 * Hook to access and modify weather settings
 */
export function useWeather() {
  const weather = useSnapshot(store.weather)

  return {
    weather,
    setWeatherApiKey: (key: string) => {
      store.weather.apiKey = key
    },
    setWeatherLocation: (location: WeatherLocation) => {
      store.weather.location = location
    },
  }
}

/**
 * Hook to access and modify semester date settings
 */
export function useSemesterDates() {
  const semesterDates = useSnapshot(store.semesterDates)

  return {
    semesterDates,
    setSemesterDates: (updates: Partial<SemesterDates>) => {
      store.semesterDates = {
        ...store.semesterDates,
        ...updates,
      }
    },
  }
}

/**
 * Hook to access and modify soundtrack settings
 */
export function useSoundtrack() {
  const soundtrack = useSnapshot(store.soundtrack)

  return {
    soundtrack,
    setSoundtrackEmbed: (embed: string) => {
      store.soundtrack.embed = embed
    },
    setSoundtrackPosition: (position: SoundtrackPosition) => {
      store.soundtrack.position = position
    },
  }
}

/**
 * Hook to access and modify focus timer settings
 */
export function useFocusTimer() {
  const focusTimer = useSnapshot(store.focusTimer)

  return {
    focusTimer,
    setAudioEnabled: (audioEnabled: boolean) => {
      store.focusTimer.audioEnabled = audioEnabled
    },
    setAudioVolume: (audioVolume: number) => {
      store.focusTimer.audioVolume = audioVolume
    },
    setNotificationsEnabled: (notificationsEnabled: boolean) => {
      store.focusTimer.notificationsEnabled = notificationsEnabled
    },
    setShowCountdown: (showCountdown: boolean) => {
      store.focusTimer.showCountdown = showCountdown
    },
    setBlockingStrategy: (blockingStrategy: 'blacklist' | 'whitelist' | 'disabled') => {
      store.focusTimer.blockingStrategy = blockingStrategy
    },
    setSites: (sites: string) => {
      store.focusTimer.sites = sites
    },
  }
}

/**
 * Hook to access and modify degree plan
 */
export function useDegreePlan() {
  const degreePlan = useSnapshot(store.degreePlan)

  return {
    degreePlan,
    setDegreePlan: (degreePlanOrUpdater: DegreePlan | ((prev: DegreePlan) => DegreePlan)) => {
      if (typeof degreePlanOrUpdater === 'function') {
        const updater = degreePlanOrUpdater as (prev: DegreePlan) => DegreePlan
        store.degreePlan = updater(store.degreePlan)
      } else {
        store.degreePlan = degreePlanOrUpdater
      }
    },
    setDegreePlanName: (name: string) => {
      store.degreePlan.name = name
    },
    setSemesters: (semesters: any[]) => {
      store.degreePlan.semesters = semesters
    },
    setCompletedCourses: (completedCourses: string[]) => {
      store.degreePlan.completedCourses = completedCourses
    },
    addCompletedCourse: (courseAcronym: string) => {
      if (!store.degreePlan.completedCourses.includes(courseAcronym)) {
        store.degreePlan.completedCourses.push(courseAcronym)
      }
    },
    removeCompletedCourse: (courseAcronym: string) => {
      const index = store.degreePlan.completedCourses.indexOf(courseAcronym)
      if (index > -1) {
        store.degreePlan.completedCourses.splice(index, 1)
      }
    },
    removeSemester: (semesterNumber: number) => {
      const semester = store.degreePlan.semesters.find(s => s.number === semesterNumber)
      if (!semester) return

      // Remove the semester (now allows removing non-empty semesters with confirmation)
      const filteredSemesters = store.degreePlan.semesters.filter(s => s.number !== semesterNumber)

      // Renumber remaining semesters
      const renumberedSemesters = filteredSemesters.map((sem, index) => ({
        ...sem,
        number: index + 1,
      }))

      store.degreePlan.semesters = renumberedSemesters
    },
  }
}

/**
 * Hook to access and modify wellness data
 */
export function useWellness() {
  const wellness = useSnapshot(store.wellness)

  return {
    wellness,
    setWater: (water: number) => {
      store.wellness.water = water
    },
    setGratitude: (gratitude: string) => {
      store.wellness.gratitude = gratitude
    },
    setMoodPercentages: (percentages: Record<string, number>) => {
      store.wellness.moodPercentages = percentages
    },
    setHasInteracted: (hasInteracted: boolean) => {
      store.wellness.hasInteracted = hasInteracted
    },
    setMonthlyMoods: (monthlyMoods: typeof wellness.monthlyMoods) => {
      store.wellness.monthlyMoods = monthlyMoods
    },
    setShowWords: (showWords: boolean) => {
      store.wellness.showWords = showWords
    },
    setMoodEmojis: (moodEmojis: typeof wellness.moodEmojis) => {
      store.wellness.moodEmojis = moodEmojis
    },
    setHydrationSettings: (hydrationSettings: typeof wellness.hydrationSettings) => {
      store.wellness.hydrationSettings = hydrationSettings
    },
    setDailyHydration: (dailyHydration: typeof wellness.dailyHydration) => {
      store.wellness.dailyHydration = dailyHydration
    },
  }
}

/**
 * Hook to access and modify weekly goals
 */
export function useWeeklyGoals() {
  const weeklyGoals = useSnapshot(store.weeklyGoals)

  return {
    weeklyGoals,
    addGoal: (title: string) => {
      if (!title.trim()) return
      const newGoal: WeeklyGoal = {
        id: uid(),
        title: title.trim(),
        completed: false,
        createdAt: Date.now(),
      }
      store.weeklyGoals.push(newGoal)
    },
    toggleGoal: (id: string) => {
      const goalIndex = store.weeklyGoals.findIndex(goal => goal.id === id)
      if (goalIndex !== -1) {
        const goal = store.weeklyGoals[goalIndex]
        const isBeingCompleted = !goal.completed

        // Generate random color when completing (but keep existing color if uncompleting)
        const colors = [
          '#ff6b6b',
          '#4ecdc4',
          '#45b7d1',
          '#96ceb4',
          '#ffeaa7',
          '#dda0dd',
          '#98d8c8',
          '#f7dc6f',
          '#bb8fce',
          '#85c1e9',
          '#f8c471',
          '#82e0aa',
          '#f1948a',
          '#85c1e9',
          '#d7bde2',
          '#ff9ff3',
          '#54a0ff',
          '#5f27cd',
          '#00d2d3',
          '#ff9f43',
          '#10ac84',
          '#ee5a24',
          '#0984e3',
          '#6c5ce7',
          '#a29bfe',
        ]

        store.weeklyGoals[goalIndex] = {
          ...goal,
          completed: isBeingCompleted,
          color: isBeingCompleted ? goal.color || colors[Math.floor(Math.random() * colors.length)] : goal.color,
        }

        // Check if all goals are completed and return status
        return {
          allCompleted: store.weeklyGoals.every(g => g.completed) && store.weeklyGoals.length > 0,
        }
      }
      return { allCompleted: false }
    },
    deleteGoal: (id: string) => {
      const goalIndex = store.weeklyGoals.findIndex(goal => goal.id === id)
      if (goalIndex !== -1) {
        store.weeklyGoals.splice(goalIndex, 1)
      }
    },
    clearAllGoals: () => {
      store.weeklyGoals.length = 0
    },
  }
}

/**
 * Hook to access and modify items
 */
export function useItems() {
  const items = useSnapshot(store.items)

  return {
    items,
    getItemById: (id: string) => {
      return items.find(item => item.id === id)
    },
    getItemsByType: (type: Item['type']) => {
      return items.filter(item => item.type === type)
    },
    getItemsByCourse: (courseId: string) => {
      return items.filter(item => item.courseId === courseId)
    },
    getItemsByProject: (projectId: string) => {
      return items.filter(item => item.projectId === projectId)
    },
    addItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date()
      const newItem = {
        ...item,
        id: uid(),
        createdAt: now,
        updatedAt: now,
      } as Item
      store.items.unshift(newItem)
      return newItem
    },
    updateItem: (id: string, updates: Partial<Omit<Item, 'id' | 'createdAt'>>) => {
      const itemIndex = store.items.findIndex(item => item.id === id)
      if (itemIndex !== -1) {
        const currentItem = store.items[itemIndex]
        store.items[itemIndex] = {
          ...currentItem,
          ...updates,
          updatedAt: new Date(),
        } as Item
        return store.items[itemIndex]
      }
      return null
    },
    deleteItem: (id: string) => {
      const itemIndex = store.items.findIndex(item => item.id === id)
      if (itemIndex !== -1) {
        store.items.splice(itemIndex, 1)

        // Remove associated grades
        const gradeIndices: number[] = []
        for (let i = store.examGrades.length - 1; i >= 0; i--) {
          if (store.examGrades[i].examId === id) {
            gradeIndices.push(i)
          }
        }
        gradeIndices.forEach(index => store.examGrades.splice(index, 1))

        return true
      }
      return false
    },
    softDeleteItem: (id: string) => {
      const itemIndex = store.items.findIndex(item => item.id === id)
      if (itemIndex !== -1) {
        store.items[itemIndex].isDeleted = true
        store.items[itemIndex].updatedAt = new Date()
        return true
      }
      return false
    },
    restoreItem: (id: string) => {
      const itemIndex = store.items.findIndex(item => item.id === id)
      if (itemIndex !== -1) {
        store.items[itemIndex].isDeleted = false
        store.items[itemIndex].updatedAt = new Date()
        return true
      }
      return false
    },
    clearCourseItems: (courseId: string) => {
      for (let i = store.items.length - 1; i >= 0; i--) {
        if (store.items[i].courseId === courseId) {
          store.items.splice(i, 1)
        }
      }
    },
    setItems: (items: Item[]) => {
      store.items = items
    },
  }
}

/**
 * Hook to access and modify projects
 */
export function useProjects() {
  const projects = useSnapshot(store.projects)

  return {
    projects,
    getProjectById: (projectId: string) => {
      return projects.find(project => project.id === projectId)
    },
    addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date()
      const newProject = {
        ...project,
        id: uid(),
        createdAt: now,
        updatedAt: now,
      } as Project
      store.projects.unshift(newProject)
      return newProject
    },
    updateProject: (projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => {
      const projectIndex = store.projects.findIndex(project => project.id === projectId)
      if (projectIndex !== -1) {
        store.projects[projectIndex] = {
          ...store.projects[projectIndex],
          ...updates,
          updatedAt: new Date(),
        } as Project
        return store.projects[projectIndex]
      }
      return null
    },
    deleteProject: (projectId: string) => {
      const projectIndex = store.projects.findIndex(project => project.id === projectId)
      if (projectIndex !== -1) {
        store.projects.splice(projectIndex, 1)

        return true
      }
      return false
    },
    setProjects: (projectList: Project[]) => {
      store.projects = projectList
    },
  }
}

/**
 * Hook to access and modify course records (daily notes/activity logs)
 */
export function useCourseRecords() {
  // Use full store snapshot to handle cases where courseRecords might not exist yet
  // (e.g., after loading from older saved state without this field)
  const state = useSnapshot(store)
  const courseRecords = state.courseRecords ?? []

  // Ensure store.courseRecords exists for mutations (run once on mount)
  useEffect(() => {
    if (!store.courseRecords) {
      store.courseRecords = []
    }
  }, [])

  return {
    courseRecords,

    getRecordsByDate: (date: string) => {
      return courseRecords.filter(record => record.date === date)
    },

    getRecordsByCourse: (courseId: string) => {
      return courseRecords.filter(record => record.courseId === courseId)
    },

    getRecordsByCourseAndDate: (courseId: string, date: string) => {
      return courseRecords.filter(record => record.courseId === courseId && record.date === date)
    },

    getRecordsForMonth: (courseId: string, year: number, month: number) => {
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
      return courseRecords.filter(record => record.courseId === courseId && record.date.startsWith(monthStr))
    },

    addRecord: (record: Omit<CourseRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date()
      const newRecord: CourseRecord = {
        ...record,
        id: uid(),
        createdAt: now,
        updatedAt: now,
      }
      if (!store.courseRecords) {
        store.courseRecords = []
      }
      store.courseRecords.unshift(newRecord)
      return newRecord
    },

    updateRecord: (id: string, updates: Partial<Omit<CourseRecord, 'id' | 'createdAt'>>) => {
      if (!store.courseRecords) return null
      const recordIndex = store.courseRecords.findIndex(r => r.id === id)
      if (recordIndex !== -1) {
        store.courseRecords[recordIndex] = {
          ...store.courseRecords[recordIndex],
          ...updates,
          updatedAt: new Date(),
        }
        return store.courseRecords[recordIndex]
      }
      return null
    },

    deleteRecord: (id: string) => {
      if (!store.courseRecords) return false
      const recordIndex = store.courseRecords.findIndex(r => r.id === id)
      if (recordIndex !== -1) {
        store.courseRecords.splice(recordIndex, 1)
        return true
      }
      return false
    },

    clearCourseRecords: (courseId: string) => {
      if (!store.courseRecords) return
      for (let i = store.courseRecords.length - 1; i >= 0; i--) {
        if (store.courseRecords[i].courseId === courseId) {
          store.courseRecords.splice(i, 1)
        }
      }
    },
  }
}

/**
 * Hook to access and modify Google Calendar configuration
 */
export function useGoogleCalendar() {
  const googleCalendar = useSnapshot(store.googleCalendar)

  return {
    googleCalendar,
    setGoogleCalendarConfig: (config: Partial<GoogleCalendarConfig>) => {
      store.googleCalendar = { ...store.googleCalendar, ...config }
    },
    setAccessToken: (token: string, expiresAt: number) => {
      store.googleCalendar.accessToken = token
      store.googleCalendar.tokenExpiresAt = expiresAt
    },
    setRefreshToken: (token: string) => {
      store.googleCalendar.refreshToken = token
    },
    setCalendars: (calendars: Array<{ id: string; summary: string }>) => {
      store.googleCalendar.calendars = calendars
    },
    setSelectedCalendar: (calendarId: string) => {
      store.googleCalendar.calendarId = calendarId
    },
    setSyncEnabled: (enabled: boolean) => {
      store.googleCalendar.syncEnabled = enabled
    },
    clearGoogleCalendar: () => {
      store.googleCalendar = {
        syncEnabled: false,
      }
    },
  }
}
