import { writable } from 'svelte/store'

export const weatherStore = writable({
  data: null,
  loading: false,
  error: '',
  lastUpdated: null,
  location: null,
})

export async function fetchWeatherData(location) {
  const targetLocation = (location && typeof location === 'string' && location.trim()) 
    ? location.trim() 
    : 'Nashik, Maharashtra'

  weatherStore.update(state => ({
    ...state,
    loading: true,
    error: '',
  }))

  try {
    const response = await fetch(`/api/weather/${encodeURIComponent(targetLocation)}`)
    
    if (!response.ok) {
      const errJson = await response.json().catch(() => null)
      throw new Error(errJson?.error || 'Failed to fetch weather data')
    }

    const data = await response.json()
    const now = new Date()
    const weatherData = data.weather || data

    weatherStore.update(state => ({
      ...state,
      data: weatherData,
      location: data.location || targetLocation,
      lastUpdated: now.toLocaleString('en-IN'),
      loading: false,
      error: '',
    }))

    return weatherData
  } catch (error) {
    console.error('Weather fetch error:', error)
    weatherStore.update(state => ({
      ...state,
      error: error.message || 'Failed to fetch weather data',
      loading: false,
    }))
    return null
  }
}
