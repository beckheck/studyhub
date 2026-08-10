import { FileAttachmentStorage, type FileRepository } from '@/lib/file-attachment-storage'
import { uid } from '@/lib/utils'
import i18next from 'i18next'
import { proxy, snapshot, subscribe } from 'valtio'
import { createRepository } from '../lib/repository'
import { deserialize, serialize } from '../lib/data-transfer'
import { migrateV1ToV2 } from '../lib/migrations/v1-to-v2'
import { hybridStorage } from '../lib/hybrid-storage'
import type {
  AppState,
  DegreePlan,
  FileAttachmentMetadata,
  StoredFileAttachment,
  WeatherLocation,
  SemesterDates,
} from '../types'

const STORAGE_KEY = 'sp:appStateExchange'

// Default values
const DEFAULT_COURSE_EMOJIS = ['📐', '🧪', '📊', '💹', '💻', '🎨', '📝']

const DEFAULT_COURSES = [
  'Calculus',
  'Chemistry',
  'Linear Algebra',
  'Economics',
  'Programming',
  'Elective',
  'Optional Course',
].map((c, index) => ({
  id: uid(),
  title: c,
  emoji: DEFAULT_COURSE_EMOJIS[index] ?? '📚',
}))

export { DEFAULT_FOCUS_TIMER_CONFIG, DEFAULT_HYDRATION_SETTINGS, DEFAULT_MOOD_EMOJIS } from '@/lib/defaults'
import { DEFAULT_FOCUS_TIMER_CONFIG, DEFAULT_HYDRATION_SETTINGS, DEFAULT_MOOD_EMOJIS } from '@/lib/defaults'

const DEFAULT_DEGREE_PLAN: DegreePlan = {
  name: 'Degree Plan',
  semesters: [],
  completedCourses: [],
}

const DEFAULT_WEATHER_LOCATION: WeatherLocation = {
  useGeolocation: true,
  city: '',
}

const DEFAULT_SEMESTER_DATES: SemesterDates = {
  firstSemesterStart: '',
  firstSemesterEnd: '',
  secondSemesterStart: '',
  secondSemesterEnd: '',
  finalsStart: '',
  finalsEnd: '',
  recessWeekStart: '',
  recessWeekEnd: '',
  winterBreakStart: '',
  winterBreakEnd: '',
}

export const DEFAULT_DASHBOARD_WIDGET_VISIBILITY = {
  weather: true,
  datetime: true,
  schedule: true,
  nextUp: true,
  calendar: true,
  soundtrack: true,
  tips: true,
}

export const DEFAULT_DASHBOARD_WIDGET_ORDER = ['schedule', 'nextUp', 'calendar', 'soundtrack', 'tips']
const DEFAULT_DASHBOARD_MISSION_TEXT = ''

// Create the initial state with proper defaults
function createInitialState(): AppState {
  // Detect system preference for dark mode
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

  return {
    // Core data
    sessions: [],
    examGrades: [],
    sessionTasks: [],
    weeklyGoals: [],
    items: [],
    courses: [...DEFAULT_COURSES],
    projects: [],
    selectedCourseId: DEFAULT_COURSES[0]?.id,

    // Theme configuration
    theme: {
      darkMode: prefersDark,
      bgImage: '',
      customCursor: '',
      accentColor: { light: '#7c3aed', dark: '#8b5cf6' },
      cardOpacity: { light: 0.8, dark: 0.25 },
      gradientEnabled: true,
      gradientStart: { light: '#ffd2e9', dark: '#18181b' },
      gradientMiddle: { light: '#bae6fd', dark: '#0f172a' },
      gradientEnd: { light: '#a7f3d0', dark: '#1e293b' },
    },

    // External services
    soundtrack: {
      embed: '',
      position: 'dashboard',
    },
    weather: {
      apiKey: '',
      location: { ...DEFAULT_WEATHER_LOCATION },
    },
    googleCalendar: {
      syncEnabled: false,
    },

    // Academic planning
    degreePlan: { ...DEFAULT_DEGREE_PLAN },

    // Semester dates
    semesterDates: { ...DEFAULT_SEMESTER_DATES },

    // Wellness tracking
    wellness: {
      water: 0,
      gratitude: '',
      moodPercentages: {},
      hasInteracted: false,
      monthlyMoods: {},
      showWords: true,
      moodEmojis: { ...DEFAULT_MOOD_EMOJIS },
      hydrationSettings: { ...DEFAULT_HYDRATION_SETTINGS },
      dailyHydration: {},
    },

    // File attachments
    fileAttachments: {
      files: {},
      metadata: {},
    },

    // Dashboard widget layout
    dashboard: {
      widgetVisibility: { ...DEFAULT_DASHBOARD_WIDGET_VISIBILITY },
      widgetOrder: [...DEFAULT_DASHBOARD_WIDGET_ORDER],
      widgetCollapsed: {},
      missionText: DEFAULT_DASHBOARD_MISSION_TEXT,
      missionLink: '',
    },

    // Active tabs per mode
    activeTabsByMode: {},

    // Focus timer configuration
    focusTimer: { ...DEFAULT_FOCUS_TIMER_CONFIG },

    // Course records for tracking daily notes
    courseRecords: [],
  }
}

