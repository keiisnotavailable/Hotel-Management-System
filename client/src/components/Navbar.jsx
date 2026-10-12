import { Menu, UserCircle, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import logo from '../images/logo.png'

function NavLink({ to, label, active, onClick }) {
  return <Link to={to} onClick={onClick} className={`navbar-link ${active ? 'active' : ''}`}>{label}</Link>
}

export default function Navbar({ onAuth }) {
  const { user, signOut } = useAuth()
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

  return <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`} aria-label="Main navigation">
    <div className="navbar-inner">
      <Link to="/" aria-label="Hotel Moonstoria home" onClick={closeMenus} className="navbar-brand"><img src={logo} alt="" className="navbar-logo" /><span>Moonstoria Hotel</span></Link>
      <div className="navbar-links">
        <NavLink to="/" label="Home" active={location.pathname === '/'} />
        <NavLink to="/about" label="About" active={isActive('/about')} />
        <NavLink to="/crypts" label="Rooms" active={isActive('/crypts')} />
        <NavLink to="/blog" label="Blog" active={isActive('/blog')} />
        <NavLink to="/contact" label="Contact" active={isActive('/contact')} />
      </div>
      {user ? <div className="navbar-account"><button className="account-button" type="button" onClick={() => setOpen(open === 'account' ? null : 'account')} aria-expanded={open === 'account'} aria-haspopup="menu" aria-controls="navbar-account-menu"><UserCircle size={18} /> {user.name}</button>{open === 'account' && <div id="navbar-account-menu" className="navbar-menu account-menu" role="menu"><Link role="menuitem" to="/profile" onClick={closeMenus}>Profile</Link><Link role="menuitem" to="/my-reservations" onClick={closeMenus}>My Reservations</Link><Link role="menuitem" to="/saved-crypts" onClick={closeMenus}>Saved Crypts</Link><button role="menuitem" type="button" onClick={logout}>Sign Out</button></div>}</div> : <button className="account-button" type="button" onClick={openAuth}>Sign in / Sign up</button>}
      <button className="navbar-toggle" type="button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileOpen} aria-controls="navbar-mobile-panel">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </div>
    {mobileOpen && <div id="navbar-mobile-panel" className="navbar-mobile-panel">
      <NavLink to="/" label="Home" active={location.pathname === '/'} onClick={closeMenus} />
      <NavLink to="/about" label="About" active={isActive('/about')} onClick={closeMenus} />
      <NavLink to="/crypts" label="Rooms" active={isActive('/crypts')} onClick={closeMenus} />
      <NavLink to="/blog" label="Blog" active={isActive('/blog')} onClick={closeMenus} /><NavLink to="/contact" label="Contact" active={isActive('/contact')} onClick={closeMenus} />
      {user ? <><NavLink to="/profile" label="Profile" active={isActive('/profile')} onClick={closeMenus} /><NavLink to="/my-reservations" label="My Reservations" active={isActive('/my-reservations')} onClick={closeMenus} /><NavLink to="/saved-crypts" label="Saved Crypts" active={isActive('/saved-crypts')} onClick={closeMenus} /><button className="account-button mobile-account-button" type="button" onClick={logout}>Sign Out</button></> : <button className="account-button mobile-account-button" type="button" onClick={openAuth}>Sign in / Sign up</button>}
    </div>}
  </nav>
}
