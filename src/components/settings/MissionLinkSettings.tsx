import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDashboardLayout } from '@/hooks/useStore';
import { useTranslation } from 'react-i18next';

export default function MissionLinkSettings() {
  const { t } = useTranslation('settings');
  const { missionLink, setMissionLink } = useDashboardLayout();

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="mission-link">{t('missionLink.label')}</Label>
        <Input
          id="mission-link"
          type="url"
          inputMode="url"
          placeholder={t('missionLink.placeholder')}
          value={missionLink}
          onChange={e => setMissionLink(e.target.value)}
          className="mt-2 rounded-xl"
        />
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('missionLink.helper')}</p>
    </div>
  );
}