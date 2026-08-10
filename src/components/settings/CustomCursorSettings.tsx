import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/hooks/useStore'
import { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

export default function CustomCursorSettings() {
  const { t } = useTranslation('settings')
  const { theme, setCustomCursor } = useTheme()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept=".cur"
          className="rounded-xl"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0]
            if (!f) return
            const r = new FileReader()
            r.onload = () => {
              const result = r.result
              if (typeof result === 'string') {
                setCustomCursor(result)
              }
            }
            r.readAsDataURL(f)
          }}
        />
        <Button variant="outline" className="rounded-xl" onClick={() => setCustomCursor('')}>
          {t('customCursor.clear')}
        </Button>
      </div>
      {theme.customCursor && (
        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
          <p className="text-green-800 dark:text-green-200 text-sm">{t('customCursor.preview')}</p>
        </div>
      )}
      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-sm">
        <p className="text-blue-700 dark:text-blue-300">
          {t('customCursor.note')}{' '}
          <a
            href="https://www.cursors-4u.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline"
          >
            {t('customCursor.linkText')}
          </a>
        </p>
      </div>
      <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg text-sm">
        <p className="text-yellow-800 dark:text-yellow-200">{t('customCursor.animatedNote')}</p>
      </div>
    </div>
  )
}
