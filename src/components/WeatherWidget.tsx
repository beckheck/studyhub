import { OpenWeatherMapResponse, Weather, WeatherCondition, WeatherLocation } from '@/types'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface WeatherWidgetProps {
  apiKey?: string
  location?: WeatherLocation
  onWeatherClick?: () => void
}

export default function WeatherWidget({ apiKey, location, onWeatherClick }: WeatherWidgetProps) {
  const { t, i18n } = useTranslation('common')
  const [weather, setWeather] = useState<Weather>({
    condition: 'loading',
    temperature: '--',
    location: t('weather.loading.location'),
    description: t('weather.loading.description'),
  })
  const [error, setError] = useState<string | null>(null)

  // OpenWeatherMap API integration
  useEffect(() => {
    const API_KEY = apiKey || 'demo_key' // Use provided API key or demo

    // Map OpenWeatherMap icons to our emoji system
    const getWeatherIcon = (weatherMain: string, icon: string): string => {
      const iconMap: { [key: string]: string } = {
        Clear: '☀️',
        Clouds: icon.includes('01') ? '☀️' : icon.includes('02') ? '⛅' : '☁️',
        Rain: '🌧️',
        Drizzle: '🌦️',
        Thunderstorm: '⛈️',
        Snow: '❄️',
        Mist: '🌫️',
        Fog: '🌫️',
        Haze: '🌫️',
      }
      return iconMap[weatherMain] || '🌤️'
    }

    const validateApiKey = (): void => {
      if (!apiKey || apiKey.trim() === '') {
        throw new Error(t('weather.errors.noApiKey'))
      }
    }

    const handleApiResponse = async (response: Response, city?: string): Promise<OpenWeatherMapResponse> => {
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(t('weather.errors.invalidApiKey'))
        } else if (response.status === 404 && city) {
          throw new Error(t('weather.errors.cityNotFound', { city }))
        } else {
          throw new Error(t('weather.errors.apiError', { status: response.status }))
        }
      }
      return await response.json()
    }

    const processWeatherData = (data: OpenWeatherMapResponse): void => {
      setWeather({
        condition: data.weather[0].main.toLowerCase(),
        temperature: Math.round(data.main.temp),
        location: data.name,
        description: data.weather[0].description,
        icon: getWeatherIcon(data.weather[0].main, data.weather[0].icon),
      })
      setError(null)
    }

    const handleApiError = (err: unknown, context: string): void => {
      const errorMessage = err instanceof Error ? err.message : t('weather.errors.unknownError')
      console.error(`Weather API failed (${context}):`, errorMessage)
      setError(errorMessage)
      fallbackToSimulation()
    }

    const fetchWeatherByCity = async (city: string): Promise<void> => {
      try {
        validateApiKey()

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
            city,
          )}&appid=${API_KEY}&units=metric&lang=${i18n.language}`,
        )

        const data = await handleApiResponse(response, city)
        processWeatherData(data)
      } catch (err) {
        handleApiError(err, 'city search')
      }
    }

    const fetchWeatherData = async (lat: number, lon: number): Promise<void> => {
      try {
        validateApiKey()

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=${i18n.language}`,
        )

        const data = await handleApiResponse(response)
        processWeatherData(data)
      } catch (err) {
        handleApiError(err, 'geolocation')
      }
    }

    const fallbackToSimulation = (): void => {
      const conditions: WeatherCondition[] = [
        { condition: 'sunny', temp: 28, icon: '☀️', desc: t('weather.simulated.descriptions.clearSky') },
        { condition: 'cloudy', temp: 24, icon: '☁️', desc: t('weather.simulated.descriptions.overcastClouds') },
        { condition: 'rainy', temp: 18, icon: '🌧️', desc: t('weather.simulated.descriptions.lightRain') },
        { condition: 'partly-cloudy', temp: 25, icon: '⛅', desc: t('weather.simulated.descriptions.partlyCloudy') },
      ]

      const hour = new Date().getHours()
      let weatherIndex = 0

      if (hour >= 6 && hour < 12) weatherIndex = 0
      else if (hour >= 12 && hour < 15) weatherIndex = 3
      else if (hour >= 15 && hour < 18) weatherIndex = 1
      else weatherIndex = 3

      const selectedWeather = conditions[weatherIndex]
      setWeather({
        condition: selectedWeather.condition,
        temperature: selectedWeather.temp + Math.floor(Math.random() * 6 - 3),
        location: t('weather.simulated.location'),
        description: selectedWeather.desc,
        icon: selectedWeather.icon,
      })
    }

    const tryFallbackToCity = (): void => {
      if (location && location.city) {
        fetchWeatherByCity(location.city).catch(console.error)
      } else {
        fallbackToSimulation()
      }
    }

    const getLocationAndWeather = (): void => {
      if (location && !location.useGeolocation && location.city) {
        // Use city name from settings
        fetchWeatherByCity(location.city).catch(console.error)
      } else if (navigator.geolocation) {
        // Use geolocation
        navigator.geolocation.getCurrentPosition(
          (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords
            fetchWeatherData(latitude, longitude).catch(console.error)
          },
          (err: GeolocationPositionError) => {
            console.error('Geolocation failed:', err.message)
            setError(t('weather.errors.locationDenied'))
            tryFallbackToCity()
          },
          { timeout: 10000, enableHighAccuracy: true },
        )
      } else {
        setError(t('weather.errors.geolocationNotSupported'))
        tryFallbackToCity()
      }
    }

    getLocationAndWeather()

    // Update weather every 10 minutes
    const interval = setInterval(getLocationAndWeather, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [apiKey, location, i18n.language])

  const getWeatherDescription = (): string => {
    if (weather.description) {
      // return capitalized original description
      return weather.description.charAt(0).toUpperCase() + weather.description.slice(1)
    }

    // Try to get localized description based on condition, fallback to capitalized condition
    const translationKey = `weather.conditions.${weather.condition}`
    const translatedDescription = t(translationKey)

    // If translation exists (not the same as the key), use it
    if (translatedDescription !== translationKey) {
      return translatedDescription
    }

    const descriptions: { [key: string]: string } = {
      'partly-cloudy': t('weather.conditions.partlyCloudy'),
    }
    return descriptions[weather.condition] || t('weather.conditions.clear')
  }

  return (
    <div className="text-left cursor-pointer" onClick={onWeatherClick}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl weather-icon-3d">{weather.condition === 'loading' ? '⏳' : weather.icon}</span>
        <div>
          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{getWeatherDescription()}</div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {weather.temperature === '--' ? '--' : `${weather.temperature}°C`}
          </div>
          {error && (
            <div className="text-xs text-orange-500 dark:text-orange-400">
              {error}{' '}
              {!error.includes(t('weather.errors.invalidApiKey')) && !error.includes('not found')
                ? t('weather.errors.simulated')
                : ''}
            </div>
          )}
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{weather.location}</div>
        </div>
      </div>
    </div>
  )
}
