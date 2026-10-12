import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout({ onAuth }) {
  return <div className="site-shell"><Navbar onAuth={onAuth} /><div className="site-content"><Outlet /></div><Footer /></div>
}
