import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

const REQUEST_MODULES = [
  {
    title: 'Admissão',
    description: 'Acesse a fila de solicitações de admissão e o checklist do fluxo.',
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
    description: 'Organize e revise as etapas do checklist usado no fluxo de admissão.',
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
    description: 'Acesse a fila de solicitações de demissão e acompanhe os desligamentos.',
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
    title: 'Aprovações',
    description: 'Acompanhe a trilha de aprovação de admissões e demissões.',
    to: '/admin/approvals',
    accent: 'green',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l4 4L19 6" />
      </svg>
    ),
  },
  {
    title: 'Cargos',
    description: 'Gerencie os cargos disponíveis para apoiar os fluxos de RH.',
    to: '/admin/job-titles',
    accent: 'amber',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h10" />
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
          <h2>{getFirstName(user?.full_name)}, escolha o acesso</h2>
          <p>
            Esta é a página de entrada para os principais atalhos do painel administrativo. Use os cards abaixo para abrir solicitações, aprovações ou cadastros de apoio.
          </p>
        </div>
        <div className="admin-home-hero-badge">
          <span>Ponto de acesso</span>
          <strong>Atalhos do RH</strong>
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
