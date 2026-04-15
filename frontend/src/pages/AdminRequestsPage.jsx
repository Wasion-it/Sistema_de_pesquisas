import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

const REQUEST_MODULES = [
  {
    title: 'Admissão',
    description: 'Acesse a fila de solicitações, checklist e demais etapas do fluxo de contratação.',
    to: '/admin/admission-requests',
    accent: 'amber',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6v12" />
        <path d="M6 12h12" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    title: 'Demissão',
    description: 'Abra a fila de desligamentos para acompanhar status e decisões do processo.',
    to: '/admin/dismissal-requests',
    accent: 'slate',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h16" />
        <path d="M13 5l7 7-7 7" />
      </svg>
    ),
  },
]

function getFirstName(name) {
  return name?.split(' ')[0] ?? 'Administrador'
}

export function AdminRequestsPage() {
  const { user } = useAuth()

  return (
    <div className="admin-view admin-home-view">
      <section className="admin-home-hero">
        <div>
          <span className="eyebrow">Solicitações RH</span>
          <h2>{getFirstName(user?.full_name)}, escolha o fluxo</h2>
          <p>
            Esta é a página de entrada para as solicitações do painel administrativo. Use os cards abaixo para abrir admissão ou demissão.
          </p>
        </div>
        <div className="admin-home-hero-badge">
          <span>Ponto de acesso</span>
          <strong>Fluxos de RH</strong>
        </div>
      </section>

      <section className="admin-home-modules" aria-label="Atalhos de solicitações">
        {REQUEST_MODULES.map((module) => (
          <Link className={`admin-home-module module-${module.accent}`} key={module.title} to={module.to}>
            <div className="admin-home-module-icon" aria-hidden="true">
              {module.icon}
            </div>
            <div className="admin-home-module-body">
              <span className="admin-home-module-kicker">Solicitações</span>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </div>
            <span className="admin-home-module-action">Abrir</span>
          </Link>
        ))}
      </section>

      <section aria-label="Retorno rápido" style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <Link className="secondary-link-button" to="/admin">
          ← Voltar ao início
        </Link>
      </section>
    </div>
  )
}
