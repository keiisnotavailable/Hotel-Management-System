import axios from 'axios'

const configuredApiUrl = import.meta.env.VITE_API_URL
const apiOrigin = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:5000' : '')
export const API_BASE = apiOrigin
  ? `${apiOrigin.replace(/\/+$/, '').replace(/\/api$/i, '')}/api`
  : '/api'

export function getUploadedAssetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return path.startsWith('/uploads/')
    ? new URL(path, new URL(API_BASE, window.location.origin)).toString()
    : path
}

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
