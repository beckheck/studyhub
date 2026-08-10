import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSoundtrack } from '@/hooks/useStore'
import { useTranslation } from 'react-i18next'

export default function SoundtrackSettings() {
  const { t } = useTranslation('settings')
  const { soundtrack, setSoundtrackEmbed, setSoundtrackPosition } = useSoundtrack()

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="soundtrack-position">{t('soundtrack.position')}</Label>
        <Select value={soundtrack.position} onValueChange={setSoundtrackPosition}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder={t('soundtrack.selectPosition')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dashboard">{t('soundtrack.positions.dashboard')}</SelectItem>
            <SelectItem value="floating">{t('soundtrack.positions.floating')}</SelectItem>
            <SelectItem value="minimized">{t('soundtrack.positions.minimized')}</SelectItem>
            <SelectItem value="off">{t('soundtrack.positions.off')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="soundtrack-embed">{t('soundtrack.description')}</Label>
        <Input
          id="soundtrack-embed"
          value={soundtrack.embed}
          onChange={e => setSoundtrackEmbed(e.target.value)}
          placeholder={t('soundtrack.placeholder')}
          className="rounded-xl"
        />
      </div>

      {soundtrack.embed && (
        <div className="rounded-2xl overflow-hidden">
          <div className="aspect-video">
            <iframe
              src={soundtrack.embed}
              className="w-full h-full"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title={t('soundtrack.preview')}
            />
          </div>
        </div>
      )}
    </div>
  )
}
