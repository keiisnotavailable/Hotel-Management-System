import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export function authConfig() {
  const token = localStorage.getItem('hotelTransylvaniaToken')
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
}

export function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback
}
