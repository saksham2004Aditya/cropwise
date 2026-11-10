import express from 'express'
import session from 'express-session'
import axios from 'axios'
import cors from 'cors'
import dotenv from 'dotenv'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { loadUsers, saveUsers, hashPassword, verifyPassword, getUserByUsername, createUser, updateUser } from './userStorage.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

const app = express()

// Template engine setup for legacy and direct views
app.set('view engine', 'ejs')
app.set('views', join(__dirname, 'views'))

// Load users from persistent storage
let users = loadUsers()

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true
}))
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'irrigation_secret',
    resave: false,
    saveUninitialized: true,
  })
)

// ===================== DATA HELPERS =====================

// Crop data with water requirements
const cropData = {
  Tomato: { baseReq: 450, efficiency: 85, season: 'Summer', duration: '60-70 days' },
  Rice: { baseReq: 600, efficiency: 75, season: 'Monsoon', duration: '120-150 days' },
  Wheat: { baseReq: 350, efficiency: 80, season: 'Winter', duration: '120-140 days' },
  Corn: { baseReq: 550, efficiency: 82, season: 'Summer', duration: '100-120 days' },
  Sugarcane: { baseReq: 800, efficiency: 70, season: 'Year-round', duration: '12 months' },
  Cotton: { baseReq: 500, efficiency: 78, season: 'Summer', duration: '160-180 days' },
  Potato: { baseReq: 400, efficiency: 83, season: 'Winter', duration: '70-90 days' },
  Onion: { baseReq: 380, efficiency: 81, season: 'Winter', duration: '120-150 days' },
}

function getWaterRequirement(crop) {
  return cropData[crop] || { baseReq: 450, efficiency: 80, season: 'Mixed', duration: '90-120 days' }
}

