import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, signIn } = useAuth()
  const [email, setEmail] = useState('rh.admin@example.com')
  const [password, setPassword] = useState('AdminRH123!')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate replace to="/admin" />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      await signIn({ email, password })
      navigate('/admin')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-shell admin-page-shell">
      <section className="login-card">
        <span className="eyebrow">Portal Administrativo</span>
        <h1>Login do RH</h1>
        <p>
          Acesso restrito ao portal administrativo com autenticacao JWT validada
          pelo backend.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field-group" htmlFor="email">
            <span>E-mail corporativo</span>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="rh@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="field-group" htmlFor="password">
            <span>Senha</span>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting ? 'Entrando...' : 'Entrar no Portal RH'}
          </button>
        </form>

        <div className="login-footer">
          <span>Somente usuarios autorizados do portal administrativo.</span>
          <span className="credentials-hint">
            Ambiente local: use rh.admin@example.com com a senha AdminRH123!.
          </span>
          <Link className="back-link" to="/">
            Voltar para a pagina inicial
          </Link>
        </div>
      </section>
    </main>
  )
}
