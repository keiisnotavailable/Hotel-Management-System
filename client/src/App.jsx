import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AuthModal from './components/AuthModal'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import CryptDetailPage from './pages/CryptDetailPage'
import CryptsPage from './pages/CryptsPage'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import ReservationsPage from './pages/ReservationsPage'
import SignInPage from './pages/SignInPage'
import StaticPage from './pages/StaticPage'
import ContactPage from './pages/ContactPage'
import SavedCryptsPage from './pages/SavedCryptsPage'
import Layout from './components/Layout'
import NotFoundPage from './pages/NotFoundPage'
import AboutPage from './pages/AboutPage'
import AdminRoute from './admin/components/AdminRoute'
import AdminLayout from './admin/components/AdminLayout'
import AdminPlaceholderPage from './admin/pages/AdminPlaceholderPage'
import AdminDashboard from './admin/pages/AdminDashboard'

function AdminApiAuthHandler() {
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    function handleExpiredAuth() {
      navigate('/signin', { replace: true, state: { from: location } })
    }
    window.addEventListener('moonstoria:auth-expired', handleExpiredAuth)
    return () => window.removeEventListener('moonstoria:auth-expired', handleExpiredAuth)
  }, [location, navigate])
  return null
}

function Application() {
  const [auth, setAuth] = useState(null)
  return <BrowserRouter><AdminApiAuthHandler /><Routes>
    <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
      <Route index element={<AdminDashboard />} />
      <Route path="rooms" element={<AdminPlaceholderPage title="Crypts" subtitle="Manage rooms." />} />
      <Route path="rooms/new" element={<AdminPlaceholderPage title="New crypt" subtitle="Add a room to the castle." />} />
      <Route path="rooms/:id/edit" element={<AdminPlaceholderPage title="Edit crypt" subtitle="Manage this room." />} />
      <Route path="users" element={<AdminPlaceholderPage title="Monsters" subtitle="Manage guests and staff." />} />
      <Route path="reservations" element={<AdminPlaceholderPage title="Reservations" subtitle="Manage stays from Dusk to Dawn." />} />
    </Route>
    <Route element={<Layout onAuth={(mode, from) => setAuth({ mode, from })} />}>
      <Route path="/" element={<HomePage onAuth={(mode) => setAuth({ mode })} />} />
      <Route path="/crypts" element={<CryptsPage />} />
      <Route path="/crypts/:id" element={<CryptDetailPage onAuth={(mode, from) => setAuth({ mode, from })} />} />
      <Route element={<ProtectedRoute />}><Route path="/my-reservations" element={<ReservationsPage />} /><Route path="/profile" element={<ProfilePage />} /></Route>
      <Route element={<ProtectedRoute />}><Route path="/saved-crypts" element={<SavedCryptsPage onAuth={(mode, from) => setAuth({ mode, from })} />} /></Route>
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/services" element={<StaticPage eyebrow="At your service" title="Castle services">From moonlit dining to restful crypts, our keepers make every stay comfortable, mysterious, and entirely human-free.</StaticPage>} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>{auth && <AuthModal initialMode={auth.mode.replace('/', '')} from={auth.from} onClose={() => setAuth(null)} />}</BrowserRouter>
}

export default function App() {
  return <AuthProvider><Application /></AuthProvider>
}
