import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isLoading, signIn } = useAuth()
  const [login, setLogin] = useState('rh.admin')
  const [password, setPassword] = useState('AdminRH123!')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const returnTo = location.state?.returnTo ?? '/solicitacoes'

  if (isAuthenticated) return <Navigate replace to={returnTo} />

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)
    try {
      await signIn({ login, password })
      navigate(returnTo)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-shell admin-page-shell">
      <section className="login-card">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: 'linear-gradient(135deg, var(--blue-600), var(--blue-800))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37,99,235,.25)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--slate-400)', marginBottom: 1 }}>Sistema de Pesquisas</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-900)' }}>Portal Administrativo</p>
          </div>
        </div>

        <h1 style={{ fontSize: '1.75rem', marginBottom: 6 }}>Entrar no portal</h1>
        <p style={{ fontSize: 14, color: 'var(--slate-500)', marginBottom: 0 }}>
          Acesso exclusivo para a equipe de RH e TI.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field-group" htmlFor="login">
            <span>Usuario corporativo</span>
            <input
              id="login"
              name="login"
              type="text"
              autoComplete="username"
              placeholder="seu.usuario"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </label>

          <label className="field-group" htmlFor="password">
            <span>Senha</span>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {errorMessage && (
            <div className="form-error">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {errorMessage}
            </div>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting || isLoading}
            style={{ padding: '13px 18px', fontSize: 15, marginTop: 4 }}
          >
            {isSubmitting ? (
              <>
                <svg width="15" height="15" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Entrando...
              </>
            ) : 'Entrar no portal RH'}
          </button>
        </form>

        <div className="login-footer">
          <p className="credentials-hint">
            Desenvolvimento: rh.admin / AdminRH123!
          </p>
          <Link className="back-link" to="/">← Voltar para a página inicial</Link>
        </div>
      </section>
    </main>
  )
}