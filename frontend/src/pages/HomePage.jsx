import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <main className="collab-shell">
      <header className="collab-header">
        <div className="collab-header-inner">
          <span className="collab-brand">Pesquisas RH</span>
          <a className="text-muted-link" href="/admin">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Acesso RH
          </a>
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16v16H4z" />
                <path d="M8 8h8" />
                <path d="M8 12h8" />
                <path d="M8 16h5" />
              </svg>
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

          <Link className="module-card" to="/admin/my-requests">
            <div className="module-card-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 6h13" />
                <path d="M8 12h13" />
                <path d="M8 18h13" />
                <path d="M3 6h.01" />
                <path d="M3 12h.01" />
                <path d="M3 18h.01" />
              </svg>
            </div>
            <div className="module-card-body">
              <span className="module-card-kicker">Acompanhamento</span>
              <h2>Minhas solicitações</h2>
              <p>
                Consulte o status, a etapa atual e o histórico das solicitações que você já enviou.
              </p>
            </div>
            <span className="module-card-action">Acessar</span>
          </Link>

          <Link className="module-card" to="/solicitacoes">
            <div className="module-card-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6H4" />
                <path d="M20 12H4" />
                <path d="M20 18H4" />
                <path d="M8 6v12" />
              </svg>
            </div>
            <div className="module-card-body">
              <span className="module-card-kicker">Módulo</span>
              <h2>Solicitação de admissão ou demissão</h2>
              <p>
                Registre e acompanhe solicitações de entrada ou saída de colaboradores
                com o fluxo padronizado do RH.
              </p>
            </div>
            <span className="module-card-action">Acessar</span>
          </Link>
        </section>
      </div>
    </main>
  )
}