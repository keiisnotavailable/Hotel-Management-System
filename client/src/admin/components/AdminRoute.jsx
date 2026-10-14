import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />
  if (!isAdmin) {
    return <main className="admin-forbidden">
      <section className="admin-forbidden-card">
        <p className="admin-kicker">A Ward at the Castle Gate</p>
        <h1>403 · Forbidden</h1>
        <p>This passage is reserved for Moonstoria administrators.</p>
        <Link to="/" className="admin-primary-link">Return to the castle</Link>
      </section>
    </main>
  }
  return children || <Outlet />
}
