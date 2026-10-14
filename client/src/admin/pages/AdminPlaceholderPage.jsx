export default function AdminPlaceholderPage({ title, subtitle }) {
  return <section className="admin-page">
    <p className="admin-kicker">Moonstoria Administration</p>
    <h1>{title}</h1>
    <p className="admin-page-subtitle">{subtitle}</p>
  </section>
}
