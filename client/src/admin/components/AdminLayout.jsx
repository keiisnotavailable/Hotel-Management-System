import { useCallback, useEffect, useState } from 'react'
import { Menu, Moon } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Drawer from './Drawer'
import '../styles/admin.css'

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/rooms', label: 'Crypts' },
  { to: '/admin/users', label: 'Monsters' },
  { to: '/admin/reservations', label: 'Reservations' },
]

function SidebarLinks({ onNavigate, onSignOut }) {
  return <nav className="admin-sidebar-nav" aria-label="Admin navigation">
    {links.map(({ to, label, end }) => <NavLink key={to} to={to} end={end} onClick={onNavigate} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>
      <span className="admin-nav-marker" aria-hidden="true" />{label}
    </NavLink>)}
    <button type="button" className="admin-nav-link admin-signout admin-sidebar-signout" onClick={onSignOut}>Sign Out</button>
  </nav>
}

export default function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => setDrawerOpen(false), [location.pathname])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  function logout() {
    signOut()
    navigate('/signin', { replace: true })
  }

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link to="/admin" className="admin-brand"><Moon size={20} /><span>Moonstoria</span></Link>
      <SidebarLinks onSignOut={logout} />
    </aside>
    <Drawer open={drawerOpen} onClose={closeDrawer} label="Admin navigation">
      <Link to="/admin" className="admin-brand" onClick={() => setDrawerOpen(false)}><Moon size={20} /><span>Moonstoria</span></Link>
      <SidebarLinks onNavigate={closeDrawer} onSignOut={() => { closeDrawer(); logout() }} />
    </Drawer>
    <div className="admin-main">
      <header className="admin-topbar">
        <button type="button" className="admin-menu-button" onClick={() => setDrawerOpen(true)} aria-label="Open admin navigation"><Menu size={21} /></button>
        <div className="admin-topbar-spacer" />
        <span className="admin-user-name">{user?.name}</span>
      </header>
      <main className="admin-content"><Outlet /></main>
    </div>
  </div>
}
