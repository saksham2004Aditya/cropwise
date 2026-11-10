<script>
  import { createEventDispatcher } from 'svelte'
  import { authStore } from './authStore'
  import { languageStore, t } from './i18nStore'

  const dispatch = createEventDispatcher()

  let isOpen = false
  export let currentPage = 'dashboard'

  function navigate(page) {
    currentPage = page
    dispatch('navigate', page)
    isOpen = false
  }

  function handleLogout() {
    dispatch('navigate', 'logout')
    isOpen = false
  }

  const menuItems = [
    { id: 'dashboard', icon: '📊', labelKey: 'sidebar.dashboard', color: 'blue' },
    { id: 'weather', icon: '🌤️', labelKey: 'sidebar.weather', color: 'cyan' },
    { id: 'irrigation', icon: '💧', labelKey: 'sidebar.irrigation', color: 'green' },
    { id: 'crop-stage', icon: '🌱', labelKey: 'sidebar.cropStage', color: 'emerald' },
    { id: 'soil-check', icon: '🧪', labelKey: 'sidebar.soilCheck', color: 'teal' },
    { id: 'farm', icon: '🌾', labelKey: 'sidebar.farmInfo', color: 'amber' },
    { id: 'profile', icon: '👤', labelKey: 'sidebar.profile', color: 'purple' },
    { id: 'settings', icon: '⚙️', labelKey: 'sidebar.settings', color: 'gray' },
  ]
</script>

<!-- Mobile menu button -->
<button
  type="button"
  on:click={() => (isOpen = !isOpen)}
  class="fixed top-4 left-4 z-50 md:hidden p-2.5 bg-green-700 text-white rounded-lg shadow-lg"
  aria-label="Toggle navigation menu"
>
  ☰
</button>

<!-- Sidebar -->
<aside
  class={`fixed md:static w-64 h-screen bg-gradient-to-b from-green-800 to-green-900 text-white shadow-xl flex flex-col justify-between transform transition-transform duration-300 z-40 ${
    isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
  }`}
>
  <div class="flex-1 flex flex-col min-h-0">
    <!-- Logo -->
    <div class="p-6 border-b border-green-700 flex-shrink-0">
      <div class="flex items-center gap-3">
        <div class="text-3xl">🌾</div>
        <div>
          <h1 class="text-xl font-bold tracking-tight">{t('sidebar.smartFarming', $languageStore)}</h1>
          <p class="text-xs text-green-200">Smart Farming v2.0</p>
        </div>
      </div>
    </div>

    <!-- User Info -->
    <div class="p-3.5 mx-3 mt-3 rounded-lg bg-green-700/50 border border-green-600/40 flex-shrink-0">
      <p class="text-xs text-green-200">{t('sidebar.loggedInAs', $languageStore)}</p>
      <p class="font-semibold text-sm truncate">{$authStore.user?.name || t('sidebar.user', $languageStore)}</p>
      <p class="text-xs text-green-300 truncate">{$authStore.user?.farmSize || '1.5 Acre'} • {$authStore.user?.crop || 'Crop'}</p>
    </div>

    <!-- Navigation Menu -->
    <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-1">
      {#each menuItems as item}
        <button
          type="button"
          on:click={() => navigate(item.id)}
          class={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            currentPage === item.id
              ? 'bg-white text-green-900 font-bold shadow-md'
              : 'text-green-100 hover:bg-green-700/50 hover:text-white'
          }`}
        >
          <span class="text-lg">{item.icon}</span>
          <span>{t(item.labelKey, $languageStore)}</span>
          {#if currentPage === item.id}
            <span class="ml-auto text-sm">●</span>
          {/if}
        </button>
      {/each}
    </nav>
  </div>

  <!-- Footer Actions -->
  <div class="p-4 border-t border-green-700 space-y-2 flex-shrink-0">
    <button
      type="button"
      on:click={() => navigate('profile')}
      class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-green-100 hover:bg-green-700/50 rounded-lg transition"
    >
      <span>👤</span>
      <span>{t('sidebar.viewProfile', $languageStore)}</span>
    </button>
    <button
      type="button"
      on:click={handleLogout}
      class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-semibold shadow"
    >
      <span>🚪</span>
      <span>{t('sidebar.logout', $languageStore)}</span>
    </button>
  </div>
</aside>

<!-- Overlay for mobile -->
{#if isOpen}
  <button
    type="button"
    class="fixed inset-0 bg-black/50 z-30 md:hidden border-0 cursor-default"
    on:click={() => (isOpen = false)}
    aria-label="Close navigation overlay"
  ></button>
{/if}
