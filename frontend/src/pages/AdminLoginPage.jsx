import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isLoading, signIn } = useAuth()
  const [login, setLogin] = useState('rh.admin')
  const [password, setPassword] = useState('AdminRH123!')
  const [showPassword, setShowPassword] = useState(false)
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

  const inputStyle = {
    width: '100%',
    padding: '11px 14px 11px 40px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 160ms ease, box-shadow 160ms ease, background 160ms ease',
    boxSizing: 'border-box',
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: '#0c0e14',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Background effects */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-120px', left: '-80px',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.13) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-120px', right: '-60px',
          width: 440, height: 440, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.09) 0%, transparent 65%)',
        }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}>
          <defs>
            <pattern id="loginGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#loginGrid)" />
        </svg>
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1, animation: 'fadeUp .4s ease both' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 54, height: 54, borderRadius: 16, marginBottom: 22,
            background: 'linear-gradient(135deg, #1d4ed8, #4f46e5)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(37,99,235,0.35)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(148,163,184,0.65)',
            marginBottom: 8,
          }}>
            Sistema de Recursos Humanos
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
            fontWeight: 600,
            color: '#f1f5f9',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            margin: 0,
          }}>
            Bem-vindo de volta
          </h1>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20,
          padding: '28px 28px 24px',
          backdropFilter: 'blur(16px)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
            {/* Login field */}
            <div style={{ display: 'grid', gap: 8 }}>
              <label
                htmlFor="login"
                style={{
                  fontSize: 11, fontWeight: 700,
                  color: 'rgba(148,163,184,0.75)',
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                }}
              >
                Usuário corporativo
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                  color: 'rgba(100,116,139,0.7)', pointerEvents: 'none',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  id="login"
                  name="login"
                  type="text"
                  autoComplete="username"
                  placeholder="seu.usuario"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(99,102,241,0.6)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
                    e.target.style.background = 'rgba(255,255,255,0.08)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.target.style.boxShadow = 'none'
                    e.target.style.background = 'rgba(255,255,255,0.06)'
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ display: 'grid', gap: 8 }}>
              <label
                htmlFor="password"
                style={{
                  fontSize: 11, fontWeight: 700,
                  color: 'rgba(148,163,184,0.75)',
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                }}
              >
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                  color: 'rgba(100,116,139,0.7)', pointerEvents: 'none',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 42 }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(99,102,241,0.6)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'
                    e.target.style.background = 'rgba(255,255,255,0.08)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.target.style.boxShadow = 'none'
                    e.target.style.background = 'rgba(255,255,255,0.06)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(100,116,139,0.6)', padding: 2,
                    display: 'flex', alignItems: 'center',
                    transition: 'color 140ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(148,163,184,0.9)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(100,116,139,0.6)' }}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {errorMessage && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '11px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#fca5a5', fontSize: 13, fontWeight: 500,
                animation: 'fadeUp .2s ease both',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errorMessage}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              style={{
                width: '100%',
                padding: '13px 18px',
                background: isSubmitting || isLoading
                  ? 'rgba(99,102,241,0.4)'
                  : 'linear-gradient(135deg, #1d4ed8, #4f46e5)',
                border: 'none',
                borderRadius: 12,
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 160ms ease',
                boxShadow: isSubmitting || isLoading ? 'none' : '0 4px 20px rgba(37,99,235,0.35)',
                letterSpacing: '0.01em',
                marginTop: 4,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && !isLoading) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 28px rgba(37,99,235,0.45)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.35)'
              }}
            >
              {isSubmitting ? (
                <>
                  <svg width="14" height="14" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Entrando...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Entrar no portal RH
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            marginTop: 20, paddingTop: 18,
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <code style={{
              fontSize: 11, color: 'rgba(100,116,139,0.6)',
              fontFamily: '"Courier New", monospace',
            }}>
              rh.admin / AdminRH123!
            </code>
            <Link
              to="/"
              style={{
                fontSize: 12, fontWeight: 600,
                color: 'rgba(96,165,250,0.75)',
                textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'color 140ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(147,197,253,0.95)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(96,165,250,0.75)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
              </svg>
              Página inicial
            </Link>
          </div>
        </div>

        <p style={{
          textAlign: 'center', fontSize: 12,
          color: 'rgba(100,116,139,0.45)',
          marginTop: 20,
        }}>
          Acesso exclusivo para a equipe de RH e TI
        </p>
      </div>
    </main>
  )
}