// Loading state for UI (needs to be declared before loadState)
export const storeLoadingState = proxy<{
  isLoading: boolean
  error: string | null
  status: string
}>({
  isLoading: true,
  error: null,
  status: tLoadingScreen('initializingStorage'),
})

// Create the repository for app state persistence.
// See ADR 0004: repository seam for app state.
const repo = createRepository<AppState>({
  storage: hybridStorage,
  storageKey: STORAGE_KEY,
  serialize,
  deserialize,
  migrations: [{ from: '2', to: '2', migrate: migrateV1ToV2 }],
})

// Flag to track if we're currently applying changes from storage
let isApplyingFromStorage = false
let isStoreReady = false

// Load state from hybrid storage (IndexedDB/BrowserStorage or localStorage) or create initial state
async function loadState(): Promise<AppState> {
  if (typeof window === 'undefined') {
    console.log('Not in browser environment, returning initial state')
    return createInitialState()
  }

  storeLoadingState.status = tLoadingScreen('loadingFromStorage', { adapter: hybridStorage.adapterName })
  const state = await repo.load(createInitialState)
  storeLoadingState.status = tLoadingScreen('restoringData')
  return state
}

// Create the Valtio store
const initialState = createInitialState()
export const store = proxy<AppState>(initialState)

// Load state asynchronously and update store
storeLoadingState.status = tLoadingScreen('loadingHybridStorage')
loadState()
  .then(loadedState => {
    storeLoadingState.status = tLoadingScreen('updatingApplicationState')
    isApplyingFromStorage = true // Prevent persistence during initial load
    repo.patch(store, loadedState)
    isApplyingFromStorage = false

    storeLoadingState.isLoading = false
    storeLoadingState.status = tLoadingScreen('ready')
    storeLoadingState.error = null

    // Mark store as ready to enable persistence
    isStoreReady = true

    // Set up cross-context synchronization AFTER store is ready
    setupStorageSynchronization()

    // Do initial persistence to ensure data is saved in hybrid storage with new format
    persistStore().catch(error => {
      console.error('Failed to persist initial state:', error)
    })
  })
  .catch(error => {
    console.error('Failed to load initial state:', error)
    storeLoadingState.isLoading = false
    storeLoadingState.error = error.message || 'Failed to load application data'
    storeLoadingState.status = tLoadingScreen('errorOccurred')

    // Even on error, mark store as ready to enable persistence of fallback state
    isStoreReady = true

    // Set up cross-context synchronization even on error
    setupStorageSynchronization()
  })

// Function to update the store state (for data import)
export const patchStoreState = (newState: Partial<AppState>) => {
  repo.patch(store, { ...(snapshot(store) as any), ...newState })
}

// Subscribe to changes and persist to storage (only after store is ready)
subscribe(store, () => {
  if (isApplyingFromStorage || !isStoreReady) {
    return
  }
  persistStore().catch(error => {
    console.error('Failed to persist store changes:', error)
  })
})

export function persistStore(): Promise<void> {
  if (!isStoreReady) {
    return Promise.reject(new Error('Store not ready yet'))
  }
  return repo.save(snapshot(store) as AppState)
}

// Cross-context synchronization.
// See ADR 0004: the setTimeout(0) is kept to match the proven synchronization pattern.
function setupStorageSynchronization() {
  repo.subscribe(state => {
    if (!isStoreReady) return
    try {
      isApplyingFromStorage = true
      repo.patch(store, state)
    } catch (error) {
      console.error('Failed to handle storage sync:', error)
    } finally {
      setTimeout(() => {
        isApplyingFromStorage = false
      }, 0)
    }
  })
}

// Listen for storage changes from other tabs (browser's native storage events only)

// File attachment storage: store-backed repository adapter.
// See ADR 0003: lib modules do not import the store; the store supplies a repository adapter.
const fileRepository: FileRepository = {
  async getFile(fileId: string): Promise<StoredFileAttachment | null> {
    return store.fileAttachments.files[fileId] || null
  },
  async getFileMetadata(fileId: string): Promise<FileAttachmentMetadata | null> {
    return store.fileAttachments.metadata[fileId] || null
  },
  async putFile(stored: StoredFileAttachment): Promise<void> {
    store.fileAttachments.files[stored.id] = stored
    store.fileAttachments.metadata[stored.id] = {
      id: stored.id,
      fileName: stored.fileName,
      fileSize: stored.fileSize,
      fileType: stored.fileType,
      uploadedAt: stored.uploadedAt,
    }
  },
  async deleteFile(fileId: string): Promise<boolean> {
    delete store.fileAttachments.files[fileId]
    delete store.fileAttachments.metadata[fileId]
    return true
  },
  async listMetadata(): Promise<FileAttachmentMetadata[]> {
    return Object.values(store.fileAttachments.metadata)
  },
}

export const fileAttachmentStorage = new FileAttachmentStorage(fileRepository)

// Translation helper for store loading messages
function tLoadingScreen(key: string, options?: { adapter?: string }) {
  return i18next.t(`common:loadingScreen.${key}`, options)
}
