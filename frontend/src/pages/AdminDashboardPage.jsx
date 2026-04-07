import { useAuth } from '../auth/AuthProvider'

export function AdminDashboardPage() {
  const { signOut, user } = useAuth()

  return (
    <main className="page-shell admin-page-shell">
      <section className="admin-dashboard-card">
        <div className="dashboard-header">
          <div>
            <span className="eyebrow">Portal Administrativo</span>
            <h1>Area protegida do RH</h1>
            <p>
              Sessao autenticada com JWT ativa para administracao do sistema de
              pesquisas organizacionais.
            </p>
          </div>

          <button className="secondary-button" onClick={signOut} type="button">
            Sair
          </button>
        </div>

        <div className="dashboard-grid">
          <article className="dashboard-panel">
            <strong>Usuario autenticado</strong>
            <span>{user?.full_name}</span>
          </article>
          <article className="dashboard-panel">
            <strong>E-mail</strong>
            <span>{user?.email}</span>
          </article>
          <article className="dashboard-panel">
            <strong>Perfil</strong>
            <span>{user?.role}</span>
          </article>
          <article className="dashboard-panel">
            <strong>Ultimo login</strong>
            <span>{user?.last_login_at ? new Date(user.last_login_at).toLocaleString('pt-BR') : 'Primeiro acesso'}</span>
          </article>
        </div>
      </section>
    </main>
  )
}
