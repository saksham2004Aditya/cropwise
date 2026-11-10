<script>
  import { authStore } from './authStore'
  import { languageStore, t } from './i18nStore'

  const crops = [
    { id: 'Tomato', name: 'Tomato' },
    { id: 'Rice', name: 'Rice (Paddy)' },
    { id: 'Wheat', name: 'Wheat' },
    { id: 'Corn', name: 'Corn (Maize)' },
    { id: 'Cotton', name: 'Cotton' },
    { id: 'Potato', name: 'Potato' },
    { id: 'Onion', name: 'Onion' },
    { id: 'Sugarcane', name: 'Sugarcane' },
  ]

  let selectedCrop = $authStore.user?.crop || 'Tomato'

  $: if ($authStore.user?.crop && !selectedCrop) {
    selectedCrop = $authStore.user.crop
  }

  const stageDescriptions = {
    germination: 'Seed sprouting and early root/shoot emergence with predominant soil/substrate exposure.',
    vegetative: 'Rapid photosynthetic leaf and canopy expansion with high chlorophyll vigor.',
    flowering: 'Reproductive flower blossom initiation, pollination, and initial fruit/grain set.',
    maturity: 'Harvest readiness, fruit ripening, or grain golden drydown phase.',
    'booting/heading': 'Head emergence and pollination preparation phase.',
    'grain filling': 'Grain development and nutrient storage phase.',
    ripening: 'Final drydown and maturity stage.',
  }

  let selectedFile = null
  let previewUrl = ''
  let loading = false
  let identifying = false
  let error = ''
  let prediction = null
  let cropIdentification = null

  function onFileSelect(event) {
    error = ''
    prediction = null
    cropIdentification = null

    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      error = 'Please upload a valid image file (JPG, PNG, WebP).'
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      error = 'Image size should be under 15 MB.'
      return
    }

    selectedFile = file
    previewUrl = URL.createObjectURL(file)
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result
        const base64 = dataUrl.split(',')[1]
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('Failed to read image file.'))
      reader.readAsDataURL(file)
    })
  }

  async function runPrediction() {
    if (!selectedFile) {
      error = 'Please select a crop field or leaf image first.'
      return
    }

    loading = true
    error = ''
    prediction = null

    try {
      const imageBase64 = await fileToBase64(selectedFile)

      const response = await fetch('/api/crop-stage/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          imageBase64,
          cropType: selectedCrop,
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const rawText = await response.text()
        const shortBody = rawText.slice(0, 120).replace(/\s+/g, ' ').trim()
        throw new Error(
          `Server returned non-JSON response (status ${response.status}). Ensure backend is active. Response: ${shortBody}`
        )
      }

      const data = await response.json()
      if (!response.ok || data.success === false) {
        throw new Error(data.error || `Prediction failed with status ${response.status}`)
      }

      prediction = data
    } catch (err) {
      error = err.message || 'Error executing crop stage analysis'
    } finally {
      loading = false
    }
  }

  async function identifyCrop() {
    if (!selectedFile) {
      error = 'Please select a crop field or leaf image first.'
      return
    }

    identifying = true
    error = ''
    cropIdentification = null

    try {
      const imageBase64 = await fileToBase64(selectedFile)
      const response = await fetch('/api/crop/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ imageBase64 }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || `Crop identification failed with status ${response.status}`)
      }
      cropIdentification = data
      if (data.crop !== 'Unknown') {
        selectedCrop = data.crop
      }
    } catch (err) {
      error = err.message || 'Error identifying crop'
    } finally {
      identifying = false
    }
  }

  function clearSelection() {
    selectedFile = null
    prediction = null
    cropIdentification = null
    error = ''
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      previewUrl = ''
    }
  }

  function getStageColor(stage) {
    const s = (stage || '').toLowerCase()
    if (s.includes('germ')) return 'bg-sky-100 text-sky-800 border-sky-300'
    if (s.includes('veg')) return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    if (s.includes('flow')) return 'bg-amber-100 text-amber-800 border-amber-300'
    if (s.includes('mat') || s.includes('ripe')) return 'bg-orange-100 text-orange-800 border-orange-300'
    return 'bg-blue-100 text-blue-800 border-blue-300'
  }

  function getStageBarColor(stage) {
    const s = (stage || '').toLowerCase()
    if (s.includes('germ')) return 'bg-sky-500'
    if (s.includes('veg')) return 'bg-emerald-500'
    if (s.includes('flow')) return 'bg-amber-500'
    if (s.includes('mat') || s.includes('ripe')) return 'bg-orange-500'
    return 'bg-blue-500'
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 md:p-8">
  <header class="bg-white shadow-md rounded-lg mb-6">
    <div class="px-6 py-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">🌱 {t('cropStage.title', $languageStore)}</h1>
          <p class="text-gray-500 mt-1">{t('cropStage.subtitle', $languageStore)}</p>
        </div>
        <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-800">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Computer Vision Stage Engine v2.5</span>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-4xl mx-auto space-y-6">
    <!-- Configuration & Upload Card -->
    <div class="bg-white rounded-lg shadow-lg p-6 md:p-8">
      <!-- Crop selector bar -->
      <div class="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label for="cropSelect" class="block text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
              Select Crop Type for Stage-Specific Computer Vision
            </label>
            <p class="text-xs text-emerald-700">Heuristics dynamically adapt morphological thresholds to selected crop</p>
          </div>
          <div class="flex items-center gap-2">
            <select
              id="cropSelect"
              bind:value={selectedCrop}
              class="px-3.5 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-semibold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {#each crops as c}
                <option value={c.id}>{c.name}</option>
              {/each}
            </select>
            {#if selectedCrop === $authStore.user?.crop}
              <span class="text-xs font-bold text-emerald-700 bg-white px-2 py-1 rounded border border-emerald-200 shadow-xs" title="Matches your profile crop">
                Farm Crop
              </span>
            {/if}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div>
          <label for="cropImageFile" class="block text-sm font-semibold text-gray-700 mb-2">
            Upload Field / Canopy / Plant Photo
          </label>
          <input
            id="cropImageFile"
            type="file"
            accept="image/*"
            on:change={onFileSelect}
            class="w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:border-0 file:rounded-md file:bg-emerald-600 file:text-white file:font-semibold hover:file:bg-emerald-700 cursor-pointer border border-gray-200 rounded-lg p-1 bg-gray-50"
          />

          <div class="mt-4 flex gap-3">
            <button
              type="button"
              on:click={identifyCrop}
              disabled={identifying || loading || !selectedFile}
              class="flex-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow flex items-center justify-center gap-2"
            >
              {#if identifying}
                <span class="animate-spin text-lg">⚙️</span>
                <span>Identifying...</span>
              {:else}
                <span>🌾</span>
                <span>Identify Crop</span>
              {/if}
            </button>
            <button
              type="button"
              on:click={runPrediction}
              disabled={loading || identifying || !selectedFile}
              class="flex-1 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50 transition shadow flex items-center justify-center gap-2"
            >
              {#if loading}
                <span class="animate-spin text-lg">⚙️</span>
                <span>{t('cropStage.analyzing', $languageStore)}</span>
              {:else}
                <span>🔬</span>
                <span>{t('cropStage.detect', $languageStore)}</span>
              {/if}
            </button>
            <button
              type="button"
              on:click={clearSelection}
              disabled={loading}
              class="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {t('common.clear', $languageStore)}
            </button>
          </div>

          {#if cropIdentification}
            <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p class="text-sm font-semibold text-blue-900">
                Identified crop: <span class="text-lg">{cropIdentification.crop}</span>
              </p>
              <p class="text-xs text-blue-700 mt-1">
                Gemini confidence: {(cropIdentification.confidence * 100).toFixed(1)}%
              </p>
            </div>
          {/if}

          {#if error}
            <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-700 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </p>
            </div>
          {/if}

          <div class="mt-4 text-xs text-gray-400 space-y-1">
            <p>• Multi-spectral CLAHE illumination normalization active</p>
            <p>• Analyzes ExG, ExR, ExY, GLI, and morphological circularity</p>
          </div>
        </div>

        <div class="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 min-h-[240px] flex items-center justify-center relative overflow-hidden">
          {#if previewUrl}
            <img src={previewUrl} alt="Selected crop" class="max-h-64 max-w-full rounded-lg object-contain shadow-md" />
          {:else}
            <div class="text-center text-gray-400 py-8">
              <span class="text-5xl block mb-2 opacity-60">📷</span>
              <p class="text-sm font-medium">{t('cropStage.preview', $languageStore)}</p>
              <p class="text-xs text-gray-400 mt-1">Select an image to preview before detection</p>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Prediction Results -->
    {#if prediction}
      <div class="bg-white rounded-lg shadow-lg p-6 md:p-8 space-y-6 border-t-4 border-emerald-500">
        <!-- Result Header -->
        <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-gray-400">Diagnosis Result</span>
            <div class="flex items-center gap-3 mt-1">
              <h2 class="text-3xl font-extrabold text-gray-900">{prediction.stage}</h2>
              <span class={`px-3 py-1 rounded-full text-sm font-bold border ${getStageColor(prediction.stage)}`}>
                {(prediction.confidence * 100).toFixed(1)}% Confidence
              </span>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs text-gray-400 block">Target Crop</span>
            <span class="text-lg font-bold text-emerald-700">{prediction.cropType}</span>
          </div>
        </div>

        <!-- Stage Definition -->
        {#if stageDescriptions[prediction.stage?.toLowerCase()]}
          <div class="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-sm text-emerald-900">
            <strong>Phase Overview:</strong> {stageDescriptions[prediction.stage?.toLowerCase()]}
          </div>
        {/if}

        <!-- Multi-Spectral Computer Vision Metrics -->
        {#if prediction.visualMetrics}
          <div>
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-2">
              <span>📊</span>
              <span>Computer Vision Multi-Spectral Metrics</span>
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div class="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                <span class="text-xs text-gray-500 block">Canopy Cover</span>
                <span class="text-lg font-bold text-emerald-600 mt-0.5 block">{prediction.visualMetrics.greenCanopy}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                <span class="text-xs text-gray-500 block">Blossoms</span>
                <span class="text-lg font-bold text-amber-600 mt-0.5 block">{prediction.visualMetrics.flowerBlossom}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                <span class="text-xs text-gray-500 block">Maturity / Fruit</span>
                <span class="text-lg font-bold text-orange-600 mt-0.5 block">{prediction.visualMetrics.fruitMaturity}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center">
                <span class="text-xs text-gray-500 block">Soil Exposure</span>
                <span class="text-lg font-bold text-stone-600 mt-0.5 block">{prediction.visualMetrics.soilExposure}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center sm:col-span-1">
                <span class="text-xs text-gray-500 block">Canopy Density</span>
                <span class="text-xs font-bold text-gray-800 mt-1.5 block truncate">{prediction.visualMetrics.canopyStructure}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg border border-gray-100 text-center sm:col-span-1">
                <span class="text-xs text-gray-500 block">Vigor Index</span>
                <span class="text-xs font-bold text-emerald-700 mt-1.5 block truncate">{prediction.visualMetrics.chlorophyllVigor}</span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Probability Distribution Bar across all 4 stages -->
        {#if prediction.topPredictions?.length}
          <div>
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-2">
              <span>📈</span>
              <span>Stage Probability Distribution</span>
            </h3>
            <div class="space-y-2.5">
              {#each prediction.topPredictions as item}
                <div>
                  <div class="flex justify-between text-xs font-semibold mb-1">
                    <span class={item.stage === prediction.stage ? 'text-gray-900 font-bold' : 'text-gray-600'}>
                      {item.stage} {item.stage === prediction.stage ? '★ (Detected)' : ''}
                    </span>
                    <span class="text-gray-700 font-bold">{(item.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div class="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      class={`h-2.5 rounded-full transition-all duration-500 ${getStageBarColor(item.stage)}`}
                      style="width: {Math.max(2, Math.round(item.confidence * 100))}%"
                    ></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Structured Agronomist Advisory Points -->
        {#if prediction.summaryPoints && prediction.summaryPoints.length > 0}
          <div class="pt-4 border-t border-gray-100">
            <h3 class="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📋</span>
              <span>CropWise Agronomist Stage Management Advisory</span>
            </h3>
            <div class="space-y-3">
              {#each prediction.summaryPoints as point}
                <div class="p-3.5 bg-gradient-to-r from-emerald-50/60 to-blue-50/40 rounded-xl border border-emerald-100/80 text-sm text-gray-800 leading-relaxed">
                  <span>{point.replace(/\*\*/g, '')}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <div class="pt-2 text-right">
          <span class="text-xs text-gray-400">Engine: {prediction.model}</span>
        </div>
      </div>
    {/if}
  </main>
</div>
