import { createContext, useContext, useEffect, useState } from 'react'

import { getAdminSession, loginAdmin } from '../services/auth'

const AuthContext = createContext(null)
const TOKEN_STORAGE_KEY = 'admin-auth-token'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_STORAGE_KEY))
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(window.localStorage.getItem(TOKEN_STORAGE_KEY)))

  useEffect(() => {
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    getAdminSession(token)
      .then((data) => {
        if (isMounted) {
          setUser(data.user)
        }
      })
      .catch(() => {
        if (isMounted) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY)
          setToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [token])

  async function signIn(credentials) {
    const data = await loginAdmin(credentials)
    window.localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token)
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }

  function signOut() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(token && user),
        isLoading,
        signIn,
        signOut,
        token,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
