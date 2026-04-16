import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <main
      className="page-shell"
      style={{ background: 'linear-gradient(150deg, var(--slate-50) 0%, var(--blue-50) 50%, #eef2ff 100%)' }}
    >
      <header className="collab-header">
        <div className="collab-header-inner">
          <span className="collab-brand">Sistema de Recursos Humanos</span>
          <Link className="text-muted-link" to="/admin/login" state={{ returnTo: '/admin' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Acesso RH
          </Link>
        </div>
      </header>

      <div className="admin-view admin-home-view" style={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
        <section className="admin-home-hero">
          <div>
            <span className="eyebrow">Portal do colaborador</span>
            <h2>Escolha um módulo</h2>
            <p>
              Este é o ponto de entrada do portal. Acesse a área de pesquisas para ver
              as campanhas disponíveis e responder quando estiverem abertas.
            </p>
          </div>
          <div className="admin-home-hero-badge">
            <span>Entrada pública</span>
            <strong>Portal do colaborador</strong>
          </div>
        </section>

        <section className="admin-home-modules" aria-label="Módulos disponíveis">
          <Link className="admin-home-module module-blue" to="/pesquisas">
            <div className="admin-home-module-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v16H4z" />
                <path d="M8 8h8" />
                <path d="M8 12h8" />
                <path d="M8 16h5" />
              </svg>
            </div>
            <div className="admin-home-module-body">
              <span className="admin-home-module-kicker">Módulo</span>
              <h3>Pesquisas</h3>
              <p>
                Veja as pesquisas disponíveis, acompanhe a situação das campanhas e
                responda de forma rápida e anônima.
              </p>
            </div>
            <span className="admin-home-module-action">Acessar</span>
          </Link>

          <Link className="admin-home-module module-slate" to="/solicitacoes">
            <div className="admin-home-module-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6H4" />
                <path d="M20 12H4" />
                <path d="M20 18H4" />
                <path d="M8 6v12" />
              </svg>
            </div>
            <div className="admin-home-module-body">
              <span className="admin-home-module-kicker">Módulo</span>
              <h3>Solicitações</h3>
              <p>
                Acesse admissão, demissão e minhas solicitações em um único hub com o
                fluxo padronizado do RH.
              </p>
            </div>
            <span className="admin-home-module-action">Acessar</span>
          </Link>
        </section>
      </div>
    </main>
  )
}