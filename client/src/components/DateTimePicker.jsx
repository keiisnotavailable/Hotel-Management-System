import { CalendarDays, Clock3 } from 'lucide-react'
import { timezoneLabel } from '../lib/date'

function splitValue(value) {
  if (!value) return { date: '', time: '' }
  const [date = '', time = ''] = value.split('T')
  return { date, time: time.slice(0, 5) }
}

function formatDate(date) {
  if (!date) return 'Choose date'
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

function formatTime(time) {
  if (!time) return 'Choose time'
  const [hours, minutes] = time.split(':').map(Number)
  const formatted = new Date(2000, 0, 1, hours, minutes)
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(formatted)
}

function openPicker(event) {
  if (typeof event.currentTarget.showPicker === 'function') event.currentTarget.showPicker()
}

export default function DateTimePicker({ label, value, onChange, min, id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), variant = 'default' }) {
  const parts = splitValue(value)

  function update(part, nextValue) {
    const next = { ...parts, [part]: nextValue }
    onChange(next.date && next.time ? `${next.date}T${next.time}` : '')
  }

  if (variant !== 'booking') {
    return (
      <label className="block text-xs">
        <span className="flex items-center justify-between uppercase tracking-widest text-ink/60">{label}<span className="normal-case tracking-normal">{timezoneLabel()}</span></span>
        <span className="relative mt-1 block">
          <input className="w-full border border-ink/20 bg-white/60 px-3 py-3 pr-9 text-xs outline-none focus:border-crimson" type="datetime-local" value={value} min={min} onChange={(event) => onChange(event.target.value)} />
          <Clock3 size={14} className="pointer-events-none absolute right-3 top-3 text-ink/50" />
        </span>
      </label>
    )
  }

  return (
    <div className="booking-datetime">
      <div className="booking-datetime-heading">
        <span>{label}</span>
        <span className="booking-timezone">{timezoneLabel()}</span>
      </div>
      <div className="booking-datetime-values">
        <label className="booking-datetime-field" htmlFor={`${id}-date`}>
          <CalendarDays size={16} aria-hidden="true" />
          <span>{formatDate(parts.date)}</span>
          <input id={`${id}-date`} type="date" value={parts.date} min={min} aria-label={`${label} date`} onChange={(event) => update('date', event.target.value)} onClick={openPicker} />
        </label>
        <label className="booking-datetime-field" htmlFor={`${id}-time`}>
          <Clock3 size={16} aria-hidden="true" />
          <span>{formatTime(parts.time)}</span>
          <input id={`${id}-time`} type="time" value={parts.time} aria-label={`${label} time`} onChange={(event) => update('time', event.target.value)} onClick={openPicker} />
        </label>
      </div>
    </div>
  )
}
