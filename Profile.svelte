<script>
  import { createEventDispatcher } from 'svelte'
  import { authStore } from './authStore'
  import { languageStore, t } from './i18nStore'
  import { farmStatsStore } from './farmStatsStore'

  const dispatch = createEventDispatcher()

  let isEditing = false
  let editData = {
    name: $authStore.user?.name || '',
    farmSize: $authStore.user?.farmSize || '',
    crop: $authStore.user?.crop || 'Tomato',
    soilType: $authStore.user?.soilType || 'Loamy',
    location: $authStore.user?.location || '',
  }
  let error = ''
  let success = false
  let loading = false

  const crops = ['Tomato', 'Rice', 'Wheat', 'Corn', 'Sugarcane', 'Cotton', 'Potato', 'Onion']
  const soilTypes = ['Sandy', 'Loamy', 'Clay', 'Silty', 'Peaty', 'Chalky']

  async function handleSaveProfile() {
    error = ''
    success = false
    loading = true

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editData),
      })

      const result = await response.json()

      if (response.ok) {
        authStore.update((state) => ({
          ...state,
          user: result.user || { ...state.user, ...editData },
        }))
        success = true
        isEditing = false
        setTimeout(() => (success = false), 3000)
      } else {
        error = result.error || 'Failed to update profile'
      }
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }

  function handleCancel() {
    editData = {
      name: $authStore.user?.name || '',
      farmSize: $authStore.user?.farmSize || '',
      crop: $authStore.user?.crop || 'Tomato',
      soilType: $authStore.user?.soilType || 'Loamy',
      location: $authStore.user?.location || '',
    }
    isEditing = false
    error = ''
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 md:p-8">
  <!-- Header -->
  <header class="bg-white shadow-md rounded-lg mb-6">
    <div class="px-6 py-5 md:flex md:items-center md:justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">👤 {t('profile.title', $languageStore)}</h1>
        <p class="text-gray-500 mt-1">{t('profile.subtitle', $languageStore)}</p>
      </div>
    </div>
  </header>

  <!-- Profile Content -->
  <main class="max-w-2xl mx-auto">
    {#if success}
      <div class="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
        <p class="text-green-700 font-semibold">✓ {t('profile.updated', $languageStore)}</p>
      </div>
    {/if}

    {#if error}
      <div class="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
        <p class="text-red-700 font-semibold">{error}</p>
      </div>
    {/if}

    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <!-- Profile Header -->
      <div class="bg-gradient-to-r from-green-600 to-emerald-700 px-8 py-10 text-center text-white">
        <div class="text-6xl mb-3">👤</div>
        <h2 class="text-3xl font-bold mb-1">{$authStore.user?.name || 'Farmer'}</h2>
        <p class="text-green-100">@{$authStore.user?.username || 'user'}</p>
        <p class="text-green-200 text-xs mt-1">Smart Farming & Irrigation Network</p>
      </div>

      <!-- Profile Info -->
      <div class="px-6 py-8 md:px-8">
        {#if !isEditing}
          <!-- View Mode -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 class="text-lg font-semibold text-gray-700 mb-4">{t('profile.personalInfo', $languageStore)}</h3>
              <div class="space-y-4">
                <div>
                  <p class="text-gray-600 text-sm">{t('profile.fullName', $languageStore)}</p>
                  <p class="text-xl font-semibold text-gray-900">{$authStore.user?.name || '-'}</p>
                </div>
                <div>
                  <p class="text-gray-600 text-sm">{t('profile.username', $languageStore)}</p>
                  <p class="text-xl font-semibold text-gray-900">{$authStore.user?.username || '-'}</p>
                </div>
                <div>
                  <p class="text-gray-600 text-sm">{t('profile.location', $languageStore)}</p>
                  <p class="text-xl font-semibold text-gray-900">{$authStore.user?.location || t('profile.notSet', $languageStore)}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-lg font-semibold text-gray-700 mb-4">{t('profile.farmInfo', $languageStore)}</h3>
              <div class="space-y-4">
                <div>
                  <p class="text-gray-600 text-sm">{t('profile.farmSize', $languageStore)}</p>
                  <p class="text-xl font-semibold text-green-600">{$authStore.user?.farmSize || '-'}</p>
                </div>
                <div>
                  <p class="text-gray-600 text-sm">{t('profile.primaryCrop', $languageStore)}</p>
                  <p class="text-xl font-semibold text-green-600">{$authStore.user?.crop || '-'}</p>
                </div>
                <div>
                  <p class="text-gray-600 text-sm">{t('profile.accountStatus', $languageStore)}</p>
                  <p class="text-xl font-semibold text-green-600">✓ {t('profile.active', $languageStore)}</p>
                </div>
                <div>
                  <p class="text-gray-600 text-sm">Soil Type</p>
                  <p class="text-xl font-semibold text-green-600">{$authStore.user?.soilType || 'Loamy'}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="pt-6 border-t border-gray-200">
            <h3 class="text-lg font-semibold text-gray-700 mb-4">Account Statistics</h3>
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-blue-50 rounded-lg p-4 text-center">
                <p class="text-gray-600 text-xs">Avg Moisture</p>
                <p class="text-2xl font-bold text-blue-600 mt-1">{$farmStatsStore.avgMoisture}%</p>
              </div>
              <div class="bg-green-50 rounded-lg p-4 text-center">
                <p class="text-gray-600 text-xs">Avg Health</p>
                <p class="text-2xl font-bold text-green-600 mt-1">{$farmStatsStore.avgHealth}%</p>
              </div>
              <div class="bg-purple-50 rounded-lg p-4 text-center">
                <p class="text-gray-600 text-xs">Needs Irrigation</p>
                <p class="text-2xl font-bold text-purple-600 mt-1">{$farmStatsStore.farmsNeedingIrrigation}</p>
              </div>
            </div>
          </div>

          <!-- Edit Button -->
          <div class="mt-8 pt-6 border-t border-gray-200">
            <button
              on:click={() => (isEditing = true)}
              class="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow"
            >
              ✏️ {t('profile.editProfile', $languageStore)}
            </button>
          </div>
        {:else}
          <!-- Edit Mode -->
          <h3 class="text-lg font-semibold text-gray-700 mb-6">{t('profile.editFarmInfo', $languageStore)}</h3>

          <div class="space-y-6 mb-8">
            <div>
              <label for="fullNameInput" class="block text-sm font-semibold text-gray-700 mb-2">{t('profile.fullName', $languageStore)}</label>
              <input
                id="fullNameInput"
                type="text"
                bind:value={editData.name}
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="farmSizeInput" class="block text-sm font-semibold text-gray-700 mb-2">{t('profile.farmSize', $languageStore)}</label>
                <input
                  id="farmSizeInput"
                  type="text"
                  bind:value={editData.farmSize}
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label for="cropSelect" class="block text-sm font-semibold text-gray-700 mb-2">{t('profile.primaryCrop', $languageStore)}</label>
                <select
                  id="cropSelect"
                  bind:value={editData.crop}
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {#each crops as crop}
                    <option value={crop}>{crop}</option>
                  {/each}
                </select>
              </div>
            </div>

            <div>
              <label for="soilTypeSelect" class="block text-sm font-semibold text-gray-700 mb-2">Soil Type</label>
              <select
                id="soilTypeSelect"
                bind:value={editData.soilType}
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {#each soilTypes as soilType}
                  <option value={soilType}>{soilType}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="locationInput" class="block text-sm font-semibold text-gray-700 mb-2">{t('profile.location', $languageStore)}</label>
              <input
                id="locationInput"
                type="text"
                bind:value={editData.location}
                placeholder="City, State"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <p class="text-xs text-gray-500 mt-1">{t('profile.weatherDetection', $languageStore)}</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3">
            <button
              on:click={handleCancel}
              disabled={loading}
              class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition"
            >
              {t('common.cancel', $languageStore)}
            </button>
            <button
              on:click={handleSaveProfile}
              disabled={loading}
              class="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 shadow"
            >
              {loading ? t('profile.saving', $languageStore) : t('profile.saveChanges', $languageStore)}
            </button>
          </div>
        {/if}
      </div>
    </div>
  </main>
</div>
