import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add session_id to all requests
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('sessionId')
  if (sessionId) {
    config.params = config.params || {}
    config.params.session_id = sessionId
  }
  return config
}, (error) => Promise.reject(error))

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sessionId')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
