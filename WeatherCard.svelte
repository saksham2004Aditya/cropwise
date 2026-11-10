<script>
  import { createEventDispatcher } from 'svelte'
  import { languageStore, t } from './i18nStore'
  
  export let weather = {}
  export let location = 'Farm Location'
  
  const dispatch = createEventDispatcher()

  function getWeatherEmoji(icon) {
    const iconMap = {
      'Clouds': '☁️',
      'Clear': '☀️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '❄️',
      'Mist': '🌫️',
      'Smoke': '💨',
      'Wind': '💨',
    }
    return iconMap[icon] || '🌤️'
  }

  function handleViewFull() {
    dispatch('navigate', 'weather')
  }

  $: safeWeather = {
    temp: 30,
    humidity: 60,
    windSpeed: 12,
    pressure: 1013,
    cloudiness: 20,
    description: 'Partly cloudy',
    icon: 'Clouds',
    rainfall: 0,
    source: 'live',
    ...(weather || {}),
  }
</script>

<div class="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-lg p-6 text-white flex flex-col justify-between">
  <div>
    <div class="flex items-start justify-between mb-4">
      <div>
        <div class="flex items-center gap-2">
          <h3 class="text-lg font-bold">🌤️ {t('weatherCard.currentWeather', $languageStore)}</h3>
          {#if safeWeather.source}
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              {safeWeather.source === 'open-meteo' ? 'Live' : safeWeather.source === 'openweathermap' ? 'Live OWM' : 'Auto'}
            </span>
          {/if}
        </div>
        <p class="text-blue-100 text-sm mt-0.5">{location || 'Farm Location'}</p>
      </div>
      <button
        type="button"
        on:click={handleViewFull}
        class="px-3 py-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-sm font-semibold transition flex items-center gap-1 shadow-sm"
      >
        <span>{t('weatherCard.viewFull', $languageStore)}</span>
        <span>→</span>
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      <!-- Main Weather Info -->
      <div class="flex items-center justify-center p-3 bg-white/10 rounded-lg backdrop-blur">
        <div class="text-center">
          <div class="text-5xl mb-2">{getWeatherEmoji(safeWeather.icon)}</div>
          <p class="text-3xl font-bold">{safeWeather.temp}°C</p>
          <p class="text-blue-100 capitalize text-sm mt-1">{safeWeather.description}</p>
          {#if safeWeather.feelsLike !== undefined}
            <p class="text-xs text-blue-200 mt-1">Feels like {safeWeather.feelsLike}°C</p>
          {/if}
        </div>
      </div>

      <!-- Weather Details -->
      <div class="space-y-2">
        <div class="bg-white bg-opacity-20 rounded p-2.5 backdrop-blur">
          <div class="flex justify-between items-center text-sm">
            <span class="text-blue-100">{t('weatherCard.humidity', $languageStore)}</span>
            <span class="font-bold">{safeWeather.humidity}%</span>
          </div>
        </div>

        <div class="bg-white bg-opacity-20 rounded p-2.5 backdrop-blur">
          <div class="flex justify-between items-center text-sm">
            <span class="text-blue-100">{t('weatherCard.windSpeed', $languageStore)}</span>
            <span class="font-bold">{safeWeather.windSpeed} km/h</span>
          </div>
        </div>

        <div class="bg-white bg-opacity-20 rounded p-2.5 backdrop-blur">
          <div class="flex justify-between items-center text-sm">
            <span class="text-blue-100">{t('weatherCard.pressure', $languageStore)}</span>
            <span class="font-bold">{safeWeather.pressure} hPa</span>
          </div>
        </div>

        <div class="bg-white bg-opacity-20 rounded p-2.5 backdrop-blur">
          <div class="flex justify-between items-center text-sm">
            <span class="text-blue-100">{t('weatherCard.clouds', $languageStore)}</span>
            <span class="font-bold">{safeWeather.cloudiness}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="flex items-center justify-between mt-4 pt-3 border-t border-white/20 text-xs text-blue-100">
    <span>Rainfall: {safeWeather.rainfall ?? 0} mm</span>
    <span class="opacity-80">Real-time Smart Sync</span>
  </div>
</div>