// Known Indian and global farming hubs for instant, zero-latency matching
const KNOWN_LOCATIONS = {
  'delhi': { lat: 28.6139, lon: 77.2090, name: 'Delhi, India' },
  'new delhi': { lat: 28.6139, lon: 77.2090, name: 'New Delhi, India' },
  'mumbai': { lat: 19.0760, lon: 72.8777, name: 'Mumbai, Maharashtra' },
  'nashik': { lat: 19.9975, lon: 73.7898, name: 'Nashik, Maharashtra' },
  'nashik, maharashtra': { lat: 19.9975, lon: 73.7898, name: 'Nashik, Maharashtra' },
  'pune': { lat: 18.5204, lon: 73.8567, name: 'Pune, Maharashtra' },
  'nagpur': { lat: 21.1458, lon: 79.0882, name: 'Nagpur, Maharashtra' },
  'aurangabad': { lat: 19.8762, lon: 75.3433, name: 'Chhatrapati Sambhajinagar, Maharashtra' },
  'solapur': { lat: 17.6599, lon: 75.9064, name: 'Solapur, Maharashtra' },
  'kolhapur': { lat: 16.7050, lon: 74.2433, name: 'Kolhapur, Maharashtra' },
  'bengaluru': { lat: 12.9716, lon: 77.5946, name: 'Bengaluru, Karnataka' },
  'bangalore': { lat: 12.9716, lon: 77.5946, name: 'Bengaluru, Karnataka' },
  'mysuru': { lat: 12.2958, lon: 76.6394, name: 'Mysuru, Karnataka' },
  'hyderabad': { lat: 17.3850, lon: 78.4867, name: 'Hyderabad, Telangana' },
  'chennai': { lat: 13.0827, lon: 80.2707, name: 'Chennai, Tamil Nadu' },
  'coimbatore': { lat: 11.0168, lon: 76.9558, name: 'Coimbatore, Tamil Nadu' },
  'madurai': { lat: 9.9252, lon: 78.1198, name: 'Madurai, Tamil Nadu' },
  'kolkata': { lat: 22.5726, lon: 88.3639, name: 'Kolkata, West Bengal' },
  'malda': { lat: 25.0108, lon: 88.1411, name: 'Malda, West Bengal' },
  'raiganj': { lat: 25.6178, lon: 88.1256, name: 'Raiganj, West Bengal' },
  'siliguri': { lat: 26.7271, lon: 88.3953, name: 'Siliguri, West Bengal' },
  'ahmedabad': { lat: 23.0225, lon: 72.5714, name: 'Ahmedabad, Gujarat' },
  'surat': { lat: 21.1702, lon: 72.8311, name: 'Surat, Gujarat' },
  'rajkot': { lat: 22.3039, lon: 70.8022, name: 'Rajkot, Gujarat' },
  'jaipur': { lat: 26.9124, lon: 75.7873, name: 'Jaipur, Rajasthan' },
  'jodhpur': { lat: 26.2389, lon: 73.0243, name: 'Jodhpur, Rajasthan' },
  'lucknow': { lat: 26.8467, lon: 80.9462, name: 'Lucknow, Uttar Pradesh' },
  'kanpur': { lat: 26.4499, lon: 80.3319, name: 'Kanpur, Uttar Pradesh' },
  'varanasi': { lat: 25.3176, lon: 82.9739, name: 'Varanasi, Uttar Pradesh' },
  'agra': { lat: 27.1767, lon: 78.0081, name: 'Agra, Uttar Pradesh' },
  'patna': { lat: 25.5941, lon: 85.1376, name: 'Patna, Bihar' },
  'bhopal': { lat: 23.2599, lon: 77.4126, name: 'Bhopal, Madhya Pradesh' },
  'indore': { lat: 22.7196, lon: 75.8577, name: 'Indore, Madhya Pradesh' },
  'chandigarh': { lat: 30.7333, lon: 76.7794, name: 'Chandigarh, Punjab' },
  'ludhiana': { lat: 30.9010, lon: 75.8573, name: 'Ludhiana, Punjab' },
  'amritsar': { lat: 31.6340, lon: 74.8723, name: 'Amritsar, Punjab' },
  'punjab': { lat: 30.9010, lon: 75.8573, name: 'Punjab, India' },
  'haryana': { lat: 29.0588, lon: 76.0856, name: 'Haryana, India' },
  'karnal': { lat: 29.6857, lon: 76.9905, name: 'Karnal, Haryana' },
  'uttar pradesh': { lat: 26.8467, lon: 80.9462, name: 'Uttar Pradesh, India' },
  'rajasthan': { lat: 26.9124, lon: 75.7873, name: 'Rajasthan, India' },
  'gujarat': { lat: 23.0225, lon: 72.5714, name: 'Gujarat, India' },
  'maharashtra': { lat: 19.9975, lon: 73.7898, name: 'Maharashtra, India' },
  'bihar': { lat: 25.5941, lon: 85.1376, name: 'Bihar, India' },
  'west bengal': { lat: 22.5726, lon: 88.3639, name: 'West Bengal, India' },
  'karnataka': { lat: 12.9716, lon: 77.5946, name: 'Karnataka, India' },
  'tamil nadu': { lat: 13.0827, lon: 80.2707, name: 'Tamil Nadu, India' },
  'telangana': { lat: 17.3850, lon: 78.4867, name: 'Telangana, India' },
  'andhra pradesh': { lat: 16.5062, lon: 80.6480, name: 'Andhra Pradesh, India' },
  'kerala': { lat: 9.9312, lon: 76.2673, name: 'Kerala, India' },
  'odisha': { lat: 20.2961, lon: 85.8245, name: 'Odisha, India' },
  'assam': { lat: 26.1445, lon: 91.7362, name: 'Assam, India' },
  'india': { lat: 20.5937, lon: 78.9629, name: 'India' },
}

function mapWmoCode(code) {
  if (code === 0) return { description: 'Clear sky', icon: 'Clear' }
  if (code === 1) return { description: 'Mainly clear', icon: 'Clear' }
  if (code === 2) return { description: 'Partly cloudy', icon: 'Clouds' }
  if (code === 3) return { description: 'Overcast', icon: 'Clouds' }
  if ([45, 48].includes(code)) return { description: 'Foggy', icon: 'Mist' }
  if ([51, 53, 55].includes(code)) return { description: 'Drizzle', icon: 'Drizzle' }
  if ([56, 57].includes(code)) return { description: 'Freezing drizzle', icon: 'Drizzle' }
  if ([61, 63, 65].includes(code)) return { description: 'Rain showers', icon: 'Rain' }
  if ([66, 67].includes(code)) return { description: 'Freezing rain', icon: 'Rain' }
  if ([71, 73, 75, 77].includes(code)) return { description: 'Snow', icon: 'Snow' }
  if ([80, 81, 82].includes(code)) return { description: 'Rain showers', icon: 'Rain' }
  if ([85, 86].includes(code)) return { description: 'Snow showers', icon: 'Snow' }
  if ([95, 96, 99].includes(code)) return { description: 'Thunderstorm', icon: 'Thunderstorm' }
  return { description: 'Partly cloudy', icon: 'Clouds' }
}

