import axios from 'axios'

const DEFAULT_API_BASE_URL = 'http://localhost:5000/api'
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, '')
export const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  (API_BASE_URL.startsWith('http') ? API_BASE_URL.replace(/\/api$/, '') : '')
).replace(/\/$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor: handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
