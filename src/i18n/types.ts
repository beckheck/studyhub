import 'react-i18next'
import type common from '../locales/en/common.json'
import type planner from '../locales/en/planner.json'
import type wellness from '../locales/en/wellness.json'
import type settings from '../locales/en/settings.json'
import type tracker from '../locales/en/tracker.json'
import type timetable from '../locales/en/timetable.json'
import type degreePlan from '../locales/en/degreePlan.json'
import type courseManager from '../locales/en/courseManager.json'
import type soundtrack from '../locales/en/soundtrack.json'
import type tips from '../locales/en/tips.json'

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      planner: typeof planner
      wellness: typeof wellness
      settings: typeof settings
      tracker: typeof tracker
      timetable: typeof timetable
      degreePlan: typeof degreePlan
      courseManager: typeof courseManager
      soundtrack: typeof soundtrack
      tips: typeof tips
    }
  }
}

export {}
