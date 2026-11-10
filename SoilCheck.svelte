<script>
  import { authStore } from './authStore'
  import { farmStatsStore } from './farmStatsStore'

  const soilBands = {
    Sandy: { min: 35, max: 55, note: 'Low water retention. Use smaller, frequent irrigation cycles.' },
    Loamy: { min: 45, max: 65, note: 'Balanced retention and aeration. Maintain moderate irrigation cycles.' },
    Clay: { min: 50, max: 70, note: 'High water retention. Avoid overwatering and allow drainage time.' },
    Silty: { min: 45, max: 68, note: 'Good moisture hold. Watch compaction during repeated irrigation.' },
    Peaty: { min: 55, max: 75, note: 'Very high moisture hold. Reduce intensity to prevent saturation.' },
    Chalky: { min: 38, max: 58, note: 'Fast drainage and alkaline tendency. Use split irrigation schedules.' },
  }

  $: selectedSoilType = $authStore.user?.soilType || 'Loamy'
  $: currentBand = soilBands[selectedSoilType] || soilBands.Loamy
  $: avgMoisture = $farmStatsStore.avgMoisture
  $: avgHealth = $farmStatsStore.avgHealth
  $: needsIrrigation = $farmStatsStore.farmsNeedingIrrigation
  $: totalFarms = $farmStatsStore.totalFarms
  $: weather = $farmStatsStore.currentWeather || 'sunny'

  $: moistureStatus = avgMoisture < currentBand.min
    ? 'Low'
    : avgMoisture > currentBand.max
      ? 'High'
      : 'Optimal'

  $: soilRiskLevel =
    moistureStatus === 'Optimal' && avgHealth >= 70
      ? 'Stable'
      : moistureStatus === 'Low' || avgHealth < 55
        ? 'High Risk'
        : 'Moderate'

  $: moistureDelta =
    avgMoisture < currentBand.min
      ? currentBand.min - avgMoisture
      : avgMoisture > currentBand.max
        ? avgMoisture - currentBand.max
        : 0

  $: actionableAdvice = moistureStatus === 'Low'
    ? `Increase irrigation by ${Math.max(8, Math.round(moistureDelta * 1.6))}% for the next cycle.`
    : moistureStatus === 'High'
      ? `Reduce irrigation by ${Math.max(8, Math.round(moistureDelta * 1.3))}% and allow drainage.`
      : 'Current moisture is within target range. Maintain existing schedule.'
</script>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 md:p-8">
  <header class="bg-white shadow-md rounded-lg mb-6">
    <div class="px-6 py-5">
      <h1 class="text-3xl font-bold text-gray-900">🧪 Soil Check</h1>
      <p class="text-gray-500 mt-1">Live soil monitoring report from simulation stats</p>
    </div>
  </header>

  <main class="max-w-6xl mx-auto space-y-6">
    <div class="bg-white rounded-lg shadow-md p-5 border-l-4 border-emerald-500">
      <p class="text-sm text-gray-700">
        Soil Type: <span class="font-semibold">{selectedSoilType}</span>
        <span class="mx-2">•</span>
        Weather: <span class="font-semibold capitalize">{weather}</span>
        <span class="mx-2">•</span>
        Farms Monitored: <span class="font-semibold">{totalFarms || '-'}</span>
      </p>
      <p class="text-sm mt-2 text-gray-600">Target moisture range for {selectedSoilType}: <span class="font-semibold">{currentBand.min}% - {currentBand.max}%</span></p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white rounded-lg shadow-md p-5">
        <p class="text-xs uppercase tracking-wide text-gray-500">Avg Moisture</p>
        <p class="text-2xl font-bold text-blue-700 mt-2">{avgMoisture}%</p>
      </div>
      <div class="bg-white rounded-lg shadow-md p-5">
        <p class="text-xs uppercase tracking-wide text-gray-500">Avg Crop Health</p>
        <p class="text-2xl font-bold text-emerald-700 mt-2">{avgHealth}%</p>
      </div>
      <div class="bg-white rounded-lg shadow-md p-5">
        <p class="text-xs uppercase tracking-wide text-gray-500">Moisture Status</p>
        <p class="text-2xl font-bold text-indigo-700 mt-2">{moistureStatus}</p>
      </div>
      <div class="bg-white rounded-lg shadow-md p-5">
        <p class="text-xs uppercase tracking-wide text-gray-500">Soil Risk</p>
        <p class="text-2xl font-bold mt-2 {soilRiskLevel === 'Stable' ? 'text-emerald-700' : soilRiskLevel === 'Moderate' ? 'text-amber-700' : 'text-red-700'}">{soilRiskLevel}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-lg font-bold text-gray-900 mb-4">📋 Soil Report</h2>
        <div class="space-y-3 text-sm text-gray-700">
          <p><span class="font-semibold">Needs Irrigation:</span> {needsIrrigation} farm(s)</p>
          <p><span class="font-semibold">Soil Note:</span> {currentBand.note}</p>
          <p><span class="font-semibold">Action:</span> {actionableAdvice}</p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-lg font-bold text-gray-900 mb-4">💡 Monitoring Tips</h2>
        <div class="space-y-3 text-sm">
          <p class="text-gray-600">
            • Check moisture readings before early morning irrigation cycles.
          </p>
          <p class="text-gray-600">
            • Avoid prolonged high-moisture periods to limit fungal risk in root zones.
          </p>
          <p class="text-gray-600">
            • Adjust soil type in Profile if local plot composition differs.
          </p>
        </div>
      </div>
    </div>
  </main>
</div>
