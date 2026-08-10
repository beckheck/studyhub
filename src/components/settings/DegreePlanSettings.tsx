import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDegreePlan } from '@/hooks/useStore'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function DegreePlanSettings() {
  const { t } = useTranslation('degreePlan')
  const { t: tCommon } = useTranslation('common')

  const { degreePlan, setDegreePlanName } = useDegreePlan()
  const [degreePlanName, setDegreePlanNameLocal] = useState(degreePlan.name || 'Degree Plan')
  const [hasChanged, setHasChanged] = useState(false)

  const handleNameChange = (value: string): void => {
    setDegreePlanNameLocal(value)
    setHasChanged(value !== degreePlan.name)
  }

  const handleSave = (): void => {
    setDegreePlanName(degreePlanName.trim() || 'Degree Plan')
    setHasChanged(false)
  }

  const handleReset = (): void => {
    setDegreePlanNameLocal(degreePlan.name || 'Degree Plan')
    setHasChanged(false)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="degree-plan-name" className="text-sm font-medium">
            {t('settings.degreePlanName')}
          </Label>
          <Input
            id="degree-plan-name"
            value={degreePlanName}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="Enter degree plan name"
            className="rounded-xl"
          />
          <p className="text-xs text-zinc-500">{t('settings.degreePlanNameDescription')}</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
          <div className="text-center">
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{degreePlan.semesters.length}</div>
            <div className="text-xs text-zinc-500">{t('settings.totalSemesters')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {degreePlan.semesters.flatMap(s => s.courses).length}
            </div>
            <div className="text-xs text-zinc-500">{t('settings.totalCourses')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {degreePlan.completedCourses.length}
            </div>
            <div className="text-xs text-zinc-500">{t('settings.completedCourses')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {degreePlan.semesters.reduce((total, semester) => {
                return (
                  total +
                  semester.courses.reduce((semesterTotal, course) => {
                    const isCompleted = degreePlan.completedCourses.includes(course.acronym)
                    return semesterTotal + (isCompleted ? parseInt(course.credits || '0') : 0)
                  }, 0)
                )
              }, 0)}
            </div>
            <div className="text-xs text-zinc-500">{t('settings.completedCredits')}</div>
          </div>
        </div>
      </div>

      {hasChanged && (
        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <Button variant="outline" size="sm" onClick={handleReset} className="rounded-xl">
            {tCommon('actions.cancel')}
          </Button>
          <Button size="sm" onClick={handleSave} className="rounded-xl">
            {tCommon('actions.save')}
          </Button>
        </div>
      )}
    </div>
  )
}
