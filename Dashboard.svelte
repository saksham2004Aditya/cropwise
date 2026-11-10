<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import { authStore } from './authStore'
  import WeatherCard from './WeatherCard.svelte'
  import IrrigationStatus from './IrrigationStatus.svelte'
  import Chart from './Chart.svelte'
  import { languageStore, t } from './i18nStore'

  const dispatch = createEventDispatcher()

  let data = null
  let loading = true
  let error = ''

  onMount(async () => {
    await loadDashboardData()
  })

  async function loadDashboardData() {
    try {
      loading = true
      error = ''
      const response = await fetch('/api/dashboard/data', {
        credentials: 'include'
      })

      if (response.ok) {
        data = await response.json()
      } else {
        error = t('dashboard.loadError', $languageStore)
      }
    } catch (err) {
      error = err.message || 'Failed to load dashboard data'
    } finally {
      loading = false
    }
  }

  function handleRefresh() {
    loadDashboardData()
  }

  function handleNavigation(event) {
    dispatch('navigate', event.detail)
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
  <!-- Header -->
  <header class="bg-white shadow-md sticky top-0 z-50 md:z-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="text-3xl">🌾</div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{t('dashboard.title', $languageStore)}</h1>
            <p class="text-sm text-gray-500">{t('dashboard.subtitle', $languageStore)}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            on:click={() => dispatch('navigate', 'weather')}
            class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
          >
            🌤️ Open Weather
          </button>
          <button
            on:click={handleRefresh}
            class="p-2 hover:bg-gray-100 rounded-lg transition border border-gray-200"
            title="Refresh dashboard data"
          >
            🔄
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if loading && !data}
      <div class="flex items-center justify-center py-16">
        <div class="text-center">
          <div class="mb-4 text-5xl animate-bounce">🌾</div>
          <p class="text-gray-600 font-medium">{t('dashboard.loading', $languageStore)}</p>
        </div>
      </div>
    {:else if error && !data}
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 text-center">
        <p class="text-red-700 font-semibold mb-2">Error: {error}</p>
        <button
          on:click={handleRefresh}
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold transition"
        >
          Try Again
        </button>
      </div>
    {:else if data}
      <!-- User Info -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-green-500">
        <h2 class="text-xl font-bold text-gray-900 mb-4">{t('dashboard.welcome', $languageStore, { name: $authStore.user?.name || 'Farmer' })}</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p class="text-gray-600 text-sm">{t('dashboard.farmSize', $languageStore)}</p>
            <p class="text-2xl font-bold text-green-600">{$authStore.user?.farmSize || '1.5 Acre'}</p>
          </div>
          <div>
            <p class="text-gray-600 text-sm">{t('dashboard.cropType', $languageStore)}</p>
            <p class="text-2xl font-bold text-green-600">{data.crop?.name || $authStore.user?.crop || 'Tomato'}</p>
          </div>
          <div>
            <p class="text-gray-600 text-sm">{t('common.location', $languageStore)}</p>
            <p class="text-lg font-semibold text-gray-900 truncate">{$authStore.user?.location || 'Nashik, Maharashtra'}</p>
          </div>
          <div>
            <p class="text-gray-600 text-sm">{t('dashboard.season', $languageStore)}</p>
            <p class="text-lg font-semibold text-gray-900">{data.crop?.season || 'Year-round'}</p>
          </div>
        </div>
      </div>

      <!-- Weather & Irrigation Status -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <WeatherCard 
          weather={data.weather} 
          location={$authStore.user?.location || 'Nashik, Maharashtra'} 
          on:navigate={handleNavigation} 
        />
        <IrrigationStatus 
          irrigation={data.irrigation} 
          water={data.water} 
        />
      </div>

      <!-- Sensor Data -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-lg shadow-md p-6">
          <p class="text-gray-600 text-sm">{t('dashboard.soilMoisture', $languageStore)}</p>
          <p class="text-3xl font-bold text-blue-600 mt-2">{data.sensors?.moisture ?? 28}%</p>
          <div class="mt-2 bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style="width: {data.sensors?.moisture ?? 28}%"
            />
          </div>
          <p class="text-xs text-gray-400 mt-2">Target: 35-45%</p>
        </div>
        <div class="bg-white rounded-lg shadow-md p-6">
          <p class="text-gray-600 text-sm">{t('dashboard.temperature', $languageStore)}</p>
          <p class="text-3xl font-bold text-orange-600 mt-2">{data.sensors?.temperature ?? data.weather?.temp ?? 30}°C</p>
          <p class="text-xs text-gray-500 mt-2">Feels like {data.weather?.feelsLike ?? data.weather?.temp ?? 30}°C</p>
        </div>
        <div class="bg-white rounded-lg shadow-md p-6">
          <p class="text-gray-600 text-sm">{t('dashboard.humidity', $languageStore)}</p>
          <p class="text-3xl font-bold text-cyan-600 mt-2">{data.sensors?.humidity ?? data.weather?.humidity ?? 60}%</p>
          <p class="text-xs text-gray-500 mt-2">Pressure: {data.weather?.pressure ?? 1013} hPa</p>
        </div>
        <div class="bg-white rounded-lg shadow-md p-6">
          <p class="text-gray-600 text-sm">{t('dashboard.rainfall', $languageStore)}</p>
          <p class="text-3xl font-bold text-indigo-600 mt-2">{data.sensors?.rainfall ?? data.weather?.rainfall ?? 0} mm</p>
          <p class="text-xs text-gray-500 mt-2">Rain Prob: {Math.round((data.weather?.rain_probability ?? 0.15) * 100)}%</p>
        </div>
      </div>

      <!-- Water Requirements -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 class="text-lg font-bold text-gray-900 mb-4">💧 {t('dashboard.waterManagement', $languageStore)}</h3>
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="text-center p-4 bg-green-50 rounded-lg">
            <p class="text-gray-600 text-sm">Required</p>
            <p class="text-3xl font-bold text-green-600">{data.water?.requirement ?? 450}</p>
            <p class="text-xs text-gray-500">Liters / mm</p>
          </div>
          <div class="text-center p-4 bg-blue-50 rounded-lg">
            <p class="text-gray-600 text-sm">Actually Used</p>
            <p class="text-3xl font-bold text-blue-600">{data.water?.actual ?? 380}</p>
            <p class="text-xs text-gray-500">({data.water?.efficiency ?? 85}% efficient)</p>
          </div>
          <div class="text-center p-4 bg-red-50 rounded-lg">
            <p class="text-gray-600 text-sm">Deficit</p>
            <p class="text-3xl font-bold text-red-600">{data.water?.deficit ?? 70}</p>
            <p class="text-xs text-gray-500">Remaining Need</p>
          </div>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            class="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-300"
            style="width: {Math.min(100, Math.round(((data.water?.actual ?? 380) / Math.max(1, data.water?.requirement ?? 450)) * 100))}%"
          />
        </div>
        <p class="text-xs text-gray-500 mt-2">
          {Math.min(100, Math.round(((data.water?.actual ?? 380) / Math.max(1, data.water?.requirement ?? 450)) * 100))}% of required water applied
        </p>
      </div>

      <!-- Recommendations -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 class="text-lg font-bold text-gray-900 mb-4">📋 {t('dashboard.recommendations', $languageStore)}</h3>
        <div class="space-y-2">
          {#each (data.recommendations || ['✓ Current weather conditions are optimal for irrigation']) as rec}
            <div class="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <span class="text-lg">💡</span>
              <p class="text-gray-700 text-sm font-medium">{rec}</p>
            </div>
          {/each}
        </div>
      </div>

      <!-- Charts -->
      {#if data.weekly}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Chart
            title="Weekly Soil Moisture (%)"
            days={data.weekly.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            values={data.weekly.moisture || [35, 28, 32, 25, 28, 30, 28]}
            color="#3b82f6"
          />
          <Chart
            title="Weekly Temperature (°C)"
            days={data.weekly.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            values={data.weekly.temperature || [28, 30, 32, 31, 32, 29, 30]}
            color="#f97316"
          />
          <Chart
            title="Weekly Water Usage (mm)"
            days={data.weekly.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            values={data.weekly.waterUsage || [420, 380, 450, 390, 380, 410, 380]}
            color="#22c55e"
          />
        </div>
      {/if}
    {/if}
  </main>
</div>
