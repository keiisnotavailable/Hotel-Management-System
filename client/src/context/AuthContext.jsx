import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('hotelTransylvaniaUser')
    return stored ? JSON.parse(stored) : null
  })

  function signIn(nextUser, token) {
    if (token) localStorage.setItem('hotelTransylvaniaToken', token)
    localStorage.setItem('hotelTransylvaniaUser', JSON.stringify(nextUser))
    setUser(nextUser)
  }

  function signOut() {
    localStorage.removeItem('hotelTransylvaniaToken')
    localStorage.removeItem('hotelTransylvaniaUser')
    setUser(null)
  }

  useEffect(() => {
    function handleExpiredAuth() {
      localStorage.removeItem('hotelTransylvaniaToken')
      localStorage.removeItem('hotelTransylvaniaUser')
      setUser(null)
    }
    window.addEventListener('moonstoria:auth-expired', handleExpiredAuth)
    return () => window.removeEventListener('moonstoria:auth-expired', handleExpiredAuth)
  }, [])

  const value = useMemo(() => ({ user, isAdmin: user?.role === 'admin', signIn, signOut }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
