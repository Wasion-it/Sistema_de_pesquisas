import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { hasAdminSectionAccess, hasModuleAccess, isApprovalOnlyUser } from '../utils/accessControl'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

const ADMIN_MODULES = [
  {
    title: 'Aprovações',
    description: 'Acompanhe e avance a fila de admissão e demissão.',
    to: '/admin/approvals',
    accent: 'blue',
    group: 'operation',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l4 4L19 6" />
      </svg>
    ),
  },
  {
    title: 'Admissão',
    description: 'Acesse a fila de solicitações de admissão.',
    to: '/admin/admission-requests',
    accent: 'amber',
    group: 'operation',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12H4" />
        <path d="M20 6H4" />
        <path d="M20 18H4" />
      </svg>
    ),
  },
  {
    title: 'Demissão',
    description: 'Acesse a fila de solicitações de demissão.',
    to: '/admin/dismissal-requests',
    accent: 'slate',
    group: 'operation',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12H4" />
        <path d="M20 6H4" />
        <path d="M20 18H4" />
      </svg>
    ),
  },
  {
    title: 'Pesquisas',
    description: 'Gerencie pesquisas, versões, campanhas e respostas do portal.',
    to: '/admin/surveys',
    accent: 'blue',
    group: 'management',
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
    title: 'Dashboard de pesquisas',
    description: 'Acompanhe indicadores e resultados das campanhas publicadas.',
    to: '/admin/dashboard/pesquisas',
    accent: 'blue',
    group: 'indicators',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13l4-4 4 4 6-6 4 4" />
        <path d="M21 7v6h-6" />
      </svg>
    ),
  },
  {
    title: 'KPIs de admissão',
    description: 'Acompanhe o tempo de fechamento das vagas por perfil de contratação.',
    to: '/admin/dashboard/admissao',
    accent: 'amber',
    group: 'indicators',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6v6l4 2" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    title: 'Departamentos',
    description: 'Mantenha os setores e a base de segmentação atualizados.',
    to: '/admin/departments',
    accent: 'slate',
    group: 'settings',
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
    title: 'Cargos',
    description: 'Cadastre os cargos com descrição para apoiar admissões e aprovações.',
    to: '/admin/job-titles',
    accent: 'amber',
    group: 'settings',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h10" />
      </svg>
    ),
  },
]

const MODULE_GROUPS = [
  {
    id: 'operation',
    title: 'Operação',
    description: 'Fluxos que o RH acompanha no dia a dia.',
  },
  {
    id: 'management',
    title: 'Gestão',
    description: 'Administração do portal e das campanhas.',
  },
  {
    id: 'indicators',
    title: 'Indicadores',
    description: 'Leituras gerenciais para acompanhamento de resultados.',
  },
  {
    id: 'settings',
    title: 'Cadastros',
    description: 'Bases de apoio para manter os fluxos consistentes.',
  },
]

function canAccessModule(user, module) {
  if (module.to.startsWith('/admin/dashboard/pesquisas')) return hasModuleAccess(user, 'SURVEYS')
  if (module.to.startsWith('/admin/dashboard/admissao')) return hasModuleAccess(user, 'DASHBOARD')
  if (module.to.startsWith('/admin/departments')) return hasAdminSectionAccess(user, 'DEPARTMENTS')
  if (module.to.startsWith('/admin/job-titles')) return hasAdminSectionAccess(user, 'JOB_TITLES')
  if (module.to.startsWith('/admin/admission-requests')) return hasModuleAccess(user, 'ADMISSION')
  if (module.to.startsWith('/admin/dismissal-requests')) return hasModuleAccess(user, 'DISMISSAL')
  if (module.to.startsWith('/admin/approvals')) return hasModuleAccess(user, 'APPROVALS')
  if (module.to.startsWith('/admin/surveys') || module.to.startsWith('/admin/campaigns')) return hasModuleAccess(user, 'SURVEYS')
  return false
}

export function AdminHomePage() {
  const { user } = useAuth()
  const isApprovalOnlyRole = isApprovalOnlyUser(user)

  if (isApprovalOnlyRole) {
    return <Navigate replace to="/admin/approvals" />
  }

  const visibleModules = ADMIN_MODULES.filter((module) => canAccessModule(user, module))

  return (
    <div className="admin-view admin-home-view">
      <section className="admin-home-hero">
        <div className="admin-home-hero-copy">
          <span className="admin-home-eyebrow">Portal do RH</span>
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

      <div className="admin-home-sections">
        {MODULE_GROUPS.map((group) => {
          const modules = visibleModules.filter((module) => module.group === group.id)
          if (modules.length === 0) return null

          return (
            <section className="admin-home-section" key={group.id}>
              <div className="admin-home-section-header">
                <div>
                  <span className="eyebrow">{group.title}</span>
                  <h3>{group.description}</h3>
                </div>
                <span className="admin-home-section-count">{modules.length}</span>
              </div>

              <div className="admin-home-modules" aria-label={`Módulos de ${group.title}`}>
                {modules.map((module) => (
                  <Link
                    className={`admin-home-module module-${module.accent}`}
                    key={module.title}
                    to={module.to}
                  >
                    <div className="admin-home-module-icon" aria-hidden="true">
                      {module.icon}
                    </div>

                    <div className="admin-home-module-body">
                      <span className="admin-home-module-kicker">Módulo</span>
                      <h4>{module.title}</h4>
                      <p>{module.description}</p>
                    </div>

                    <span className="admin-home-module-action">
                      Abrir
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14" />
                        <path d="M12 5l7 7-7 7" />
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
