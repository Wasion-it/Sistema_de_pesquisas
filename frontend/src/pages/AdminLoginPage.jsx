import { Link } from 'react-router-dom'

export function AdminLoginPage() {
  return (
    <main className="page-shell admin-page-shell">
      <section className="login-card">
        <span className="eyebrow">Portal Administrativo</span>
        <h1>Login do RH</h1>
        <p>
          Acesso inicial para administracao interna do sistema de pesquisas.
          Esta tela prepara a base para a autenticacao real do portal.
        </p>

        <form className="login-form">
          <label className="field-group" htmlFor="email">
            <span>E-mail corporativo</span>
            <input id="email" name="email" type="email" placeholder="rh@empresa.com" />
          </label>

          <label className="field-group" htmlFor="password">
            <span>Senha</span>
            <input id="password" name="password" type="password" placeholder="Digite sua senha" />
          </label>

          <button className="primary-button" type="submit">
            Entrar no Portal RH
          </button>
        </form>

        <div className="login-footer">
          <span>Somente usuarios autorizados do portal administrativo.</span>
          <Link className="back-link" to="/">
            Voltar para a pagina inicial
          </Link>
        </div>
      </section>
    </main>
  )
}
