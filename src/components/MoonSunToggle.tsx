import { Switch } from '@/components/ui/switch'

interface MoonSunToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export default function MoonSunToggle({ checked, onCheckedChange }: MoonSunToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs">🌞</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <span className="text-xs">🌚</span>
    </div>
  )
}
