<script>
  import { onMount } from 'svelte'
  import { authStore, logout } from './authStore'
  import Login from './Login.svelte'
  import Signup from './Signup.svelte'
  import Dashboard from './Dashboard.svelte'
  import IrrigationReport from './IrrigationReport.svelte'
  import Profile from './Profile.svelte'
  import Weather from './Weather.svelte'
  import FarmInfo from './FarmInfo.svelte'
  import CropStageDetection from './CropStageDetection.svelte'
  import SoilCheck from './SoilCheck.svelte'
  import Settings from './Settings.svelte'
  import Sidebar from './Sidebar.svelte'
  import { languageStore, t } from './i18nStore'

  let currentPage = 'login'

  onMount(() => {
    authStore.set({
      user: null,
      isAuthenticated: false,
      loading: false,
    })

    const handleHashChange = () => {
      if ($authStore.isAuthenticated) {
        const hash = window.location.hash.replace('#', '').trim()
        const validPages = ['dashboard', 'weather', 'irrigation', 'crop-stage', 'soil-check', 'farm', 'profile', 'settings']
        if (validPages.includes(hash)) {
          currentPage = hash
        }
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  })

  function handleNavigation(event) {
    const page = event.detail
    if (page === 'logout') {
      logout()
      currentPage = 'login'
      window.location.hash = ''
    } else {
      currentPage = page
      window.location.hash = page
    }
  }

  $: if ($authStore.loading) {
    currentPage = 'loading'
  }
</script>

<svelte:window />

{#if $authStore.loading}
  <div class="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
    <div class="text-center">
      <div class="mb-4 text-5xl animate-bounce">🌾</div>
      <h2 class="text-2xl font-bold text-gray-700 mb-2">{t('app.title', $languageStore)}</h2>
      <p class="text-gray-500">{t('app.loading', $languageStore)}</p>
    </div>
  </div>
{:else if !$authStore.isAuthenticated}
  {#if currentPage === 'login'}
    <Login on:navigate={handleNavigation} />
  {:else if currentPage === 'signup'}
    <Signup on:navigate={handleNavigation} />
  {/if}
{:else}
  <div class="flex h-screen bg-white overflow-hidden">
    <Sidebar currentPage={currentPage} on:navigate={handleNavigation} />
    <main class="flex-1 overflow-auto bg-white min-w-0">
      {#if currentPage === 'dashboard'}
        <Dashboard on:navigate={handleNavigation} />
      {:else if currentPage === 'profile'}
        <Profile on:navigate={handleNavigation} />
      {:else if currentPage === 'weather'}
        <Weather on:navigate={handleNavigation} />
      {:else if currentPage === 'irrigation'}
        <IrrigationReport />
      {:else if currentPage === 'crop-stage'}
        <CropStageDetection />
      {:else if currentPage === 'soil-check'}
        <SoilCheck />
      {:else if currentPage === 'farm'}
        <FarmInfo />
      {:else if currentPage === 'settings'}
        <Settings />
      {/if}
    </main>
  </div>
{/if}

<style global>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
