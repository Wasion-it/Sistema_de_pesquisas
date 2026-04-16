import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <main className="collab-shell">
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

      <div className="collab-content">
        <section className="module-hero-card">
          <span className="eyebrow">Portal do colaborador</span>
          <h1>Escolha um módulo</h1>
          <p>
            Este é o ponto de entrada do portal. Acesse a área de pesquisas para ver
            as campanhas disponíveis e responder quando estiverem abertas.
          </p>
        </section>

        <section className="module-cards-grid" aria-label="Módulos disponíveis">
          <Link className="module-card" to="/pesquisas">
            <div className="module-card-icon" aria-hidden="true">
              <img alt="Logo da empresa" src="/logo-srh.svg" />
            </div>
            <div className="module-card-body">
              <span className="module-card-kicker">Módulo</span>
              <h2>Pesquisas</h2>
              <p>
                Veja as pesquisas disponíveis, acompanhe a situação das campanhas e
                responda de forma rápida e anônima.
              </p>
            </div>
            <span className="module-card-action">Acessar</span>
          </Link>

          <Link className="module-card" to="/solicitacoes">
            <div className="module-card-icon" aria-hidden="true">
              <img alt="Logo da empresa" src="/logo-srh.svg" />
            </div>
            <div className="module-card-body">
              <span className="module-card-kicker">Módulo</span>
              <h2>Solicitações</h2>
              <p>
                Acesse admissão, demissão e minhas solicitações em um único hub com o
                fluxo padronizado do RH.
              </p>
            </div>
            <span className="module-card-action">Acessar</span>
          </Link>
        </section>
      </div>
    </main>
  )
}