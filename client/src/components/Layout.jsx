import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'

const pageMeta = {
  '/': ['Moonstoria Hotel | Gothic luxury after dark', 'Stay beneath the moon at Moonstoria Hotel, a gothic sanctuary for unforgettable nights.'],
  '/about': ['About Moonstoria Hotel', 'Discover the legend, keepers, and nocturnal hospitality behind Moonstoria Hotel.'],
  '/contact': ['Contact Moonstoria Hotel', 'Contact the Moonstoria keepers about reservations, accessibility, celebrations, and special requests.'],
  '/crypts': ['Rooms | Moonstoria Hotel', 'Explore Moonstoria rooms, crypts, suites, and dens for your next stay after dark.'],
  '/signin': ['Sign in | Moonstoria Hotel', 'Sign in or create an account to manage your Moonstoria stay.'],
}

function RouteMeta() {
  const { pathname } = useLocation()
  useEffect(() => {
    const [title, description] = pageMeta[pathname] || (pathname.startsWith('/crypts/') ? ['Room details | Moonstoria Hotel', 'Explore a Moonstoria room and plan your stay beneath the moon.'] : ['Moonstoria Hotel', 'A gothic hotel sanctuary for unforgettable nights.'])
    document.title = title
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description
  }, [pathname])
  return null
}

export default function Layout({ onAuth }) {
  return <div className="site-shell"><RouteMeta /><Navbar onAuth={onAuth} /><div className="site-content"><Outlet /></div><Footer /></div>
}
