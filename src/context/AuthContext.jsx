import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)
const STORAGE_KEY = 'bustracker_auth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  function login(userData) {
    setUser(userData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
  }

  function logout() {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const auth = user ? { email: user.email, password: user.password } : null
  const isAdmin = user?.role?.toLowerCase() === 'admin'
  const isDriver = user?.role?.toLowerCase() === 'driver' || isAdmin

  return (
    <AuthContext.Provider value={{ user, auth, login, logout, isAdmin, isDriver }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