function generateFallbackWeather(lat = 19.9975, lon = 73.7898) {
  const hour = new Date().getHours()
  const baseTemp = 28 + Math.round(Math.sin((hour - 6) / 12 * Math.PI) * 5)
  return {
    temp: baseTemp,
    temp_c: baseTemp,
    feelsLike: baseTemp + 2,
    humidity: 58,
    pressure: 1012,
    windSpeed: 12,
    wind_kph: 12,
    cloudiness: 20,
    description: 'Partly cloudy',
    condition: 'Partly cloudy',
    icon: 'Clouds',
    rainfall: 0,
    rain_probability: 0.15,
    is_raining: false,
    uv_index: 7,
    weather_severity: 0,
    offline: true,
    source: 'simulation',
  }
}

// Fetch weather data with multi-tier fallback (OpenWeatherMap -> Open-Meteo -> Local simulation)
async function getWeatherData(lat, lon) {
  if (lat == null || lon == null) {
    return generateFallbackWeather()
  }

  // 1. Try OpenWeatherMap if valid API key is provided
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (apiKey && apiKey !== 'your_openweathermap_api_key_here') {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`,
        { timeout: 4000 }
      )
      const data = response.data
      return {
        temp: Math.round(data.main.temp),
        temp_c: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
        wind_kph: Math.round(data.wind.speed * 3.6),
        cloudiness: data.clouds?.all ?? 0,
        description: data.weather[0]?.description ?? 'Clear sky',
        condition: data.weather[0]?.description ?? 'Clear sky',
        icon: data.weather[0]?.main ?? 'Clear',
        rainfall: data.rain ? (data.rain['1h'] || 0) : 0,
        rain_probability: Math.max(0, Math.min(1, ((data.clouds?.all || 0) / 120) + (data.rain ? 0.25 : 0))),
        is_raining: Boolean(data.rain && data.rain['1h'] > 0) || /rain|drizzle|storm/i.test(data.weather[0]?.description || ''),
        uv_index: Math.max(0, Math.min(11, Math.round(11 - (data.clouds?.all || 0) / 12 + (data.main.temp > 30 ? 1 : 0)))),
        weather_severity: /storm|extreme|thunder/i.test(data.weather[0]?.description || '')
          ? 1
          : /cloud|drizzle|rain|mist|haze/i.test(data.weather[0]?.description || '')
            ? 0.5
            : 0,
        offline: false,
        source: 'openweathermap',
      }
    } catch (err) {
      console.warn('OpenWeatherMap API unavailable, trying Open-Meteo:', err.message)
    }
  }

  // 2. Try Open-Meteo (100% free worldwide, no key needed, real-time)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,surface_pressure,wind_speed_10m&timezone=auto`
    const res = await axios.get(url, { timeout: 5000 })
    const cur = res.data?.current
    if (cur) {
      const meta = mapWmoCode(cur.weather_code)
      const rainAmount = cur.rain ?? cur.precipitation ?? 0
      const isRaining = rainAmount > 0 || ['Rain', 'Drizzle', 'Thunderstorm'].includes(meta.icon)
      return {
        temp: Math.round(cur.temperature_2m),
        temp_c: Math.round(cur.temperature_2m),
        feelsLike: Math.round(cur.apparent_temperature ?? cur.temperature_2m),
        humidity: Math.round(cur.relative_humidity_2m),
        pressure: Math.round(cur.surface_pressure ?? 1013),
        windSpeed: Math.round(cur.wind_speed_10m),
        wind_kph: Math.round(cur.wind_speed_10m),
        cloudiness: Math.round(cur.cloud_cover ?? 0),
        description: meta.description,
        condition: meta.description,
        icon: meta.icon,
        rainfall: rainAmount,
        rain_probability: Math.max(0, Math.min(1, ((cur.cloud_cover || 0) / 120) + (rainAmount > 0 ? 0.35 : 0))),
        is_raining: isRaining,
        uv_index: 7,
        weather_severity: meta.icon === 'Thunderstorm' ? 1 : isRaining ? 0.5 : 0,
        offline: false,
        source: 'open-meteo',
      }
    }
  } catch (err) {
    console.warn('Open-Meteo API error, using simulated weather fallback:', err.message)
  }

  // 3. Fallback simulated data if network is unreachable
  return generateFallbackWeather(lat, lon)
}

