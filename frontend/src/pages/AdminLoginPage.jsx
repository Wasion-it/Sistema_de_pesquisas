import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isLoading, signIn } = useAuth()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
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
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    color: '#0f172a',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 160ms ease, box-shadow 160ms ease, background 160ms ease',
    boxSizing: 'border-box',
  }

  const handleInputFocus = (e) => {
    e.target.style.borderColor = 'rgba(31,78,153,0.7)'
    e.target.style.boxShadow = '0 0 0 3px rgba(31,78,153,0.12)'
    e.target.style.background = '#ffffff'
  }

  const handleInputBlur = (e) => {
    e.target.style.borderColor = '#e2e8f0'
    e.target.style.boxShadow = 'none'
    e.target.style.background = '#ffffff'
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(160deg, #F5F8FC 0%, #EAF1FB 60%, #FFFFFF 100%)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            left: '-80px',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(31,78,153,0.12) 0%, transparent 65%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            bottom: '-120px',
            right: '-60px',
            width: 440,
            height: 440,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(242,140,27,0.10) 0%, transparent 65%)',
          }}
        />

        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.035 }}>
          <defs>
            <pattern id="loginGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1F4E99" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#loginGrid)" />
        </svg>
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1, animation: 'fadeUp .4s ease both' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 54,
              height: 54,
              borderRadius: 16,
              marginBottom: 22,
              background: 'linear-gradient(135deg, #1F4E99, #163B73)',
              boxShadow: '0 10px 28px rgba(31,78,153,0.25)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>

          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#F28C1B',
              marginBottom: 8,
            }}
          >
            Sistema de Recursos Humanos
          </p>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
              fontWeight: 600,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Bem-vindo de volta
          </h1>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.94)',
            border: '1px solid rgba(31,78,153,0.15)',
            borderRadius: 20,
            padding: '28px 28px 24px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 20px 48px rgba(15,23,42,0.08)',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <label
                htmlFor="login"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#475569',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}
              >
                Usuário corporativo
              </label>

              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
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
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label
                htmlFor="password"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#475569',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}
              >
                Senha
              </label>

              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 140ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#1F4E99'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#64748b'
                  }}
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
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '11px 14px',
                  borderRadius: 10,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: 13,
                  fontWeight: 500,
                  animation: 'fadeUp .2s ease both',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              style={{
                width: '100%',
                padding: '13px 18px',
                background:
                  isSubmitting || isLoading
                    ? 'rgba(31,78,153,0.55)'
                    : 'linear-gradient(135deg, #1F4E99, #163B73)',
                border: 'none',
                borderRadius: 12,
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 700,
                cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 160ms ease',
                boxShadow: isSubmitting || isLoading ? 'none' : '0 10px 24px rgba(31,78,153,0.28)',
                letterSpacing: '0.01em',
                marginTop: 4,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && !isLoading) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(31,78,153,0.35)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 10px 24px rgba(31,78,153,0.28)'
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

          <div
            style={{
              marginTop: 20,
              paddingTop: 18,
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <Link
              to="/"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#1F4E99',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'color 140ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#163B73'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#1F4E99'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              Página inicial
            </Link>
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: '#64748b',
            marginTop: 20,
          }}
        >
          Acesso exclusivo para a equipe de RH e TI
        </p>
      </div>
    </main>
  )
}
