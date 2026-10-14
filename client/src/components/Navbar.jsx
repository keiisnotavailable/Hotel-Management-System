import { Menu, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import logo from '../images/logo.png'
import { getUploadedAssetUrl } from '../lib/api'
import DropdownMenu from './DropdownMenu'

function AccountAvatar({ user, imageUrl }) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => { setImageFailed(false) }, [imageUrl])

  const initials = (user.name || user.email || 'M').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  return imageUrl && !imageFailed
    ? <img src={imageUrl} alt="" className="navbar-profile-photo" onError={() => setImageFailed(true)} />
    : <span className="navbar-profile-fallback" aria-hidden="true">{initials}</span>
}

function NavLink({ to, label, active, onClick }) {
  return <Link to={to} onClick={onClick} className={`navbar-link ${active ? 'active' : ''}`}>{label}</Link>
}

export default function Navbar({ onAuth }) {
  const { user, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function updateScrolled() {
      setScrolled(window.scrollY > 20)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') { setOpen(null); setMobileOpen(false) }
    }
    updateScrolled()
    window.addEventListener('scroll', updateScrolled, { passive: true })
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('scroll', updateScrolled)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function closeMenus() {
    setOpen(null); setMobileOpen(false)
  }

  function logout() {
    signOut()
    closeMenus()
    navigate('/')
  }

  function openAuth() {
    closeMenus()
    if (onAuth) onAuth('/signin')
    else navigate('/signin')
  }

  const isActive = (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)
  const profilePhoto = getUploadedAssetUrl(user?.profileImage)

  return <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`} aria-label="Main navigation">
    <div className="navbar-inner">
      <Link to="/" aria-label="Hotel Moonstoria home" onClick={closeMenus} className="navbar-brand"><img src={logo} alt="" className="navbar-logo" /><span>Moonstoria Hotel</span></Link>
      <div className="navbar-links">
        <NavLink to="/" label="Home" active={location.pathname === '/'} />
        <NavLink to="/about" label="About" active={isActive('/about')} />
        <NavLink to="/crypts" label="Rooms" active={isActive('/crypts')} />
        <NavLink to="/contact" label="Contact" active={isActive('/contact')} />
      </div>
      {user ? <div className="navbar-account"><DropdownMenu
        id="navbar-account-menu"
        label="Account"
        open={open === 'account'}
        onOpenChange={(nextOpen) => setOpen(nextOpen ? 'account' : null)}
        minWidth={200}
        menuClassName="navbar-menu account-menu"
        trigger={<button className="account-button" type="button"><AccountAvatar user={user} imageUrl={profilePhoto} /><span>{user.name}</span></button>}
      >
        <Link role="menuitem" to="/profile" onClick={closeMenus}>Profile</Link>
        <Link role="menuitem" to="/my-reservations" onClick={closeMenus}>My Reservations</Link>
        <Link role="menuitem" to="/saved-crypts" onClick={closeMenus}>Saved Crypts</Link>
        {isAdmin && <Link role="menuitem" to="/admin" onClick={closeMenus}>Admin</Link>}
        <button role="menuitem" type="button" onClick={logout}>Sign Out</button>
      </DropdownMenu></div> : <button className="account-button" type="button" onClick={openAuth}>Sign in / Sign up</button>}
      <button className="navbar-toggle" type="button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileOpen} aria-controls="navbar-mobile-panel">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </div>
    {mobileOpen && <div id="navbar-mobile-panel" className="navbar-mobile-panel">
      <NavLink to="/" label="Home" active={location.pathname === '/'} onClick={closeMenus} />
      <NavLink to="/about" label="About" active={isActive('/about')} onClick={closeMenus} />
      <NavLink to="/crypts" label="Rooms" active={isActive('/crypts')} onClick={closeMenus} />
      <NavLink to="/contact" label="Contact" active={isActive('/contact')} onClick={closeMenus} />
      {user ? <><NavLink to="/profile" label="Profile" active={isActive('/profile')} onClick={closeMenus} /><NavLink to="/my-reservations" label="My Reservations" active={isActive('/my-reservations')} onClick={closeMenus} /><NavLink to="/saved-crypts" label="Saved Crypts" active={isActive('/saved-crypts')} onClick={closeMenus} />{isAdmin && <NavLink to="/admin" label="Admin" active={isActive('/admin')} onClick={closeMenus} />}<button className="account-button mobile-account-button" type="button" onClick={logout}>Sign Out</button></> : <button className="account-button mobile-account-button" type="button" onClick={openAuth}>Sign in / Sign up</button>}
    </div>}
  </nav>
}
