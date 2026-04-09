import { uid } from '@/lib/utils';
import i18next from 'i18next';
import { proxy, snapshot, subscribe } from 'valtio';
import { DataTransfer } from '../lib/data-transfer';
import { hybridStorage } from '../lib/hybrid-storage';
import type { AppState, DegreePlan, MoodEmojis, WeatherLocation, FocusTimerConfig } from '../types';

const STORAGE_KEY = 'sp:appStateExchange';

// Default values
const DEFAULT_COURSES = [
  'Calculus',
  'Chemistry',
  'Linear Algebra',
  'Economics',
  'Programming',
  'Elective',
  'Optional Course',
].map(c => ({
  id: uid(),
  title: c,
}));

export const DEFAULT_MOOD_EMOJIS: MoodEmojis = {
  angry: { emoji: '😠', color: '#ff6b6b', word: 'Angry' },
  sad: { emoji: '😔', color: '#ff9f43', word: 'Sad' },
  neutral: { emoji: '😐', color: '#f7dc6f', word: 'Neutral' },
  happy: { emoji: '🙂', color: '#45b7d1', word: 'Happy' },
  excited: { emoji: '😁', color: '#10ac84', word: 'Excited' },
};

export const DEFAULT_HYDRATION_SETTINGS = {
  useCups: true,
  cupSizeML: 250,
  cupSizeOZ: 8.5,
  dailyGoalML: 2000,
  dailyGoalOZ: 67.6,
  unit: 'metric' as const,
};

export const DEFAULT_FOCUS_TIMER_CONFIG: FocusTimerConfig = {
  audioEnabled: true,
  audioVolume: 0.6,
  notificationsEnabled: true,
  showCountdown: false,
  blockingStrategy: 'disabled',
  sites: [
    '4chan.org',
    'amazon.com',
    'buzzfeed.com',
    'discord.com',
    'disneyplus.com',
    'facebook.com',
    'instagram.com',
    'netflix.com',
    'pinterest.com',
    'primevideo.com',
    'reddit.com',
    'steampowered.com',
    'telegram.org',
    'tiktok.com',
    'twitch.tv',
    'whatsapp.com',
    'x.com',
    'youtube.com',
  ].join('\n'),
};

const DEFAULT_DEGREE_PLAN: DegreePlan = {
  name: 'Degree Plan',
  semesters: [],
  completedCourses: [],
};

const DEFAULT_WEATHER_LOCATION: WeatherLocation = {
  useGeolocation: true,
  city: '',
};

const DEFAULT_DASHBOARD_WIDGET_VISIBILITY = {
  weather: true,
  datetime: true,
  schedule: true,
  nextUp: true,
  calendar: true,
  soundtrack: true,
  tips: true,
};

const DEFAULT_DASHBOARD_WIDGET_ORDER = ['schedule', 'nextUp', 'calendar', 'soundtrack', 'tips'];

// Create the initial state with proper defaults
function createInitialState(): AppState {
  // Detect system preference for dark mode
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

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

    // Academic planning
    degreePlan: { ...DEFAULT_DEGREE_PLAN },

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
    },

    // Active tabs per mode
    activeTabsByMode: {},

    // Focus timer configuration
    focusTimer: { ...DEFAULT_FOCUS_TIMER_CONFIG },

    // Course records for tracking daily notes
    courseRecords: [],
  };
}

// Loading state for UI (needs to be declared before loadState)
export const storeLoadingState = proxy<{
  isLoading: boolean;
  error: string | null;
  status: string;
}>({
  isLoading: true,
  error: null,
  status: tLoadingScreen('initializingStorage'),
});

// Load state from hybrid storage (IndexedDB/BrowserStorage or localStorage) or create initial state
async function loadState(): Promise<AppState> {
  let state = createInitialState();
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      console.log('Not in browser environment, returning initial state');
      return createInitialState();
    }

    storeLoadingState.status = tLoadingScreen('loadingFromStorage', { adapter: hybridStorage.adapterName });

    // Try to load from hybrid storage
    let exchangeData: any = null;
    exchangeData = await hybridStorage.getItem(STORAGE_KEY);

    if (exchangeData) {
      const dataTransfer: DataTransfer = new DataTransfer(
        () => state,
        newState => {
          state = { ...state, ...newState };
        }
      );
      storeLoadingState.status = tLoadingScreen('restoringData');
      dataTransfer.importData(exchangeData);
    } else {
      console.error('Failed to load state from storage');
    }
  } catch (error) {
    console.error('Failed to load state from storage:', error);
  }
  return state;
}

// Create the Valtio store
const initialState = createInitialState();
export const store = proxy<AppState>(initialState);

// Load state asynchronously and update store
storeLoadingState.status = tLoadingScreen('loadingHybridStorage');
loadState()
  .then(loadedState => {
    storeLoadingState.status = tLoadingScreen('updatingApplicationState');
    isApplyingFromStorage = true; // Prevent persistence during initial load
    updateProxyFromState(store, loadedState, false);
    isApplyingFromStorage = false;

    storeLoadingState.isLoading = false;
    storeLoadingState.status = tLoadingScreen('ready');
    storeLoadingState.error = null;

    // Mark store as ready to enable persistence
    isStoreReady = true;

    // Set up cross-context synchronization AFTER store is ready
    setupStorageSynchronization();

    // Do initial persistence to ensure data is saved in hybrid storage with new format
    persistStore().catch(error => {
      console.error('Failed to persist initial state:', error);
    });
  })
  .catch(error => {
    console.error('Failed to load initial state:', error);
    storeLoadingState.isLoading = false;
    storeLoadingState.error = error.message || 'Failed to load application data';
    storeLoadingState.status = tLoadingScreen('errorOccurred');

    // Even on error, mark store as ready to enable persistence of fallback state
    isStoreReady = true;

    // Set up cross-context synchronization even on error
    setupStorageSynchronization();
  });

