import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { canCreateRequests } from '../utils/accessControl'

const REQUEST_ACTIONS = [
  {
    to: '/solicitacoes/admissao',
    className: 'requests-action-card admission',
    title: 'Requisitar vaga',
    description: 'Abrir pedido de contratação.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6" />
        <path d="M16 11h6" />
      </svg>
    ),
  },
  {
    to: '/solicitacoes/demissao',
    className: 'requests-action-card dismissal',
    title: 'Solicitar demissão',
    description: 'Iniciar pedido de desligamento.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 8V6a4 4 0 0 0-8 0v12a4 4 0 0 0 8 0v-2" />
        <path d="M10 12h11" />
        <path d="M17 8l4 4-4 4" />
      </svg>
    ),
  },
]

function getFirstName(name) {
  return name?.trim()?.split(' ')[0] ?? 'Supervisor'
}

export function RequestsPage() {
  const { user } = useAuth()
  const canOpenRequests = canCreateRequests(user)
  const firstName = getFirstName(user?.full_name)

  return (
    <main className="collab-shell requests-workspace-shell">
      <header className="collab-header">
        <div className="collab-header-inner requests-header-inner">
          <Link className="text-muted-link" to="/">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Início
          </Link>
          <span className="collab-brand" aria-label="Wasion" />
        </div>
      </header>

      <div className="collab-content requests-workspace">
        <section className="requests-hero" aria-labelledby="requests-title">
          <div className="requests-hero-copy">
            <span className="requests-eyebrow">Solicitações RH</span>
            <h1 id="requests-title">Olá, {firstName}.</h1>
            <p>
              Escolha o tipo de solicitação que precisa abrir.
            </p>
          </div>
        </section>

        <section className="requests-action-grid" aria-label="Solicitações disponíveis">
          <Link className="requests-action-card tracking" to="/my-requests">
            <span className="requests-action-icon" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 6h13" />
                <path d="M8 12h13" />
                <path d="M8 18h13" />
                <path d="M3 6h.01" />
                <path d="M3 12h.01" />
                <path d="M3 18h.01" />
              </svg>
            </span>
            <span className="requests-action-copy">
              <strong>Minhas solicitações</strong>
              <span>Acompanhar pedidos enviados.</span>
            </span>
          </Link>

          {canOpenRequests
            ? REQUEST_ACTIONS.map((action) => (
              <Link className={action.className} key={action.to} to={action.to}>
                <span className="requests-action-icon" aria-hidden="true">{action.icon}</span>

                <span className="requests-action-copy">
                  <strong>{action.title}</strong>
                  <span>{action.description}</span>
                </span>
              </Link>
            ))
            : null}
        </section>

        {!canOpenRequests ? (
          <p className="requests-access-note" aria-live="polite">
            Seu perfil atual permite apenas acompanhar solicitações.
          </p>
        ) : null}
      </div>
    </main>
  )
}
