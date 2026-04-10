import { Link } from 'react-router-dom'

export function RequestsPage() {
  return (
    <main className="collab-shell">
      <header className="collab-header">
        <div className="collab-header-inner">
          <Link className="text-muted-link" to="/">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Início
          </Link>
          <span className="collab-brand">RH Operacional</span>
        </div>
      </header>

      <div className="collab-content">
        <section className="module-hero-card compact">
          <span className="eyebrow">Solicitações RH</span>
          <h1>Admissão e demissão</h1>
          <p>
            Este módulo centralizará os fluxos de solicitação ligados à entrada e à
            saída de colaboradores.
          </p>
        </section>

        <section className="module-cards-grid" aria-label="Tipos de solicitação">
          <Link className="module-card" aria-label="Solicitação de admissão" to="/solicitacoes/admissao">
            <div className="module-card-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
                <path d="M12 11v6" />
                <path d="M9 14h6" />
              </svg>
            </div>
            <div className="module-card-body">
              <span className="module-card-kicker">Solicitação</span>
              <h2>Admissão</h2>
              <p>
                Cadastro de novas contratações, alinhamento de documentos e preparação
                do fluxo de entrada.
              </p>
            </div>
            <span className="module-card-action">Abrir formulário</span>
          </Link>

          <Link className="module-card" aria-label="Solicitação de demissão" to="/solicitacoes/demissao">
            <div className="module-card-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12H4" />
                <path d="M14 6l6 6-6 6" />
                <path d="M10 6v12" />
              </svg>
            </div>
            <div className="module-card-body">
              <span className="module-card-kicker">Solicitação</span>
              <h2>Demissão</h2>
              <p>
                Organização do processo de desligamento, validação das etapas e
                acompanhamento operacional.
              </p>
            </div>
            <span className="module-card-action">Abrir formulário</span>
          </Link>
        </section>
      </div>
    </main>
  )
}