// Get coordinates for a location (with dictionary, OpenWeather, Open-Meteo geocoding & fallback)
async function getCoordinates(location) {
  if (!location || typeof location !== 'string') {
    return { lat: 19.9975, lon: 73.7898, name: 'Nashik, Maharashtra' }
  }

  const cleanQuery = location.trim()
  const lowerQuery = cleanQuery.toLowerCase()

  // 1. Check known locations dictionary
  for (const [key, value] of Object.entries(KNOWN_LOCATIONS)) {
    if (lowerQuery === key || lowerQuery.startsWith(key + ',') || lowerQuery.startsWith(key + ' ') || (key.length > 3 && lowerQuery.includes(key))) {
      return { lat: value.lat, lon: value.lon, name: value.name }
    }
  }

  // 2. Try OpenWeatherMap Geocoding if API key is present
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (apiKey && apiKey !== 'your_openweathermap_api_key_here') {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cleanQuery)}&limit=1&appid=${apiKey}`,
        { timeout: 3500 }
      )
      if (response.data && response.data.length > 0) {
        const { lat, lon, name, country, state } = response.data[0]
        const fullName = [name, state, country].filter(Boolean).join(', ')
        return { lat, lon, name: fullName || cleanQuery }
      }
    } catch (err) {
      console.warn('OpenWeatherMap Geocoding error, falling back:', err.message)
    }
  }

  // 3. Try free Open-Meteo Geocoding
  try {
    const geoRes = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=5&language=en&format=json`,
      { timeout: 4500 }
    )
    if (geoRes.data?.results && geoRes.data.results.length > 0) {
      const results = geoRes.data.results
      // Prioritize Indian results if matched
      const best = results.find(r => r.country_code === 'IN') || results[0]
      const fullName = [best.name, best.admin1, best.country].filter(Boolean).join(', ')
      return {
        lat: best.latitude,
        lon: best.longitude,
        name: fullName || best.name || cleanQuery,
      }
    }
  } catch (err) {
    console.warn('Open-Meteo Geocoding error:', err.message)
  }

  // 4. Fallback coordinates (Nashik agricultural district)
  return { lat: 19.9975, lon: 73.7898, name: cleanQuery }
}

function buildWeatherResponse(location, coords, weather, offline = false) {
  const temp_c = weather.temp_c ?? weather.temp ?? 30
  const humidity = weather.humidity ?? 60
  const wind_kph = weather.wind_kph ?? weather.windSpeed ?? 12
  const rain_probability = weather.rain_probability ?? 0.15
  const condition = weather.condition ?? weather.description ?? 'Partly cloudy'

  return {
    location,
    lat: coords?.lat ?? null,
    lon: coords?.lon ?? null,
    temp_c,
    temp: temp_c,
    humidity,
    rain_probability,
    wind_kph,
    windSpeed: wind_kph,
    condition,
    description: condition,
    is_raining: weather.is_raining ?? /rain|drizzle|storm/i.test(condition),
    uv_index: weather.uv_index ?? 7,
    weather_severity: weather.weather_severity ?? (/storm|extreme|thunder/i.test(condition) ? 1 : /cloud|drizzle|rain|mist|haze/i.test(condition) ? 0.5 : 0),
    offline: offline || Boolean(weather.offline),
    source: weather.source || (offline ? 'cached' : 'live'),
    ...weather,
  }
}

