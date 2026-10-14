export default function StatusBadge({ status }) {
  const value = String(status || 'unknown')
  return <span className={`admin-status-badge admin-status-${value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{value.replace(/([a-z])([A-Z])/g, '$1 $2')}</span>
}
