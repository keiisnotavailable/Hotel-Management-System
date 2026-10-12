export const DEFAULT_CHECKIN_TIME = '18:00'
export const DEFAULT_CHECKOUT_TIME = '06:00'
export const MIN_STAY_HOURS = 6

export function toIso(date, time) {
  if (!date || !time) return ''
  return new Date(`${date}T${time}:00`).toISOString()
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function timezoneLabel() {
  const offset = -new Date().getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const hours = Math.floor(Math.abs(offset) / 60)
  const minutes = Math.abs(offset) % 60
  return `GMT${sign}${hours}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`
}

export function defaultLocalDateTime(daysFromNow, time) {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  const [hours, minutes] = time.split(':')
  date.setHours(Number(hours), Number(minutes), 0, 0)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function validateDateRange(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 'Choose both check-in and check-out times.'
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Choose valid dates and times.'
  if (start <= new Date()) return 'Check-in must be in the future.'
  if (end <= start) return 'Check-out must be after check-in.'
  if ((end - start) / 3600000 < MIN_STAY_HOURS) return `Stays must be at least ${MIN_STAY_HOURS} hours.`
  return ''
}