// Function to update the store state (for data import)
export const patchStoreState = (newState: Partial<AppState>) => {
  updateProxyFromState(store, newState, true);
};

// Data transfer instance for import/export
export const dataTransfer: DataTransfer = new DataTransfer(
  // Get state callback - return the current state snapshot
  () => snapshot(store) as any,
  // Set state callback - update the entire store state using patchStoreState
  newState => {
    patchStoreState(newState);
  }
);

// Flag to track if we're currently applying changes from storage
let isApplyingFromStorage = false;
let isStoreReady = false;

// Subscribe to changes and persist to localStorage (only after store is ready)
subscribe(store, () => {
  // Skip persistence if this change came from a storage event or store is not ready yet
  if (isApplyingFromStorage || !isStoreReady) {
    return;
  }
  persistStore().catch(error => {
    console.error('Failed to persist store changes:', error);
  });
});

export function persistStore(): Promise<void> {
  if (!isStoreReady) {
    return Promise.reject(new Error('Store not ready yet'));
  }
  return new Promise((resolve, reject) => {
    try {
      const exchangeData = dataTransfer.exportData();

      // Use hybrid storage for all contexts (extension and web)
      hybridStorage
        .setItem(STORAGE_KEY, exchangeData)
        .then(() => {
          resolve();
        })
        .catch(error => {
          console.error('Failed to persist state to hybrid storage:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Failed to persist state:', error);
      reject(error);
    }
  });
}

// Function to set up storage synchronization between tabs/contexts
function setupStorageSynchronization() {
  hybridStorage.addChangeListener((key: string, newValue: any) => {
    if (key === STORAGE_KEY && newValue && isStoreReady) {
      try {
        isApplyingFromStorage = true;
        // newValue is already the native object from storage adapters
        dataTransfer.importData(newValue);
      } catch (error) {
        console.error('Failed to handle storage sync:', error);
      } finally {
        setTimeout(() => {
          isApplyingFromStorage = false;
        }, 0);
      }
    }
  });
}

// Listen for storage changes from other tabs (browser's native storage events only)

// File attachment garbage collection function
export const performGarbageCollection = async (): Promise<void> => {
  try {
    const { fileAttachmentStorage } = await import('../lib/file-attachment-storage');

    // Scan all rich text content in the app for file attachment references
    const referencedFileIds = new Set<string>();

    // Helper function to extract file IDs from HTML content
    const extractFileIds = (htmlContent: string) => {
      if (!htmlContent) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const fileAttachments = doc.querySelectorAll('[data-type="file-attachment"]');

      fileAttachments.forEach(element => {
        const fileId = element.getAttribute('data-file-id');
        if (fileId) {
          referencedFileIds.add(fileId);
        }
      });
    };

    // Get current store state
    const currentStore = snapshot(store) as AppState;

    // Scan items for file attachments in notes
    currentStore.items.forEach(event => {
      if (event.notes) {
        extractFileIds(event.notes);
      }
    });

    // Include syllabus files from courses
    currentStore.courses.forEach(course => {
      if (course.syllabusFileId) {
        referencedFileIds.add(course.syllabusFileId);
      }
    });

    // Perform cleanup
    const deletedCount = await fileAttachmentStorage.cleanupOrphanedFiles(referencedFileIds);

    if (deletedCount > 0) {
      console.log(`File attachment garbage collection: Cleaned up ${deletedCount} orphaned files`);
    }
  } catch (error) {
    console.error('File attachment garbage collection failed:', error);
  }
};

// Helper function to recursively update proxy properties
function updateProxyFromState(proxy: any, newState: any, patch = false) {
  if (!patch) {
    // Remove properties that don't exist in newState
    Object.keys(proxy).forEach(key => {
      if (!(key in newState)) {
        delete proxy[key];
      }
    });
  }

  // Update/add properties from newState
  Object.keys(newState).forEach(key => {
    const newValue = newState[key];
    const currentValue = proxy[key];

    if (Array.isArray(newValue)) {
      // For arrays, update in place to maintain valtio reactivity
      if (Array.isArray(currentValue)) {
        // Clear existing array and add new items
        currentValue.length = 0;
        currentValue.push(...newValue);
      } else {
        // Replace with new array if current is not an array
        proxy[key] = newValue;
      }
    } else if (newValue && typeof newValue === 'object') {
      // For nested objects, recursively update if current value is also an object
      if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
        updateProxyFromState(currentValue, newValue, patch);
      } else {
        // Replace with new object if current is not an object
        proxy[key] = newValue;
      }
    } else {
      // For primitive values, direct assignment
      proxy[key] = newValue;
    }
  });
}

// Translation helper for store loading messages
function tLoadingScreen(key: string, options?: { adapter?: string }) {
  return i18next.t(`common:loadingScreen.${key}`, options);
}
