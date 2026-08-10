import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useWeather } from '@/hooks/useStore'
import { useTranslation } from 'react-i18next'

export default function WeatherApiSettings() {
  const { t } = useTranslation('settings')
  const { weather, setWeatherApiKey, setWeatherLocation } = useWeather()

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="weather-api-key">{t('weatherApi.apiKeyLabel')}</Label>
        <Input
          id="weather-api-key"
          type="password"
          placeholder={t('weatherApi.placeholder')}
          value={weather.apiKey}
          onChange={e => setWeatherApiKey(e.target.value)}
          className="mt-2"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
          {t('weatherApi.note')}{' '}
          <a
            href="https://openweathermap.org/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline"
          >
            {t('weatherApi.linkText')}
          </a>
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-sm">
        <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">{t('weatherApi.instructions.title')}</p>
        <ol className="text-blue-700 dark:text-blue-300 text-xs space-y-1 ml-4 list-decimal">
          <li>
            {t('weatherApi.instructions.step1')} <span className="font-mono">openweathermap.org</span>
          </li>
          <li>{t('weatherApi.instructions.step2')}</li>
          <li>{t('weatherApi.instructions.step3')}</li>
          <li>{t('weatherApi.instructions.step4')}</li>
          <li>
            <strong>{t('weatherApi.instructions.important')}</strong> {t('weatherApi.instructions.step5')}
          </li>
        </ol>
      </div>

      {weather.apiKey && (
        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
          <p className="text-green-800 dark:text-green-200 text-sm">{t('weatherApi.configured')}</p>
        </div>
      )}

      <div className="border-t pt-4 border-zinc-200 dark:border-zinc-800">
        <h3 className="text-md font-medium mb-2">{t('weatherApi.location.title')}</h3>
        <div className="flex items-center justify-between mb-3">
          <Label htmlFor="use-geolocation">{t('weatherApi.location.useDevice')}</Label>
          <Switch
            id="use-geolocation"
            checked={weather.location.useGeolocation}
            onCheckedChange={checked =>
              setWeatherLocation({
                ...weather.location,
                useGeolocation: checked,
              })
            }
          />
        </div>

        <div className={weather.location.useGeolocation ? 'opacity-50' : ''}>
          <Label htmlFor="city-name">{t('weatherApi.location.cityLabel')}</Label>
          <Input
            id="city-name"
            type="text"
            placeholder={t('weatherApi.location.cityPlaceholder')}
            value={weather.location.city}
            onChange={e =>
              setWeatherLocation({
                ...weather.location,
                city: e.target.value,
              })
            }
            disabled={weather.location.useGeolocation}
            className="mt-2"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            {weather.location.useGeolocation
              ? t('weatherApi.location.deviceLocationNote')
              : t('weatherApi.location.manualLocationNote')}
          </p>
        </div>
      </div>
    </div>
  )
}
