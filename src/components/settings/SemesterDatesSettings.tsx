import { Label } from '@/components/ui/label'
import { useSemesterDates } from '@/hooks/useStore'
import { Coffee, Snowflake, BookOpen, Award } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type SemesterKey = 'firstSemester' | 'secondSemester' | 'finals' | 'recessWeek' | 'winterBreak'

function detectCurrentSemester(dates: Record<string, string>): SemesterKey | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const inRange = (start: string, end: string) => {
    if (!start || !end) return false
    const s = new Date(start)
    const e = new Date(end)
    s.setHours(0, 0, 0, 0)
    e.setHours(0, 0, 0, 0)
    return today >= s && today <= e
  }

  if (inRange(dates.firstSemesterStart, dates.firstSemesterEnd)) return 'firstSemester'
  if (inRange(dates.secondSemesterStart, dates.secondSemesterEnd)) return 'secondSemester'
  if (inRange(dates.finalsStart, dates.finalsEnd)) return 'finals'
  if (inRange(dates.recessWeekStart, dates.recessWeekEnd)) return 'recessWeek'
  if (inRange(dates.winterBreakStart, dates.winterBreakEnd)) return 'winterBreak'
  return null
}

const SECTION_COLORS: Record<SemesterKey, { bg: string; border: string; badge: string }> = {
  firstSemester: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', badge: 'bg-emerald-500 text-white' },
  secondSemester: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', badge: 'bg-blue-500 text-white' },
  finals: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', badge: 'bg-amber-500 text-white' },
  recessWeek: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', badge: 'bg-purple-500 text-white' },
  winterBreak: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', badge: 'bg-cyan-500 text-white' },
}

export default function SemesterDatesSettings() {
  const { t } = useTranslation('settings')
  const { semesterDates, setSemesterDates } = useSemesterDates()

  const handleChange = (field: string, value: string) => {
    setSemesterDates({ [field]: value })
  }

  const currentSemester = detectCurrentSemester(semesterDates as any)

  const DateInput = ({
    label,
    field,
    icon: Icon,
  }: {
    label: string
    field: string
    icon: React.ComponentType<{ className?: string }>
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
  )

  const SectionCard = ({
    sectionKey,
    title,
    description,
    icon: Icon,
    startField,
    endField,
  }: {
    sectionKey: SemesterKey
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    startField: string
    endField: string
  }) => {
    const isActive = currentSemester === sectionKey
    const colors = SECTION_COLORS[sectionKey]

    return (
      <div
        className={`space-y-3 p-4 rounded-xl border transition-all ${
          isActive
            ? `${colors.bg} ${colors.border} shadow-md ring-1 ring-inset`
            : 'bg-white/30 dark:bg-white/5 border-white/20 dark:border-white/10'
        }`}
      >
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          </div>
          {isActive && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
              {t('semesterDates.currentlyActive')}
            </span>
          )}
        </div>
        <div className="space-y-3">
          <DateInput label={t('semesterDates.startDate')} field={startField} icon={Icon} />
          <DateInput label={t('semesterDates.endDate')} field={endField} icon={Icon} />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SectionCard
        sectionKey="firstSemester"
        title={t('semesterDates.firstSemester.title')}
        description={t('semesterDates.firstSemester.description')}
        icon={BookOpen}
        startField="firstSemesterStart"
        endField="firstSemesterEnd"
      />

      <SectionCard
        sectionKey="secondSemester"
        title={t('semesterDates.secondSemester.title')}
        description={t('semesterDates.secondSemester.description')}
        icon={BookOpen}
        startField="secondSemesterStart"
        endField="secondSemesterEnd"
      />

      <SectionCard
        sectionKey="finals"
        title={t('semesterDates.finals.title')}
        description={t('semesterDates.finals.description')}
        icon={Award}
        startField="finalsStart"
        endField="finalsEnd"
      />

      <SectionCard
        sectionKey="recessWeek"
        title={t('semesterDates.recessWeek.title')}
        description={t('semesterDates.recessWeek.description')}
        icon={Coffee}
        startField="recessWeekStart"
        endField="recessWeekEnd"
      />

      <SectionCard
        sectionKey="winterBreak"
        title={t('semesterDates.winterBreak.title')}
        description={t('semesterDates.winterBreak.description')}
        icon={Snowflake}
        startField="winterBreakStart"
        endField="winterBreakEnd"
      />
    </div>
  )
}
