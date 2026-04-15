import { Link } from 'react-router-dom'

export function AdminDashboardPage() {
  return (
    <div className="admin-view admin-home-view">
      <section className="admin-home-hero">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h2>Painel administrativo</h2>
          <p>
            Página padrão de entrada do admin, com acesso direto ao painel de indicadores de pesquisas.
          </p>
        </div>
        <div className="admin-home-hero-badge">
          <span>Atalho principal</span>
          <strong>Indicadores de pesquisas</strong>
        </div>
      </section>

      <section className="admin-home-modules" aria-label="Atalho do dashboard">
        <Link className="admin-home-module module-blue" to="/admin/dashboard/pesquisas">
          <div className="admin-home-module-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 13l4-4 4 4 6-6 4 4" />
              <path d="M21 7v6h-6" />
            </svg>
          </div>
          <div className="admin-home-module-body">
            <span className="admin-home-module-kicker">Modulo de pesquisas</span>
            <h3>KPIs de pesquisas da empresa</h3>
            <p>Abra a página com os indicadores, fluxo de respostas e pesquisas recentes.</p>
          </div>
          <span className="admin-home-module-action">Abrir</span>
        </Link>

        <Link className="admin-home-module module-amber" to="/admin/requests">
          <div className="admin-home-module-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect height="18" rx="2" width="18" x="3" y="3" />
              <path d="M8 7h8" />
              <path d="M8 12h8" />
              <path d="M8 17h5" />
            </svg>
          </div>
          <div className="admin-home-module-body">
            <span className="admin-home-module-kicker">Modulo de solicitações</span>
            <h3>Entrar nas solicitações do RH</h3>
            <p>Abra a página padrão com os atalhos para admissão e demissão antes de seguir para os detalhes.</p>
          </div>
          <span className="admin-home-module-action">Abrir</span>
        </Link>
      </section>
    </div>
  )
}
