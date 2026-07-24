import { Label } from '@/components/ui/label';
import { useSemesterDates } from '@/hooks/useStore';
import { CalendarDays, Coffee, Snowflake, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SemesterDatesSettings() {
  const { t } = useTranslation('settings');
  const { semesterDates, setSemesterDates } = useSemesterDates();

  const handleChange = (field: string, value: string) => {
    setSemesterDates({ [field]: value });
  };

  const DateInput = ({
    label,
    field,
    icon: Icon,
  }: {
    label: string;
    field: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 min-w-[140px]">
        <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
        <Label className="text-sm font-medium">{label}</Label>
      </div>
      <input
        type="date"
        value={(semesterDates as any)[field] || ''}
        onChange={e => handleChange(field, e.target.value)}
        className="flex-1 rounded-xl border border-white/20 dark:border-white/10 bg-white/50 dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Semester Period */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('semesterDates.semesterPeriod.title')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('semesterDates.semesterPeriod.description')}
          </p>
        </div>
        <div className="space-y-3">
          <DateInput label={t('semesterDates.startDate')} field="semesterStart" icon={CalendarDays} />
          <DateInput label={t('semesterDates.endDate')} field="semesterEnd" icon={CalendarDays} />
        </div>
      </div>

      {/* Midterms */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('semesterDates.midterms.title')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('semesterDates.midterms.description')}
          </p>
        </div>
        <div className="space-y-3">
          <DateInput label={t('semesterDates.startDate')} field="midtermsStart" icon={FileText} />
          <DateInput label={t('semesterDates.endDate')} field="midtermsEnd" icon={FileText} />
        </div>
      </div>

      {/* Finals */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('semesterDates.finals.title')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('semesterDates.finals.description')}
          </p>
        </div>
        <div className="space-y-3">
          <DateInput label={t('semesterDates.startDate')} field="finalsStart" icon={FileText} />
          <DateInput label={t('semesterDates.endDate')} field="finalsEnd" icon={FileText} />
        </div>
      </div>

      {/* Spring Break */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('semesterDates.springBreak.title')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('semesterDates.springBreak.description')}
          </p>
        </div>
        <div className="space-y-3">
          <DateInput label={t('semesterDates.startDate')} field="springBreakStart" icon={Coffee} />
          <DateInput label={t('semesterDates.endDate')} field="springBreakEnd" icon={Coffee} />
        </div>
      </div>

      {/* Winter Break */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('semesterDates.winterBreak.title')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('semesterDates.winterBreak.description')}
          </p>
        </div>
        <div className="space-y-3">
          <DateInput label={t('semesterDates.startDate')} field="winterBreakStart" icon={Snowflake} />
          <DateInput label={t('semesterDates.endDate')} field="winterBreakEnd" icon={Snowflake} />
        </div>
      </div>
    </div>
  );
}
