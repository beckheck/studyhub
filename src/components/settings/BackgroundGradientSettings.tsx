import { Button } from '@/components/ui/button'
import ColorPicker from '@/components/ui/color-picker'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/hooks/useStore'
import { useTranslation } from 'react-i18next'

export default function BackgroundGradientSettings() {
  const { t } = useTranslation('settings')
  const { theme, setGradientEnabled, setGradientStart, setGradientMiddle, setGradientEnd } = useTheme()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2">
        <Switch checked={theme.gradientEnabled} onCheckedChange={setGradientEnabled} />
        <Label>{t('backgroundGradient.enable')}</Label>
      </div>

      <div className={theme.gradientEnabled ? '' : 'opacity-50 pointer-events-none'}>
        <ColorPicker
          label={t('backgroundGradient.startColor', {
            mode: theme.darkMode ? t('accentColor.dark') : t('accentColor.light'),
          })}
          value={theme.darkMode ? theme.gradientStart.dark : theme.gradientStart.light}
          onChange={color => {
            const newGradientStart = {
              ...theme.gradientStart,
              [theme.darkMode ? 'dark' : 'light']: color,
            }
            setGradientStart(newGradientStart)
          }}
          htmlFor="gradient-start-color"
        />
        <ColorPicker
          label={t('backgroundGradient.middleColor', {
            mode: theme.darkMode ? t('accentColor.dark') : t('accentColor.light'),
          })}
          value={theme.darkMode ? theme.gradientMiddle.dark : theme.gradientMiddle.light}
          onChange={color => {
            const newGradientMiddle = {
              ...theme.gradientMiddle,
              [theme.darkMode ? 'dark' : 'light']: color,
            }
            setGradientMiddle(newGradientMiddle)
          }}
          htmlFor="gradient-middle-color"
        />
        <ColorPicker
          label={t('backgroundGradient.endColor', {
            mode: theme.darkMode ? t('accentColor.dark') : t('accentColor.light'),
          })}
          value={theme.darkMode ? theme.gradientEnd.dark : theme.gradientEnd.light}
          onChange={color => {
            const newGradientEnd = {
              ...theme.gradientEnd,
              [theme.darkMode ? 'dark' : 'light']: color,
            }
            setGradientEnd(newGradientEnd)
          }}
          htmlFor="gradient-end-color"
        />
        <Button
          variant="outline"
          className="rounded-xl w-full mt-4"
          onClick={() => {
            if (theme.darkMode) {
              setGradientStart({ ...theme.gradientStart, dark: '#18181b' })
              setGradientMiddle({ ...theme.gradientMiddle, dark: '#0f172a' })
              setGradientEnd({ ...theme.gradientEnd, dark: '#1e293b' })
            } else {
              setGradientStart({ ...theme.gradientStart, light: '#ffd2e9' })
              setGradientMiddle({ ...theme.gradientMiddle, light: '#bae6fd' })
              setGradientEnd({ ...theme.gradientEnd, light: '#a7f3d0' })
            }
          }}
        >
          {t('backgroundGradient.reset')}
        </Button>
      </div>
    </div>
  )
}