function runCropStageInference(imageBase64, cropType) {
  return new Promise((resolve, reject) => {
    const scriptPath = join(__dirname, 'python_sim', 'crop_stage_inference.py')
    const pythonCommand = process.env.PYTHON_PATH || 'python'

    const pythonProcess = spawn(pythonCommand, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`))
    })

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Crop stage inference failed with code ${code}`))
        return
      }

      try {
        const parsed = JSON.parse(stdout)
        resolve(parsed)
      } catch (error) {
        reject(new Error(`Invalid response from inference script: ${error.message}`))
      }
    })

    const payload = {
      cropType,
      imageBase64,
      modelPath: process.env.CROP_STAGE_MODEL_PATH || '',
    }

    pythonProcess.stdin.write(JSON.stringify(payload))
    pythonProcess.stdin.end()
  })
}

async function identifyCropWithGemini(imageBase64) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Gemini crop identification is not configured. Add GEMINI_API_KEY to .env.')
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-3-flash-preview'}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      contents: [{
        parts: [
          {
            text: 'Identify the plant, crop, flower, or tree in this image using your own visual knowledge. Do not restrict the answer to a predefined list. Respond only as JSON in this format: {"crop":"Hibiscus","confidence":0.95}. Use "Unknown" only when the image is genuinely too unclear to identify, and give it a confidence below 0.5.',
          },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageBase64,
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    },
    { timeout: 30000 }
  )

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini returned no crop identification result.')
  }

  let parsed
  try {
    parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim())
  } catch {
    throw new Error('Gemini returned an invalid crop identification response.')
  }

  const crop = typeof parsed.crop === 'string' ? parsed.crop : 'Unknown'
  const confidence = Number(parsed.confidence)
  return {
    crop,
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
    source: 'Google Gemini',
  }
}

// Generate irrigation recommendations based on weather and soil data
function generateIrrigationRecommendations(weather = {}, crop = 'Tomato') {
  const req = getWaterRequirement(crop)
  const recommendations = []

  const temp = weather.temp ?? weather.temperature ?? 30
  const humidity = weather.humidity ?? 60
  const rainfall = weather.rainfall ?? 0
  const cloudiness = weather.cloudiness ?? 20
  const moisture = weather.moisture

  if (moisture !== undefined && moisture < 30) {
    recommendations.push(`Low soil moisture (${moisture}%) - initiate drip irrigation immediately for ${crop}`)
  } else if (moisture !== undefined && moisture > 60) {
    recommendations.push(`High soil moisture (${moisture}%) - pause irrigation to avoid root hypoxia`)
  }

  if (humidity < 40) {
    recommendations.push(`Low humidity (${humidity}%) - increase irrigation cycle duration to offset high evapotranspiration`)
  }
  if (rainfall > 0) {
    recommendations.push(`Rainfall detected (${rainfall}mm) - reduce or postpone upcoming scheduled irrigation`)
  }
  if (temp > 35) {
    recommendations.push(`High ambient temperature (${temp}°C) - schedule morning/evening irrigation to prevent heat stress`)
  }
  if (cloudiness > 60) {
    recommendations.push(`Overcast skies (${cloudiness}% cover) - solar radiation is lower; conserve water`)
  }

  return recommendations.length > 0 
    ? recommendations 
    : [`✓ Current weather and soil conditions are optimal for ${crop} growth`]
}

// ===================== LEGACY EJS & FORM ROUTES =====================

app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard')
  }
  res.render('login', { error: null })
})

app.post('/login', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.render('login', { error: 'Please enter username and password' })
  }

  // Registered user lookup
  const user = getUserByUsername(username, users)
  if (user && verifyPassword(password, user.passwordHash)) {
    req.session.user = {
      username: user.username,
      name: user.name,
      farmSize: user.farmSize,
      crop: user.crop,
      soilType: user.soilType || 'Loamy',
      location: user.location,
      lat: user.lat,
      lon: user.lon,
    }
    return res.redirect('/dashboard')
  }

  // Demo user fallback
  if (username === 'demo' && password === 'demo123') {
    req.session.user = {
      username: 'demo',
      name: 'Farmer Ram',
      farmSize: '1.5 Acre',
      crop: 'Tomato',
      soilType: 'Loamy',
      location: 'Nashik, Maharashtra',
      lat: 19.9975,
      lon: 73.7898,
    }
    return res.redirect('/dashboard')
  }

  res.render('login', { error: 'Invalid username or password' })
})

