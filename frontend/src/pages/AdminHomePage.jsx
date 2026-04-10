import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

const ADMIN_MODULES = [
  {
    title: 'Pesquisas',
    description: 'Gerencie pesquisas, versões, campanhas e respostas do portal.',
    to: '/admin/surveys',
    accent: 'blue',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </svg>
    ),
  },
  {
    title: 'Departamentos',
    description: 'Mantenha os setores e a base de segmentação atualizados.',
    to: '/admin/departments',
    accent: 'slate',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 21h16" />
        <path d="M6 21V7l6-4 6 4v14" />
        <path d="M9 10h.01" />
        <path d="M15 10h.01" />
        <path d="M9 14h.01" />
        <path d="M15 14h.01" />
      </svg>
    ),
  },
  {
    title: 'Solicitações RH',
    description: 'Acesse os módulos de admissão e demissão já configurados.',
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
    title: 'Indicadores',
    description: 'Abra o painel com os números consolidados do sistema.',
    to: '/admin/dashboard',
    accent: 'green',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13l4-4 4 4 6-6 4 4" />
        <path d="M21 7v6h-6" />
      </svg>
    ),
  },
]

export function AdminHomePage() {
  const { user } = useAuth()

  return (
    <div className="admin-view admin-home-view">
      <section className="admin-home-hero">
        <div>
          <span className="eyebrow">Portal do RH</span>
          <h2>{getGreeting()}, {user?.full_name?.split(' ')[0] ?? 'Administrador'}</h2>
          <p>
            A home administrativa concentra os módulos principais do portal para que o RH
            entre direto no fluxo certo.
          </p>
        </div>
        <div className="admin-home-hero-badge">
          <span>Entrada administrativa</span>
          <strong>Operação RH</strong>
        </div>
      </section>

      <section className="admin-home-modules" aria-label="Módulos administrativos">
        {ADMIN_MODULES.map((module) => (
          <Link className={`admin-home-module module-${module.accent}`} key={module.title} to={module.to}>
            <div className="admin-home-module-icon" aria-hidden="true">
              {module.icon}
            </div>
            <div className="admin-home-module-body">
              <span className="admin-home-module-kicker">Módulo</span>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </div>
            <span className="admin-home-module-action">Abrir</span>
          </Link>
        ))}
      </section>
    </div>
  )
}