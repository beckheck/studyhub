import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { browser } from 'wxt/browser'

// Import translation files
import enCommon from '../locales/en/common.json'
import enPlanner from '../locales/en/planner.json'
import enProjects from '../locales/en/projects.json'
import enWellness from '../locales/en/wellness.json'
import enSettings from '../locales/en/settings.json'
import enTracker from '../locales/en/tracker.json'
import enTimetable from '../locales/en/timetable.json'
import enDegreePlan from '../locales/en/degreePlan.json'
import enCourseManager from '../locales/en/courseManager.json'
import enSoundtrack from '../locales/en/soundtrack.json'
import enTips from '../locales/en/tips.json'
import enItems from '../items/locales/en/items.json'

import esCommon from '../locales/es/common.json'
import esPlanner from '../locales/es/planner.json'
import esProjects from '../locales/es/projects.json'
import esWellness from '../locales/es/wellness.json'
import esSettings from '../locales/es/settings.json'
import esTracker from '../locales/es/tracker.json'
import esTimetable from '../locales/es/timetable.json'
import esDegreePlan from '../locales/es/degreePlan.json'
import esCourseManager from '../locales/es/courseManager.json'
import esSoundtrack from '../locales/es/soundtrack.json'
import esTips from '../locales/es/tips.json'
import esItems from '../items/locales/es/items.json'

// Translation resources
const resources = {
  en: {
    common: enCommon,
    planner: enPlanner,
    projects: enProjects,
    wellness: enWellness,
    settings: enSettings,
    tracker: enTracker,
    timetable: enTimetable,
    degreePlan: enDegreePlan,
    courseManager: enCourseManager,
    soundtrack: enSoundtrack,
    tips: enTips,
    items: enItems,
  },
  es: {
    common: esCommon,
    planner: esPlanner,
    projects: esProjects,
    wellness: esWellness,
    settings: esSettings,
    tracker: esTracker,
    timetable: esTimetable,
    degreePlan: esDegreePlan,
    courseManager: esCourseManager,
    soundtrack: esSoundtrack,
    tips: esTips,
    items: esItems,
  },
}

// Language detection options
const languageDetectorOptions = {
  order: ['localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
  lookupLocalStorage: 'i18nextLng',
  lookupSessionStorage: 'i18nextLng',
  caches: ['localStorage', 'sessionStorage'],
  excludeCacheFor: ['cimode'],
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common',
      'planner',
      'projects',
      'wellness',
      'settings',
      'tracker',
      'timetable',
      'degreePlan',
      'courseManager',
      'soundtrack',
      'tips',
      'items',
    ],

    detection: languageDetectorOptions,

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    // Additional configuration
    saveMissing: true,
    missingKeyHandler: (lng, ns, key, _fallbackValue) => {
      console.warn(`Missing translation key: ${key} in ${lng.join(',')}:${ns}`)
    },

    // React-specific options
    react: {
      useSuspense: false,
    },
  })
  .catch(error => console.error('i18n initialization failed:', error))

const EXTENSION_STORAGE_LANGUAGE_KEY = 'language'

i18n.on('languageChanged', (newValue: string) => {
  browser.storage?.local.set({ [EXTENSION_STORAGE_LANGUAGE_KEY]: newValue }).catch(console.error)
})

export async function listenLanguageChangeInExtensionBackground() {
  const result = await browser.storage.local.get(EXTENSION_STORAGE_LANGUAGE_KEY)
  changeLanguage(result.language as string | undefined)

  browser.storage.local.onChanged.addListener(changes => {
    if (changes.language) {
      changeLanguage(changes.language.newValue as string | undefined)
    }
  })

  function changeLanguage(newLanguage?: string) {
    if (newLanguage && i18n.language !== newLanguage) {
      i18n.changeLanguage(newLanguage).catch(err => {
        console.error('Failed to change language:', err)
      })
    }
  }
}

export default i18n
export const t = i18n.t.bind(i18n)