app.get('/signup', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard')
  }
  res.render('signup', { error: null, success: null })
})

app.post('/signup', (req, res) => {
  const { username, name, farmSize, crop, password, confirmPassword, location } = req.body

  if (!username || !name || !farmSize || !crop || !password || !confirmPassword) {
    return res.render('signup', { error: 'All fields are required', success: null })
  }

  if (password !== confirmPassword) {
    return res.render('signup', { error: 'Passwords do not match', success: null })
  }

  if (password.length < 6) {
    return res.render('signup', { error: 'Password must be at least 6 characters', success: null })
  }

  if (getUserByUsername(username, users)) {
    return res.render('signup', { error: 'Username already exists', success: null })
  }

  const newUser = {
    username,
    name,
    farmSize,
    crop,
    soilType: 'Loamy',
    location: location || 'India',
    passwordHash: hashPassword(password),
    lat: null,
    lon: null,
  }

  if (createUser(username, newUser, users)) {
    users = loadUsers()
    return res.render('signup', { error: null, success: 'Account created successfully! Please login.' })
  } else {
    return res.render('signup', { error: 'Failed to create account. Please try again.', success: null })
  }
})

app.get('/dashboard', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login')
  }

  const user = req.session.user
  const waterReq = getWaterRequirement(user.crop)

  // Fetch real weather data
  let weatherData = null
  let coords = null
  try {
    coords = (user.lat && user.lon)
      ? { lat: user.lat, lon: user.lon, name: user.location }
      : await getCoordinates(user.location || 'Nashik, Maharashtra')
    
    if (coords) {
      weatherData = await getWeatherData(coords.lat, coords.lon)
      user.lat = coords.lat
      user.lon = coords.lon
    }
  } catch (err) {
    console.warn('Dashboard weather error:', err.message)
  }

  if (!weatherData) {
    weatherData = generateFallbackWeather(user.lat, user.lon)
  }

  const sensorData = {
    moisture: 28,
    temperature: weatherData.temp ?? 30,
    humidity: weatherData.humidity ?? 60,
    rainfall: weatherData.rainfall ?? 0,
  }

  const recs = generateIrrigationRecommendations({ ...sensorData, ...weatherData, moisture: sensorData.moisture }, user.crop)

  const data = {
    moisture: sensorData.moisture,
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    rainfall: sensorData.rainfall,
    cropWaterReq: waterReq.baseReq,
    actualWaterUsed: Math.round(waterReq.baseReq * 0.85),
    waterDeficit: Math.round(waterReq.baseReq * 0.15),
    efficiencyScore: waterReq.efficiency,
    irrigationStatus: 'Active',
    currentZone: 'Zone 2',
    timeRemaining: '12 minutes',
    nextSchedule: 'Tomorrow 6:00 AM',
    weeklyMoisture: [35, 28, 32, 25, 28, 30, 28],
    weeklyTemp: [weatherData.temp - 2, weatherData.temp - 1, weatherData.temp + 1, weatherData.temp, weatherData.temp + 2, weatherData.temp - 1, weatherData.temp],
    weeklyWaterUsage: [420, 380, 450, 390, 380, 410, 380],
    weeklyDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    recommendation: recs[0],
    recommendations: recs,
    weather: { ...weatherData, location: coords?.name || user.location },
  }

  res.render('dashboard', { user, data })
})

app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login')
  }
  res.render('profile', { user: req.session.user, error: null, success: null })
})

app.post('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login')
  }

  const { name, farmSize, crop, soilType, location } = req.body
  const username = req.session.user.username

  const updates = {}
  if (name) updates.name = name
  if (farmSize) updates.farmSize = farmSize
  if (crop) updates.crop = crop
  if (soilType) updates.soilType = soilType
  if (location) updates.location = location

  if (updateUser(username, updates, users)) {
    users = loadUsers()
    req.session.user = { ...req.session.user, ...updates }
    return res.render('profile', { user: req.session.user, error: null, success: 'Profile updated successfully!' })
  } else {
    // Demo user update in session
    req.session.user = { ...req.session.user, ...updates }
    return res.render('profile', { user: req.session.user, error: null, success: 'Profile updated in session!' })
  }
})

