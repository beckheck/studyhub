import { Label } from '@/components/ui/label'
import React from 'react'
import { useTranslation } from 'react-i18next'

interface LevelsSliderProps {
  /** Label text for the levels slider */
  label: string
  /** Current level value (1-based index) */
  value: number
  /** Callback function when value changes */
  onChange: (value: number) => void
  /** Array of labels (emojis/text) for each level */
  labels: string[]
}

/**
 * Levels Slider Component
 * Displays a slider with custom labels representing different levels
 */
export default function LevelsSlider({ label, value, onChange, labels }: LevelsSliderProps): React.ReactElement {
  const { t } = useTranslation('common')
  const max = labels.length
  return (
    <div>
      <Label>
        {label} <span className="ml-2">{labels[value - 1]}</span>
      </Label>
      <input
        type="range"
        min={1}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{t('common.low')}</span>
        <span>{t('common.high')}</span>
      </div>
    </div>
  )
}
