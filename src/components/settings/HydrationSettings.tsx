import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useWellness } from '@/hooks/useStore'
import { useTranslation } from 'react-i18next'

export default function HydrationSettings() {
  const { t: _t } = useTranslation('wellness')
  const { wellness, setWater, setHydrationSettings } = useWellness()
  const { water, hydrationSettings } = wellness

  // Helper function to get display goal
  const getDisplayGoal = () => {
    if (hydrationSettings.useCups) {
      return hydrationSettings.unit === 'metric'
        ? `${Math.ceil(hydrationSettings.dailyGoalML / hydrationSettings.cupSizeML)} cups`
        : `${Math.ceil(hydrationSettings.dailyGoalOZ / hydrationSettings.cupSizeOZ)} cups`
    } else {
      return hydrationSettings.unit === 'metric'
        ? `${hydrationSettings.dailyGoalML}mL`
        : `${hydrationSettings.dailyGoalOZ}oz`
    }
  }

  return (
    <div className="space-y-4">
      {/* Measurement Unit */}
      <div className="space-y-2">
        <Label className="font-medium">Measurement Unit</Label>
        <div className="flex gap-2">
          <Button
            variant={hydrationSettings.unit === 'metric' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setHydrationSettings({ ...hydrationSettings, unit: 'metric' })}
            className="rounded-xl flex-1"
          >
            Metric (mL)
          </Button>
          <Button
            variant={hydrationSettings.unit === 'imperial' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setHydrationSettings({ ...hydrationSettings, unit: 'imperial' })}
            className="rounded-xl flex-1"
          >
            Imperial (oz)
          </Button>
        </div>
      </div>

      {/* Tracking Method */}
      <div className="space-y-2">
        <Label className="font-medium">Tracking Method</Label>
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
          <Label>Use cups instead of direct volume</Label>
          <Switch
            checked={hydrationSettings.useCups}
            onCheckedChange={checked => {
              const currentUseCups = hydrationSettings.useCups
              const cupSize =
                hydrationSettings.unit === 'metric' ? hydrationSettings.cupSizeML : hydrationSettings.cupSizeOZ

              if (currentUseCups && !checked) {
                // Converting from cups to direct volume
                const volumeAmount = water * cupSize
                setWater(volumeAmount)
              } else if (!currentUseCups && checked) {
                // Converting from direct volume to cups
                const cupsAmount = Math.round(water / cupSize)
                setWater(cupsAmount)
              }

              setHydrationSettings({ ...hydrationSettings, useCups: checked })
            }}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
      </div>

      {/* Serving/Cup Size */}
      <div className="space-y-2">
        <Label className="font-medium">
          {hydrationSettings.useCups ? 'Cup Size' : 'Serving Size'} ({hydrationSettings.unit === 'metric' ? 'mL' : 'oz'}
          )
        </Label>
        <Input
          type="number"
          value={hydrationSettings.unit === 'metric' ? hydrationSettings.cupSizeML : hydrationSettings.cupSizeOZ}
          onChange={e => {
            const value = parseFloat(e.target.value) || 0
            setHydrationSettings({
              ...hydrationSettings,
              ...(hydrationSettings.unit === 'metric' ? { cupSizeML: value } : { cupSizeOZ: value }),
            })
          }}
          className="rounded-xl"
          placeholder={hydrationSettings.unit === 'metric' ? '250' : '8.5'}
        />
        <div className="text-xs text-zinc-500">
          {hydrationSettings.useCups
            ? 'Volume per cup when tracking by cups'
            : 'Amount added/removed with each +/- button press'}
        </div>
      </div>

      {/* Daily Goal */}
      <div className="space-y-2">
        <Label className="font-medium">Daily Goal ({hydrationSettings.unit === 'metric' ? 'mL' : 'oz'})</Label>
        <Input
          type="number"
          value={hydrationSettings.unit === 'metric' ? hydrationSettings.dailyGoalML : hydrationSettings.dailyGoalOZ}
          onChange={e => {
            const value = parseFloat(e.target.value) || 0
            setHydrationSettings({
              ...hydrationSettings,
              ...(hydrationSettings.unit === 'metric' ? { dailyGoalML: value } : { dailyGoalOZ: value }),
            })
          }}
          className="rounded-xl"
          placeholder={hydrationSettings.unit === 'metric' ? '2000' : '67.6'}
        />
      </div>

      {/* Preview */}
      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
        <div className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Preview</div>
        <div className="text-xs text-blue-700 dark:text-blue-300">
          Goal: {getDisplayGoal()}
          <span className="block">
            {hydrationSettings.useCups
              ? `(${hydrationSettings.unit === 'metric' ? hydrationSettings.cupSizeML : hydrationSettings.cupSizeOZ}${
                  hydrationSettings.unit === 'metric' ? 'mL' : 'oz'
                } per cup)`
              : `(${hydrationSettings.unit === 'metric' ? hydrationSettings.cupSizeML : hydrationSettings.cupSizeOZ}${
                  hydrationSettings.unit === 'metric' ? 'mL' : 'oz'
                } per serving)`}
          </span>
        </div>
      </div>

      <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl">
        Note: Changes to tracking method or units will reset your current water counter to 0 when you close this dialog.
      </div>
    </div>
  )
}
