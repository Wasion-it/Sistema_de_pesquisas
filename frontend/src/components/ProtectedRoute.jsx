import { Navigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="page-shell admin-page-shell">
        <section className="hero-card compact-card">
          <span className="eyebrow">Portal Administrativo</span>
          <h1>Verificando acesso</h1>
          <p>Estamos validando sua sessao administrativa.</p>
        </section>
      </main>
    )
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/admin/login" />
  }

  return children
}
