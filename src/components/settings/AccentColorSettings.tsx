import { Button } from '@/components/ui/button'
import ColorPicker from '@/components/ui/color-picker'
import { useTheme } from '@/hooks/useStore'
import { useTranslation } from 'react-i18next'

export default function AccentColorSettings() {
  const { t } = useTranslation('settings')
  const { theme, setAccentColor } = useTheme()

  return (
    <div className="space-y-4">
      <ColorPicker
        label={t('accentColor.mode', { mode: theme.darkMode ? t('accentColor.dark') : t('accentColor.light') })}
        value={theme.darkMode ? theme.accentColor.dark : theme.accentColor.light}
        onChange={color => {
          const newAccentColor = {
            ...theme.accentColor,
            [theme.darkMode ? 'dark' : 'light']: color,
          }
          setAccentColor(newAccentColor)
        }}
        htmlFor="accent-color"
      />
      <Button
        variant="outline"
        className="rounded-xl w-full"
        onClick={() => {
          const defaultAccentColor = {
            light: '#7c3aed',
            dark: '#8b5cf6',
          }
          setAccentColor(defaultAccentColor)
        }}
      >
        {t('accentColor.reset')}
      </Button>
    </div>
  )
}
