import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAppContext } from '@/contexts/AppContext'
import { useFocusTimer } from '@/hooks/useStore'
import { Bell, BellOff, Shield, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function FocusTimerSettings() {
  const { isExtension } = useAppContext()
  const { t } = useTranslation('settings')
  const { focusTimer, setAudioEnabled, setAudioVolume, setNotificationsEnabled, setSites, setBlockingStrategy } =
    useFocusTimer()

  // Local state for textarea to prevent cursor jumping
  const [localSites, setLocalSites] = useState(focusTimer.sites)

  // Sync local state with store when focusTimer.sites changes from external sources
  useEffect(() => {
    setLocalSites(focusTimer.sites)
  }, [focusTimer.sites])

  const handleSitesChange = (value: string) => {
    // Update local state immediately for smooth typing
    setLocalSites(value)
    // Update store (debounced or immediate)
    setSites(value)
  }

  return (
    <div className="space-y-6">
      {/* Notifications Settings Section */}
      <div className="space-y-4">
        {/* OS Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {focusTimer.notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            <Label className="text-sm font-medium">{t('focusTimer.notifications.desktop')}</Label>
          </div>
          <Switch checked={focusTimer.notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
        </div>
      </div>

      {/* Audio Settings Section */}
      <div className="space-y-4">
        {/* Audio Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {focusTimer.audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <Label className="text-sm font-medium">{t('focusTimer.audio.notifications')}</Label>
          </div>
          <Switch checked={focusTimer.audioEnabled} onCheckedChange={setAudioEnabled} />
        </div>

        {/* Volume Control */}
        {focusTimer.audioEnabled && (
          <div className="space-y-3">
            <Label className="text-xs text-zinc-500 uppercase tracking-wide">{t('focusTimer.audio.volume')}</Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={focusTimer.audioVolume}
                onChange={e => setAudioVolume(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-white/70 dark:bg-white/10 rounded-lg appearance-none slider"
              />
              <span className="text-sm text-zinc-500 min-w-[3rem]">{Math.round(focusTimer.audioVolume * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {isExtension && (
        /* Site Blocking Section */
        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('focusTimer.siteBlocking.title')}
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('focusTimer.siteBlocking.description')}</p>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-zinc-500 uppercase tracking-wide">
              {t('focusTimer.siteBlocking.strategy')}
            </Label>
            <Select value={focusTimer.blockingStrategy} onValueChange={setBlockingStrategy}>
              <SelectTrigger>
                <SelectValue placeholder="Select blocking strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">{t('focusTimer.siteBlocking.disabled')}</SelectItem>
                <SelectItem value="blacklist">{t('focusTimer.siteBlocking.blacklist')}</SelectItem>
                <SelectItem value="whitelist">{t('focusTimer.siteBlocking.whitelist')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {focusTimer.blockingStrategy !== 'disabled' && (
            <div className="space-y-3">
              <Label className="text-xs text-zinc-500 uppercase tracking-wide">
                {t('focusTimer.siteBlocking.sites')}
              </Label>
              <Textarea
                value={localSites}
                onChange={e => handleSitesChange(e.target.value)}
                placeholder={t('focusTimer.siteBlocking.placeholder')}
                className="min-h-[120px] resize-y text-xs"
                rows={6}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('focusTimer.siteBlocking.help')}</p>
            </div>
          )}
        </div>
      )}

      {/*
        Future Focus Timer settings sections can be added here:
        
        - Timer Display Settings (countdown vs elapsed, time format)
        - Default Technique Preferences 
        - Notification Behavior (browser notifications, visual cues)
        - Session Management (auto-start breaks, session notes requirements)
        - Mood Tracking Settings (default values, scale customization)
        
        Each section should follow the same pattern:
        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Section Title
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Section description
            </p>
          </div>
          // Settings controls here...
        </div>
      */}
    </div>
  )
}
