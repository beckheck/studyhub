import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useScrollToTop } from '@/hooks/useScrollToTop'
import { useSettingsDialog } from '@/hooks/useSettingsDialog'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function SettingsTab() {
  const { t } = useTranslation('settings')
  const { scrollToTop } = useScrollToTop()
  const { settingsDialogs } = useSettingsDialog()

  const SETTINGS_DIALOGS_IN_CUSTOM_ORDER: (keyof typeof settingsDialogs)[] = [
    'about',
    'courses',
    'degreePlan',
    'semesterDates',
    'focusTimer',
    'missionLink',
    'soundtrack',
    'googleCalendar',
    'background',
    'backgroundGradient',
    'accentColor',
    'cardOpacity',
    'customCursor',
    'hydration',
    'weatherApi',
  ]
  const settingsDialogsInCustomOrder = SETTINGS_DIALOGS_IN_CUSTOM_ORDER.map(key => ({
    key,
    ...settingsDialogs[key],
  }))

  // Hash navigation for settings sections
  const parseHashSection = useCallback(() => {
    if (typeof window === 'undefined') return null
    const hash = window.location.hash
    const parts = hash.split('/')
    return parts.length > 1 ? parts[1] : null
  }, [])

  // Map section keys to their refs for scroll-to functionality
  const sectionRefMap: Record<string, HTMLDivElement> = {}
  const setSectionRef = useCallback(
    (key: string) => (node: HTMLDivElement | null) => {
      if (node) {
        sectionRefMap[key] = node
      }
    },
    [],
  )

  // Scroll to section function
  const scrollToSection = useCallback(
    (sectionKey: string) => {
      // Update URL hash for deep linking
      const parts = window.location.hash.split('/')
      const mainRoute = parts[0]
      const newHash = settingsDialogsInCustomOrder[0].key === sectionKey ? mainRoute : `${mainRoute}/${sectionKey}`
      // const newHash = mainRoute
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash)
      }

      const sectionRef = sectionRefMap[sectionKey]
      if (sectionRef) {
        if (settingsDialogsInCustomOrder[0].key === sectionKey) {
          scrollToTop()
        } else {
          sectionRef.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        }

        sectionRef.tabIndex = -1 // Make it focusable for screen readers
        sectionRef.focus({ preventScroll: true })
      }
    },
    [scrollToTop],
  )

  // Handle initial hash navigation and hash changes
  useEffect(() => {
    const handleHashNavigation = () => {
      const sectionId = parseHashSection()
      if (sectionId) {
        // Small delay to ensure DOM is ready
        setTimeout(() => scrollToSection(sectionId), 100)
      }
    }

    // Handle initial load
    handleHashNavigation()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashNavigation)
    return () => window.removeEventListener('hashchange', handleHashNavigation)
  }, [parseHashSection, scrollToSection])

  return (
    <div className="flex h-full gap-6">
      {/* Left Sidebar Menu */}
      <div className="w-80 flex-shrink-0 hidden md:block">
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur h-fit sticky top-6">
          <CardHeader>
            <CardTitle className="text-xl">{t('title')}</CardTitle>
            <CardDescription>{t('sidebar.description')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <nav className="space-y-1">
              {settingsDialogsInCustomOrder.map(({ key, title, Icon }, index) => {
                const isLast = index === settingsDialogsInCustomOrder.length - 1
                return (
                  <button
                    key={key}
                    onClick={() => scrollToSection(key)}
                    className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 hover:bg-white/20 dark:hover:bg-white/10 ${
                      isLast ? 'rounded-b-2xl' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{title}</span>
                  </button>
                )
              })}
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* Right Content Area */}
      <div className="flex-1">
        <div className="space-y-6 pb-24 md:pb-6">
          {settingsDialogsInCustomOrder.map(({ key, title, subtitle, Body }) => (
            <div key={key} ref={setSectionRef(key)} className="scroll-mt-section">
              <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{subtitle}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Body />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
