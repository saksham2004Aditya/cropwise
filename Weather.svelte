<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import { authStore } from './authStore'
  import { weatherStore, fetchWeatherData } from './weatherStore'
  import { languageStore, t } from './i18nStore'

  const dispatch = createEventDispatcher()

  let location = $authStore.user?.location || 'Nashik, Maharashtra'
  let tempLocation = location

  const quickCities = ['Nashik', 'Pune', 'Delhi', 'Mumbai', 'Bengaluru', 'Punjab', 'Kolkata', 'Malda', 'Raiganj', 'Jaipur', 'Hyderabad']

  onMount(async () => {
    const locToFetch = location || 'Nashik, Maharashtra'
    await fetchWeatherData(locToFetch)
  })

  async function handleSearchWeather() {
    if (tempLocation.trim()) {
      location = tempLocation.trim()
      await fetchWeatherData(location)
    }
  }

  async function selectCity(city) {
    tempLocation = city
    location = city
    await fetchWeatherData(city)
  }

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

  function handleKeyPress(e) {
    if (e.key === 'Enter') {
      handleSearchWeather()
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
  <!-- Header -->
  <header class="bg-white shadow-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">🌤️ {t('weather.title', $languageStore)}</h1>
        <p class="text-xs sm:text-sm text-gray-500 mt-0.5">{t('weather.subtitle', $languageStore)}</p>
      </div>
      <button
        type="button"
        on:click={() => dispatch('navigate', 'dashboard')}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
      >
        <span>←</span>
        <span>Dashboard</span>
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Search Section -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <label for="weather-location-input" class="block text-sm font-medium text-gray-700 mb-3">{t('weather.enterLocation', $languageStore)}</label>
      <div class="flex gap-3">
        <input
          id="weather-location-input"
          type="text"
          bind:value={tempLocation}
          on:keypress={handleKeyPress}
          placeholder="e.g., Nashik, Pune, Delhi, Mumbai, Punjab, Malda..."
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
        />
        <button
          type="button"
          on:click={handleSearchWeather}
          disabled={$weatherStore.loading}
          class="px-5 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold text-sm sm:text-base shadow"
        >
          {$weatherStore.loading ? `🔄 ${t('weather.searching', $languageStore)}` : t('common.search', $languageStore)}
        </button>
      </div>

      <!-- Quick select cities -->
      <div class="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
        <span class="text-xs text-gray-400 font-medium mr-1">Quick Select:</span>
        {#each quickCities as city}
          <button
            type="button"
            on:click={() => selectCity(city)}
            class="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-full transition border border-blue-200"
          >
            {city}
          </button>
        {/each}
      </div>

      {#if $weatherStore.lastUpdated}
        <div class="flex flex-wrap items-center justify-between mt-3 pt-2 text-xs text-gray-500 gap-2">
          <span>{t('weather.lastUpdated', $languageStore)} {$weatherStore.lastUpdated}</span>
          {#if $weatherStore.data}
            <span class="inline-flex items-center gap-1.5 font-medium text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {$weatherStore.data.source === 'open-meteo' ? 'Open-Meteo Worldwide Live' : $weatherStore.data.source === 'openweathermap' ? 'OpenWeatherMap Live' : 'Simulated Weather'}
            </span>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Error Message -->
    {#if $weatherStore.error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-700 font-semibold">⚠️ {t('weather.error', $languageStore)}: {$weatherStore.error}</p>
      </div>
    {/if}

    <!-- Loading State -->
    {#if $weatherStore.loading}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="mb-4 text-5xl animate-bounce">🌤️</div>
          <p class="text-gray-600">{t('weather.fetching', $languageStore)}</p>
        </div>
      </div>
    {:else if $weatherStore.data}
      <!-- Main Weather Info Card -->
      <div class="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-lg p-6 sm:p-8 text-white mb-6">
        <div class="flex items-start justify-between mb-8">
          <div>
            <h2 class="text-3xl sm:text-4xl font-bold mb-1">{$weatherStore.location}</h2>
            <p class="text-blue-100 capitalize text-lg">{$weatherStore.data.description || $weatherStore.data.condition || 'Clear sky'}</p>
          </div>
          <div class="text-6xl sm:text-7xl">{getWeatherEmoji($weatherStore.data.icon)}</div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Temperature Section -->
          <div class="bg-white bg-opacity-20 rounded-lg p-6 backdrop-blur">
            <p class="text-blue-100 text-sm mb-2">{t('weather.temperature', $languageStore)}</p>
            <p class="text-5xl sm:text-6xl font-bold mb-2">{$weatherStore.data.temp ?? 30}°C</p>
            <p class="text-blue-100">{t('weather.feelsLike', $languageStore)} {$weatherStore.data.feelsLike ?? $weatherStore.data.temp ?? 30}°C</p>
          </div>

          <!-- Condition Summary -->
          <div class="bg-white bg-opacity-20 rounded-lg p-6 backdrop-blur">
            <p class="text-blue-100 text-sm mb-4">{t('weather.condition', $languageStore)}</p>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-blue-100">{t('weather.humidity', $languageStore)}</span>
                <span class="text-2xl font-bold">{$weatherStore.data.humidity ?? 60}%</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-blue-100">{t('weather.windSpeed', $languageStore)}</span>
                <span class="text-2xl font-bold">{$weatherStore.data.windSpeed ?? $weatherStore.data.wind_kph ?? 12} km/h</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed Information Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Pressure Card -->
        <div class="bg-white rounded-lg shadow p-5">
          <div class="text-3xl mb-2">🔻</div>
          <p class="text-gray-600 text-sm mb-1">Pressure</p>
          <p class="text-3xl font-bold text-gray-900">{$weatherStore.data.pressure ?? 1013}</p>
          <p class="text-gray-500 text-xs">hPa / millibars</p>
        </div>

        <!-- Cloud Cover Card -->
        <div class="bg-white rounded-lg shadow p-5">
          <div class="text-3xl mb-2">☁️</div>
          <p class="text-gray-600 text-sm mb-1">Cloud Cover</p>
          <p class="text-3xl font-bold text-gray-900">{$weatherStore.data.cloudiness ?? 20}%</p>
          <div class="mt-2 bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style="width: {$weatherStore.data.cloudiness ?? 20}%"
            />
          </div>
        </div>

        <!-- Rainfall Card -->
        <div class="bg-white rounded-lg shadow p-5">
          <div class="text-3xl mb-2">🌧️</div>
          <p class="text-gray-600 text-sm mb-1">Precipitation / Rain</p>
          <p class="text-3xl font-bold text-gray-900">{$weatherStore.data.rainfall ?? 0} mm</p>
          <p class="text-gray-500 text-xs">Probability: {Math.round(($weatherStore.data.rain_probability ?? 0.15) * 100)}%</p>
        </div>

        <!-- UV Card -->
        <div class="bg-white rounded-lg shadow p-5">
          <div class="text-3xl mb-2">☀️</div>
          <p class="text-gray-600 text-sm mb-1">UV Index</p>
          <p class="text-3xl font-bold text-gray-900">{$weatherStore.data.uv_index ?? 7}</p>
          <p class="text-gray-500 text-xs">Moderate to High</p>
        </div>
      </div>

      <!-- Irrigation Recommendations -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-bold text-gray-900 mb-4">📋 {t('weather.recommendations', $languageStore)}</h3>
        <div class="space-y-3">
          {#if ($weatherStore.data.humidity ?? 60) < 40}
            <div class="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <span class="text-lg">⚠️</span>
              <p class="text-yellow-800 text-sm">
                <strong>Low Humidity:</strong> Humidity is {$weatherStore.data.humidity}% - atmospheric water deficit is high; schedule additional irrigation cycle.
              </p>
            </div>
          {/if}

          {#if ($weatherStore.data.rainfall ?? 0) > 0}
            <div class="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span class="text-lg">💧</span>
              <p class="text-blue-800 text-sm">
                <strong>Rainfall Detected:</strong> {$weatherStore.data.rainfall} mm rain registered - reduce or postpone upcoming scheduled irrigation to save water.
              </p>
            </div>
          {/if}

          {#if ($weatherStore.data.temp ?? 30) > 35}
            <div class="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <span class="text-lg">🌡️</span>
              <p class="text-orange-800 text-sm">
                <strong>High Temperature:</strong> At {$weatherStore.data.temp}°C, run irrigation early morning or late evening to protect crops from heat stress.
              </p>
            </div>
          {/if}

          {#if ($weatherStore.data.cloudiness ?? 20) > 60}
            <div class="flex items-start gap-3 p-3 bg-cyan-50 rounded-lg border border-cyan-200">
              <span class="text-lg">☁️</span>
              <p class="text-cyan-800 text-sm">
                <strong>Overcast Sky:</strong> {$weatherStore.data.cloudiness}% cloud cover reduces solar radiation and evapotranspiration.
              </p>
            </div>
          {/if}

          {#if ($weatherStore.data.humidity ?? 60) >= 40 && ($weatherStore.data.rainfall ?? 0) === 0 && ($weatherStore.data.temp ?? 30) <= 35 && ($weatherStore.data.cloudiness ?? 20) <= 60}
            <div class="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <span class="text-lg">✅</span>
              <p class="text-green-800 text-sm">
                <strong>Optimal Conditions:</strong> Current weather conditions are ideal for regular automated drip irrigation and healthy crop growth.
              </p>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="text-center py-12 bg-white rounded-lg shadow">
        <p class="text-gray-600 text-lg">Enter a location to view weather information</p>
      </div>
    {/if}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
