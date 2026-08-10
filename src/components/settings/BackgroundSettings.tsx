import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/hooks/useStore'
import { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

export default function BackgroundSettings() {
  const { t } = useTranslation('settings')
  const { theme, setBgImage } = useTheme()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept="image/*"
          className="rounded-xl"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0]
            if (!f) return
            const r = new FileReader()
            r.onload = () => {
              const result = r.result
              if (typeof result === 'string') {
                setBgImage(result)
              }
            }
            r.readAsDataURL(f)
          }}
        />
        <Button variant="outline" className="rounded-xl" onClick={() => setBgImage('')}>
          {t('background.clear')}
        </Button>
      </div>
      {theme.bgImage && (
        <img src={theme.bgImage} alt={t('background.preview')} className="rounded-xl max-h-40 w-full object-cover" />
      )}
    </div>
  )
}
