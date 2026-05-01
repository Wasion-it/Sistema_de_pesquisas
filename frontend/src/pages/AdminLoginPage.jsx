import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

const fieldBase = {
  width: '100%',
  height: 42,
  padding: '0 44px 0 16px',
  background: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(23, 74, 151, 0.14)',
  borderRadius: 8,
  color: '#132b52',
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 160ms ease, box-shadow 160ms ease, background 160ms ease',
  boxSizing: 'border-box',
}

function EyeIcon({ hidden }) {
  return hidden ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function LoginPeopleIllustration() {
  return (
    <div className="login-people" aria-hidden="true">
      <div className="login-people-orbit" />
      <div className="login-people-card login-people-card-left">
        <span />
        <span />
        <span />
      </div>
      <div className="login-people-card login-people-card-right">
        <span />
        <span />
      </div>

      <div className="login-team">
        <div className="login-person login-person-left">
          <span className="login-person-head" />
          <span className="login-person-body" />
          <span className="login-person-line" />
        </div>
        <div className="login-person login-person-center">
          <span className="login-person-head" />
          <span className="login-person-body" />
          <span className="login-person-line" />
        </div>
        <div className="login-person login-person-right">
          <span className="login-person-head" />
          <span className="login-person-body" />
          <span className="login-person-line" />
        </div>

        <div className="login-team-panel">
          <span />
          <span />
          <span />
        </div>
      </div>

    </div>
  )
}

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

  const handleInputFocus = (event) => {
    event.target.style.borderColor = 'rgba(24, 72, 150, 0.56)'
    event.target.style.boxShadow = '0 0 0 4px rgba(24, 72, 150, 0.12)'
    event.target.style.background = '#ffffff'
  }

  const handleInputBlur = (event) => {
    event.target.style.borderColor = 'rgba(23, 74, 151, 0.14)'
    event.target.style.boxShadow = 'none'
    event.target.style.background = 'rgba(255,255,255,0.9)'
  }

  return (
    <main className="admin-login-scene">
      <style>{`
        .admin-login-scene {
          --wasion-blue: #174a97;
          --wasion-blue-deep: #0d2f6f;
          --wasion-blue-soft: #dce9fb;
          --wasion-orange: #f59a17;
          --wasion-orange-deep: #ec7d12;
          --wasion-ink: #102647;
          min-height: 100vh;
          padding: clamp(20px, 5vw, 56px);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: var(--font-body);
          background:
            radial-gradient(circle at 12% 86%, rgba(245, 154, 23, 0.22) 0 17%, transparent 35%),
            radial-gradient(circle at 82% 12%, rgba(56, 116, 204, 0.24) 0 18%, transparent 38%),
            linear-gradient(135deg, #eef5ff 0%, #d9e9fb 48%, #ffffff 100%);
        }

        .admin-login-scene::before {
          content: '';
          position: absolute;
          left: -8vw;
          bottom: -26vh;
          width: 46vw;
          height: 70vh;
          min-width: 340px;
          border-radius: 48% 52% 42% 58%;
          background:
            radial-gradient(circle at 28% 19%, rgba(13, 47, 111, 0.13) 0 7%, transparent 8%),
            radial-gradient(circle at 42% 24%, rgba(13, 47, 111, 0.1) 0 9%, transparent 10%),
            linear-gradient(155deg, rgba(23, 74, 151, 0.22), rgba(245, 154, 23, 0.08));
          filter: blur(2px);
          opacity: .86;
        }

        .admin-login-scene::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 9% 2%, rgba(245, 154, 23, .16) 0 10px, transparent 11px),
            radial-gradient(circle at 16% 9%, rgba(23, 74, 151, .1) 0 19px, transparent 20px),
            radial-gradient(circle at 31% 13%, rgba(245, 154, 23, .1) 0 18px, transparent 19px);
          pointer-events: none;
        }

        .login-showcase {
          width: min(100%, 1120px);
          min-height: 560px;
          padding: clamp(24px, 5vw, 58px);
          display: grid;
          grid-template-columns: minmax(310px, 390px) 1fr;
          align-items: center;
          gap: clamp(24px, 6vw, 74px);
          position: relative;
          z-index: 1;
          overflow: hidden;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.54);
          border: 1px solid rgba(23, 74, 151, 0.12);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.62), 0 24px 70px rgba(13, 47, 111, 0.13);
          backdrop-filter: blur(10px);
          animation: fadeUp .45s var(--ease, ease) both;
        }

        .login-card {
          width: 100%;
          padding: clamp(28px, 4vw, 42px);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid rgba(255,255,255,.72);
          box-shadow: 0 30px 64px rgba(13, 47, 111, .14), inset 0 1px 0 rgba(255,255,255,.86);
          backdrop-filter: blur(18px);
        }

        .login-logo {
          width: min(100%, 214px);
          height: auto;
          margin: 0 0 18px;
          display: block;
        }

        .login-title {
          margin: 0 0 24px;
          color: var(--wasion-ink);
          font-family: var(--font-body);
          font-size: clamp(2rem, 4vw, 2.55rem);
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0;
        }

        .login-form {
          display: grid;
          gap: 14px;
        }

        .login-label {
          display: grid;
          gap: 7px;
          color: #25466f;
          font-size: 12px;
          font-weight: 700;
        }

        .login-field-wrap {
          position: relative;
        }

        .login-field-icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(23, 74, 151, .44);
          pointer-events: none;
        }

        .login-password-toggle {
          position: absolute;
          right: 11px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: rgba(23, 74, 151, .58);
          cursor: pointer;
          transition: color 160ms ease, background 160ms ease;
        }

        .login-password-toggle:hover {
          color: var(--wasion-blue);
          background: rgba(23, 74, 151, .08);
        }

        .login-submit {
          width: 100%;
          height: 42px;
          margin-top: 10px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--wasion-blue), var(--wasion-blue-deep));
          color: #fff;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 14px 24px rgba(13, 47, 111, .2);
          transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
        }

        .login-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 18px 28px rgba(13, 47, 111, .28);
        }

        .login-submit:disabled {
          cursor: not-allowed;
          opacity: .68;
        }

        .login-bottom-copy {
          margin: 24px 0 0;
          text-align: center;
          color: #29486f;
          font-size: 12px;
          font-weight: 700;
        }

        .login-bottom-copy a {
          color: var(--wasion-orange-deep);
          font-weight: 900;
        }

        .login-error {
          display: flex;
          gap: 9px;
          align-items: flex-start;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, .72);
          border: 1px solid rgba(220, 38, 38, .25);
          color: #b42318;
          font-size: 12px;
          font-weight: 700;
          animation: fadeUp .2s ease both;
        }

        .login-people {
          min-height: 440px;
          position: relative;
        }

        .login-people::before {
          content: '';
          position: absolute;
          left: 14%;
          top: 8%;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,.38), rgba(255,255,255,.1) 58%, transparent 60%);
          border: 1px solid rgba(23, 74, 151, .12);
        }

        .login-people::after {
          content: '';
          position: absolute;
          left: 16%;
          bottom: 15%;
          width: 390px;
          height: 60px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(13, 47, 111, .16), transparent 68%);
          filter: blur(8px);
        }

        .login-people-orbit {
          position: absolute;
          left: 20%;
          top: 16%;
          width: 345px;
          height: 260px;
          border: 1.5px dashed rgba(23, 74, 151, .22);
          border-radius: 48%;
          transform: rotate(-10deg);
        }

        .login-people-orbit::before,
        .login-people-orbit::after {
          content: '';
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--wasion-orange);
          box-shadow: 0 0 0 7px rgba(245, 154, 23, .13);
        }

        .login-people-orbit::before {
          top: 24px;
          right: 48px;
        }

        .login-people-orbit::after {
          left: 52px;
          bottom: 24px;
          background: var(--wasion-blue);
          box-shadow: 0 0 0 7px rgba(23, 74, 151, .12);
        }

        .login-team {
          position: absolute;
          left: 17%;
          top: 22%;
          width: 430px;
          height: 275px;
          animation: peopleFloat 5.8s ease-in-out infinite;
        }

        .login-person {
          position: absolute;
          bottom: 26px;
          width: 142px;
          height: 214px;
        }

        .login-person-left {
          left: 0;
          transform: scale(.86);
          transform-origin: bottom center;
          opacity: .92;
        }

        .login-person-center {
          left: 132px;
          z-index: 2;
        }

        .login-person-right {
          right: 0;
          transform: scale(.9);
          transform-origin: bottom center;
          opacity: .94;
        }

        .login-person-head {
          position: absolute;
          left: 50%;
          top: 0;
          width: 62px;
          height: 62px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 38% 34%, rgba(255,255,255,.62), transparent 24%),
            linear-gradient(145deg, #f6fbff, #bfd6f5);
          transform: translateX(-50%);
          box-shadow: inset -8px -9px 16px rgba(13, 47, 111, .12), 0 14px 26px rgba(13, 47, 111, .12);
        }

        .login-person-body {
          position: absolute;
          left: 50%;
          top: 70px;
          width: 126px;
          height: 142px;
          border-radius: 36px 36px 22px 22px;
          background: linear-gradient(145deg, #2a66b3, var(--wasion-blue-deep));
          transform: translateX(-50%);
          box-shadow: inset 16px 0 22px rgba(255,255,255,.16), inset -15px -12px 22px rgba(3, 31, 82, .18), 0 24px 34px rgba(13, 47, 111, .14);
        }

        .login-person-left .login-person-body {
          background: linear-gradient(145deg, #f9b34a, var(--wasion-orange-deep));
        }

        .login-person-right .login-person-body {
          background: linear-gradient(145deg, #244f91, #12346f);
        }

        .login-person-line {
          position: absolute;
          left: 50%;
          top: 132px;
          width: 62px;
          height: 5px;
          border-radius: 999px;
          background: rgba(255,255,255,.6);
          transform: translateX(-50%);
        }

        .login-person-line::after {
          content: '';
          position: absolute;
          left: 13px;
          top: 16px;
          width: 36px;
          height: 5px;
          border-radius: 999px;
          background: rgba(255,255,255,.38);
        }

        .login-team-panel {
          position: absolute;
          left: 105px;
          bottom: 0;
          width: 220px;
          height: 76px;
          padding: 18px 22px;
          display: grid;
          gap: 9px;
          border-radius: 16px;
          background: rgba(255, 255, 255, .78);
          border: 1px solid rgba(255,255,255,.72);
          box-shadow: 0 18px 36px rgba(13, 47, 111, .13), inset 0 1px 0 rgba(255,255,255,.72);
          backdrop-filter: blur(14px);
          z-index: 4;
        }

        .login-team-panel span {
          display: block;
          height: 7px;
          border-radius: 999px;
          background: rgba(23, 74, 151, .16);
        }

        .login-team-panel span:nth-child(1) { width: 76%; }
        .login-team-panel span:nth-child(2) { width: 100%; }
        .login-team-panel span:nth-child(3) { width: 56%; background: rgba(245, 154, 23, .34); }

        .login-people-card {
          position: absolute;
          width: 128px;
          padding: 14px;
          display: grid;
          gap: 8px;
          border-radius: 14px;
          background: rgba(255,255,255,.62);
          border: 1px solid rgba(255,255,255,.7);
          box-shadow: 0 16px 32px rgba(13, 47, 111, .1);
          backdrop-filter: blur(12px);
          z-index: 5;
        }

        .login-people-card span {
          display: block;
          height: 7px;
          border-radius: 999px;
          background: rgba(23, 74, 151, .16);
        }

        .login-people-card span:first-child {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(145deg, #fff8ef, #f5a83d);
        }

        .login-people-card-left {
          left: 8%;
          top: 16%;
          transform: rotate(-5deg);
        }

        .login-people-card-right {
          right: 12%;
          top: 22%;
          transform: rotate(6deg);
        }

        @keyframes peopleFloat {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(.6deg); }
        }

        @media (max-width: 900px) {
          .login-showcase {
            grid-template-columns: 1fr;
            min-height: auto;
          }

          .login-card {
            max-width: 430px;
            margin: 0 auto;
          }

          .login-people {
            min-height: 300px;
            order: -1;
            transform: scale(.76);
            margin: -48px 0 -42px;
            transform-origin: center;
          }
        }

        @media (max-width: 560px) {
          .admin-login-scene {
            padding: 16px;
            align-items: stretch;
          }

          .login-showcase {
            padding: 20px;
            border-radius: 16px;
          }

          .login-card {
            padding: 28px 22px;
          }

          .login-people {
            display: none;
          }

        }
      `}</style>

      <section className="login-showcase">
        <div className="login-card">
          <img className="login-logo" src="/wasion-america-logo.png" alt="Wasion America" />
          <h1 className="login-title">Login</h1>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-label" htmlFor="login">
              Usuario
              <span className="login-field-wrap">
                <input
                  id="login"
                  name="login"
                  type="text"
                  autoComplete="username"
                  placeholder="seu.usuario"
                  value={login}
                  onChange={(event) => setLogin(event.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  style={fieldBase}
                />
                <span className="login-field-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
              </span>
            </label>

            <label className="login-label" htmlFor="password">
              Senha
              <span className="login-field-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  style={fieldBase}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <EyeIcon hidden={showPassword} />
                </button>
              </span>
            </label>

            {errorMessage && (
              <div className="login-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errorMessage}
              </div>
            )}

            <button className="login-submit" type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="login-bottom-copy">
            <Link to="/">Voltar para pagina inicial</Link>
          </p>
        </div>

        <LoginPeopleIllustration />
      </section>
    </main>
  )
}
