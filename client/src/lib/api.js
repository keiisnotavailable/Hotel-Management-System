import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export function authConfig() {
  const token = localStorage.getItem('hotelTransylvaniaToken')
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
}

export function getErrorMessage(error, fallback) {
  if (error.response?.data?.message) return error.response.data.message
  if (error.code === 'ERR_NETWORK' || (error.request && !error.response)) {
    return 'Unable to reach the server. Make sure the backend is running, then try again.'
  }
  return fallback
}
