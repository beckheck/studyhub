import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useTheme } from '@/hooks/useStore'
import { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

export default function CardOpacitySettings() {
  const { t } = useTranslation('settings')
  const { theme, setCardOpacity } = useTheme()

  return (
    <div className="space-y-4">
      <div>
        <Label>
          {t('cardOpacity.mode', {
            mode: theme.darkMode ? t('accentColor.dark') : t('accentColor.light'),
            value: theme.darkMode ? theme.cardOpacity.dark : theme.cardOpacity.light,
          })}
        </Label>
        <input
          type="range"
          min={theme.darkMode ? '5' : '10'}
          max="100"
          value={theme.darkMode ? theme.cardOpacity.dark : theme.cardOpacity.light}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const newCardOpacity = {
              ...theme.cardOpacity,
              [theme.darkMode ? 'dark' : 'light']: parseInt(e.target.value),
            }
            setCardOpacity(newCardOpacity)
          }}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 mt-2"
        />
      </div>
      <Button
        variant="outline"
        className="rounded-xl w-full"
        onClick={() => {
          const newCardOpacity = {
            ...theme.cardOpacity,
            [theme.darkMode ? 'dark' : 'light']: theme.darkMode ? 25 : 80,
          }
          setCardOpacity(newCardOpacity)
        }}
      >
        {t('cardOpacity.reset')}
      </Button>
    </div>
  )
}
