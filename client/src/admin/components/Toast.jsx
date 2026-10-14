export default function Toast({ message, type = 'success', onClose }) {
  if (!message) return null
  return <div className={`admin-toast admin-toast-${type}`} role={type === 'error' ? 'alert' : 'status'}>
    <span>{message}</span>{onClose && <button type="button" onClick={onClose} aria-label="Dismiss notification">×</button>}
  </div>
}
