import { Mail, MapPin, Phone, Facebook, Instagram } from 'lucide-react'
import { Link } from 'react-router-dom'
import logo from '../images/logo.png'

export default function Footer() {
  return <footer className="site-footer">
    <div className="site-footer-grid">
      <div className="site-footer-brand">
        <Link to="/" className="navbar-brand"><img src={logo} alt="" className="navbar-logo" /><span>Moonstoria Hotel</span></Link>
        <p>A quiet gothic sanctuary for unforgettable nights beneath the moon.</p>
        <div className="site-footer-socials"><a href="https://www.facebook.com" aria-label="Moonstoria on Facebook"><Facebook size={16} /></a><a href="https://www.instagram.com" aria-label="Moonstoria on Instagram"><Instagram size={16} /></a></div>
      </div>
      <div><h2 className="site-footer-heading">Explore</h2><nav className="site-footer-links" aria-label="Footer navigation"><Link to="/">Home</Link><Link to="/about">About</Link><Link to="/crypts">Rooms</Link><Link to="/blog">Blog</Link><Link to="/contact">Contact</Link></nav></div>
      <div><h2 className="site-footer-heading">Correspondence</h2><div className="site-footer-contact"><p><MapPin size={15} /> At the edge of Moonstoria forest</p><p><Mail size={15} /> hello@moonstoria.hotel</p><p><Phone size={15} /> +1 (555) 013-1313</p><p>Open dusk until dawn</p></div></div>
    </div>
    <div className="site-footer-bottom"><span>© {new Date().getFullYear()} Moonstoria Hotel</span><span>All nocturnal rights reserved.</span></div>
  </footer>
}
