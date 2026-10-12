import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
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

function Application() {
  const [auth, setAuth] = useState(null)
  return <BrowserRouter><Routes>
    <Route element={<Layout onAuth={(mode, from) => setAuth({ mode, from })} />}>
      <Route path="/" element={<HomePage onAuth={(mode) => setAuth({ mode })} />} />
      <Route path="/crypts" element={<CryptsPage />} />
      <Route path="/crypts/:id" element={<CryptDetailPage onAuth={(mode, from) => setAuth({ mode, from })} />} />
      <Route element={<ProtectedRoute />}><Route path="/my-reservations" element={<ReservationsPage />} /><Route path="/profile" element={<ProfilePage />} /></Route>
      <Route element={<ProtectedRoute />}><Route path="/saved-crypts" element={<SavedCryptsPage onAuth={(mode, from) => setAuth({ mode, from })} />} /></Route>
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/about" element={<StaticPage eyebrow="The Moonstoria story" title="About the castle">Moonstoria is a quiet gothic sanctuary built for memorable nights, thoughtful service, and guests who prefer their holidays after sunset.</StaticPage>} />
      <Route path="/services" element={<StaticPage eyebrow="At your service" title="Castle services">From moonlit dining to restful crypts, our keepers make every stay comfortable, mysterious, and entirely human-free.</StaticPage>} />
      <Route path="/blog" element={<StaticPage eyebrow="Tales from the keep" title="The Moonstoria journal">Discover seasonal rituals, room stories, and travel inspiration from the castle grounds.</StaticPage>} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>{auth && <AuthModal initialMode={auth.mode.replace('/', '')} from={auth.from} onClose={() => setAuth(null)} />}</BrowserRouter>
}

export default function App() {
  return <AuthProvider><Application /></AuthProvider>
}
