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
    code: 'APV',
    mark: 'approval',
  },
  {
    title: 'Admissão',
    description: 'Acesse a fila de solicitações de admissão.',
    to: '/admin/admission-requests',
    accent: 'amber',
    group: 'operation',
    code: 'ADM',
    mark: 'admission',
  },
  {
    title: 'Demissão',
    description: 'Acesse a fila de solicitações de demissão.',
    to: '/admin/dismissal-requests',
    accent: 'slate',
    group: 'operation',
    code: 'DEM',
    mark: 'dismissal',
  },
  {
    title: 'Pesquisas',
    description: 'Gerencie pesquisas, versões, campanhas e respostas do portal.',
    to: '/admin/surveys',
    accent: 'blue',
    group: 'management',
    code: 'PESQ',
    mark: 'survey',
  },
  {
    title: 'Dashboard de pesquisas',
    description: 'Acompanhe indicadores e resultados das campanhas publicadas.',
    to: '/admin/dashboard/pesquisas',
    accent: 'blue',
    group: 'indicators',
    code: 'DASH',
    mark: 'trend',
  },
  {
    title: 'KPIs de admissão',
    description: 'Acompanhe o tempo de fechamento das vagas por perfil de contratação.',
    to: '/admin/dashboard/admissao',
    accent: 'amber',
    group: 'indicators',
    code: 'KPI',
    mark: 'kpi',
  },
  {
    title: 'Departamentos',
    description: 'Mantenha os setores e a base de segmentação atualizados.',
    to: '/admin/departments',
    accent: 'slate',
    group: 'settings',
    code: 'DEP',
    mark: 'department',
  },
  {
    title: 'Cargos',
    description: 'Cadastre os cargos com descrição para apoiar admissões e aprovações.',
    to: '/admin/job-titles',
    accent: 'amber',
    group: 'settings',
    code: 'CARGO',
    mark: 'role',
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

function ModuleMark({ mark }) {
  return (
    <span className={`admin-home-module-mark mark-${mark}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
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
                    <div className="admin-home-module-head">
                      <span className="admin-home-module-code">{module.code}</span>
                      <ModuleMark mark={module.mark} />
                    </div>

                    <div className="admin-home-module-body">
                      <span className="admin-home-module-kicker">{group.title}</span>
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
