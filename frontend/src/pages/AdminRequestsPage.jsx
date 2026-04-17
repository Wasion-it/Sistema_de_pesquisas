import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

const REQUEST_MODULES = [
  {
    title: 'Admissão',
    description: 'Abra a fila de solicitações de admissão.',
    to: '/admin/admission-requests',
    accent: 'amber',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12H4" />
        <path d="M20 6H4" />
        <path d="M20 18H4" />
      </svg>
    ),
  },
  {
    title: 'Checklist de admissão',
    description: 'Revise as etapas do checklist usado no fluxo de admissão.',
    to: '/admin/admission-checklist',
    accent: 'green',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M5 4h2" />
        <path d="M5 12h2" />
        <path d="M5 20h2" />
        <path d="M11 4h8" />
        <path d="M11 12h8" />
        <path d="M11 20h8" />
      </svg>
    ),
  },
  {
    title: 'Demissão',
    description: 'Abra a fila de solicitações de demissão.',
    to: '/admin/dismissal-requests',
    accent: 'slate',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12H4" />
        <path d="M13 5l7 7-7 7" />
      </svg>
    ),
  },
  {
    title: 'KPIs de admissão',
    description: 'Consulte os indicadores de fechamento e leitura operacional.',
    to: '/admin/dashboard/admissao',
    accent: 'blue',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6v6l4 2" />
        <circle cx="12" cy="12" r="9" />
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
          <h2>{getFirstName(user?.full_name)}, sua página padrão de solicitações</h2>
          <p>
            Use os cards abaixo para abrir as telas de admissão, demissão e indicadores relacionados.
          </p>
        </div>
        <div className="admin-home-hero-badge">
          <span>Entrada padrão</span>
          <strong>Atalhos de RH</strong>
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