app.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/login')
})

// ===================== REST AUTH API ROUTES =====================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  const user = getUserByUsername(username, users)

  // Check registered user
  if (user && verifyPassword(password, user.passwordHash)) {
    req.session.user = {
      username: user.username,
      name: user.name,
      farmSize: user.farmSize,
      crop: user.crop,
      soilType: user.soilType || 'Loamy',
      location: user.location,
      lat: user.lat,
      lon: user.lon,
    }
    return res.json({ success: true, user: req.session.user })
  }

  // Demo account fallback
  if (username === 'demo' && password === 'demo123') {
    req.session.user = {
      username: 'demo',
      name: 'Farmer Ram',
      farmSize: '1.5 Acre',
      crop: 'Tomato',
      soilType: 'Loamy',
      location: 'Nashik, Maharashtra',
      lat: 19.9975,
      lon: 73.7898,
    }
    return res.json({ success: true, user: req.session.user })
  }

  res.status(401).json({ error: 'Invalid credentials' })
})

app.post('/api/auth/signup', (req, res) => {
  const { username, name, farmSize, crop, password, confirmPassword, location } = req.body

  if (!username || !name || !farmSize || !crop || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  if (getUserByUsername(username, users)) {
    return res.status(400).json({ error: 'Username already exists' })
  }

  // Create new user with hashed password
  const newUser = {
    username,
    name,
    farmSize,
    crop,
    soilType: 'Loamy',
    location: location || 'India',
    passwordHash: hashPassword(password),
    lat: null,
    lon: null,
  }

  if (createUser(username, newUser, users)) {
    users = loadUsers()
    return res.json({ success: true, message: 'Account created! Please login.' })
  } else {
    return res.status(500).json({ error: 'Failed to create account' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy()
  res.json({ success: true })
})

app.get('/api/auth/user', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  res.json(req.session.user)
})

// Update user profile
app.post('/api/auth/update-profile', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const { name, farmSize, crop, soilType, location } = req.body
  const username = req.session.user.username

  const updates = {}
  if (name) updates.name = name
  if (farmSize) updates.farmSize = farmSize
  if (crop) updates.crop = crop
  if (soilType) updates.soilType = soilType
  if (location) updates.location = location

  if (updateUser(username, updates, users)) {
    users = loadUsers()
    req.session.user = { ...req.session.user, ...updates }
    return res.json({ success: true, user: req.session.user })
  } else {
    // If demo account, update session directly
    req.session.user = { ...req.session.user, ...updates }
    return res.json({ success: true, user: req.session.user })
  }
})

// ===================== DASHBOARD & WEATHER API ROUTES =====================

app.get('/api/dashboard/data', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const user = req.session.user
  const waterReq = getWaterRequirement(user.crop)

  // Get real weather data
  let weatherData = null
  let coords = null
  try {
    coords = (user.lat && user.lon)
      ? { lat: user.lat, lon: user.lon, name: user.location }
      : await getCoordinates(user.location || 'Nashik, Maharashtra')
    
    if (coords) {
      weatherData = await getWeatherData(coords.lat, coords.lon)
      user.lat = coords.lat
      user.lon = coords.lon
    }
  } catch (err) {
    console.warn('Dashboard weather fetch error, using fallback:', err.message)
  }

  if (!weatherData) {
    weatherData = generateFallbackWeather(user.lat, user.lon)
  }

  // Sensor data
  const sensorData = {
    moisture: 28,
    temperature: weatherData.temp ?? 30,
    humidity: weatherData.humidity ?? 60,
    rainfall: weatherData.rainfall ?? 0,
  }

  const recommendations = generateIrrigationRecommendations({ ...sensorData, ...weatherData, moisture: sensorData.moisture }, user.crop)

  const data = {
    weather: { ...weatherData, location: coords?.name || user.location },
    sensors: sensorData,
    crop: {
      name: user.crop,
      ...waterReq,
    },
    water: {
      requirement: waterReq.baseReq,
      actual: Math.round(waterReq.baseReq * 0.85),
      deficit: Math.round(waterReq.baseReq * 0.15),
      efficiency: waterReq.efficiency,
    },
    irrigation: {
      status: 'Active',
      currentZone: 'Zone 2',
      timeRemaining: '12 minutes',
      nextSchedule: 'Tomorrow 6:00 AM',
    },
    weekly: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      moisture: [35, 28, 32, 25, 28, 30, 28],
      temperature: [weatherData.temp - 2, weatherData.temp - 1, weatherData.temp + 1, weatherData.temp, weatherData.temp + 2, weatherData.temp - 1, weatherData.temp],
      waterUsage: [420, 380, 450, 390, 380, 410, 380],
    },
    recommendations,
  }

  res.json(data)
})

