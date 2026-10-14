import axios from 'axios'
import { API_BASE } from '../../lib/api'

const client = axios.create({ baseURL: `${API_BASE}/admin` })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('hotelTransylvaniaToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || (error.response?.status === 403 && error.response?.data?.message === 'Account disabled')) {
      window.dispatchEvent(new CustomEvent('moonstoria:auth-expired'))
    }
    return Promise.reject(error)
  },
)

export const adminApi = {
  get: (path, config) => client.get(path, config),
  post: (path, data, config) => client.post(path, data, config),
  put: (path, data, config) => client.put(path, data, config),
  patch: (path, data, config) => client.patch(path, data, config),
  delete: (path, config) => client.delete(path, config),
}

export function getAdminErrorMessage(error, fallback = 'The castle could not complete your request.') {
  if (error.response?.status === 403) return error.response.data?.message || 'Administrator access is required.'
  if (error.response?.status === 401) return error.response.data?.message || 'Please sign in to continue.'
  return error.response?.data?.message || fallback
}
