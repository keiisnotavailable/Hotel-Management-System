export default function EmptyState({ title = 'Nothing here yet', description = 'There are no records to display.', children }) {
  return <div className="admin-empty-state"><span aria-hidden="true">☾</span><h2>{title}</h2><p>{description}</p>{children}</div>
}