app.get('/api/weather/:location', async (req, res) => {
  try {
    const { location } = req.params
    const coords = await getCoordinates(location)
    const weatherData = await getWeatherData(coords.lat, coords.lon)
    res.json({
      location: coords.name || location,
      lat: coords.lat,
      lon: coords.lon,
      weather: weatherData,
    })
  } catch (error) {
    console.error('Error in /api/weather/:location:', error.message)
    const fallback = generateFallbackWeather()
    res.json({
      location: req.params.location,
      lat: 19.9975,
      lon: 73.7898,
      weather: fallback,
    })
  }
})

app.get('/weather', async (req, res) => {
  try {
    const location = req.query.location || req.session.user?.location || 'Nashik, Maharashtra'
    const hasSessionCoords = req.session.user?.lat != null && req.session.user?.lon != null
    const coords = hasSessionCoords
      ? { lat: req.session.user.lat, lon: req.session.user.lon, name: location }
      : await getCoordinates(location)

    const weatherData = await getWeatherData(coords.lat, coords.lon)
    const payload = buildWeatherResponse(coords.name || location, coords, weatherData, Boolean(weatherData.offline))
    req.session.lastWeather = payload
    res.json(payload)
  } catch (error) {
    console.error('Error in /weather:', error.message)
    const fallback = generateFallbackWeather()
    res.json(buildWeatherResponse(req.query.location || 'Nashik, Maharashtra', null, fallback, true))
  }
})

app.get('/simulation', (req, res) => {
  res.sendFile(join(__dirname, 'sirmf_ml.html'))
})

app.get('/impl1', (req, res) => {
  res.sendFile(join(__dirname, 'impl1.html'))
})

app.post('/api/crop-stage/predict', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const { imageBase64, cropType: requestedCrop } = req.body
  const cropType = requestedCrop || req.session.user.crop || 'Tomato'

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'imageBase64 is required' })
  }

  try {
    const result = await runCropStageInference(imageBase64, cropType)
    res.json(result)
  } catch (error) {
    console.error('Crop stage prediction error:', error)
    res.status(500).json({ error: error.message || 'Crop stage prediction failed' })
  }
})

app.post('/api/crop/identify', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const { imageBase64 } = req.body
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'imageBase64 is required' })
  }

  try {
    const result = await identifyCropWithGemini(imageBase64)
    res.json(result)
  } catch (error) {
    console.error('Crop identification error:', error.message)
    const status = error.response?.status === 401 || error.response?.status === 403 ? 502 : 500
    res.status(status).json({ error: error.message || 'Crop identification failed' })
  }
})

// ===================== STATIC FILES & SERVER =====================

// Serve static files from public and dist
app.use(express.static('public'))
app.use(express.static('dist'))

// SPA fallback - serve index.html for all non-handled routes
app.get('*', (req, res) => {
  const distIndex = join(__dirname, 'dist', 'index.html')
  if (existsSync(distIndex)) {
    return res.sendFile(distIndex)
  }
  res.status(200).send(`
    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
      <h2>🌾 CropWise Backend</h2>
      <p>Backend API is active and listening on port 3000.</p>
      <p>Frontend dev server is running on <a href="http://localhost:5173">http://localhost:5173</a></p>
      <p>Or open <a href="/login">CropWise Web Login</a></p>
    </div>
  `)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
  console.log(`🌾 CropWise - Smart Farming & Irrigation System`)
  console.log(`📡 Demo account: username=demo, password=demo123`)
})
