import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

const REQUEST_MODULES = [
  {
    title: 'Admissão',
    description: 'Abra a fila de solicitações de admissão.',
    to: '/admin/admission-requests',
    variant: 'primary',
    accent: 'amber',
    code: 'ADM',
    mark: 'admission',
  },
  {
    title: 'Checklist de admissão',
    description: 'Revise as etapas do checklist usado no fluxo de admissão.',
    to: '/admin/admission-checklist',
    variant: 'secondary',
    accent: 'green',
    code: 'CHK',
    mark: 'checklist',
  },




  {
    title: 'Demissão',
    description: 'Abra a fila de solicitações de demissão.',
    to: '/admin/dismissal-requests',
    variant: 'primary',
    accent: 'slate',
    code: 'DEM',
    mark: 'dismissal',
  },
  {
    title: 'Checklist de demissão',
    description: 'Revise e organize as etapas do checklist usado no fluxo de demissão.',
    to: '/admin/dismissal-checklist',
    variant: 'secondary',
    accent: 'green',
    code: 'CHK',
    mark: 'checklist',
  },
  {
    title: 'Departamentos',
    description: 'Cadastre e revise os departamentos usados nas admissões e aprovações.',
    to: '/admin/departments',
    variant: 'secondary',
    accent: 'slate',
    code: 'DEP',
    mark: 'department',
  },
  {
    title: 'Cargos',
    description: 'Cadastre e revise os cargos usados nas admissões e aprovações.',
    to: '/admin/job-titles',
    variant: 'secondary',
    accent: 'amber',
    code: 'CARGO',
    mark: 'role',
  },
  {
    title: 'KPIs de admissão',
    description: 'Consulte os indicadores de fechamento e leitura operacional.',
    to: '/admin/dashboard/admissao',
    variant: 'secondary',
    accent: 'blue',
    code: 'KPI',
    mark: 'kpi',
  },
]

function getFirstName(name) {
  return name?.split(' ')[0] ?? 'Administrador'
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

function ModuleAction({ className = '' }) {
  return (
    <span className={`admin-home-module-action ${className}`.trim()}>
      Abrir
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14" />
        <path d="M12 5l7 7-7 7" />
      </svg>
    </span>
  )
}

export function AdminRequestsPage() {
  const { user } = useAuth()
  const primaryModules = REQUEST_MODULES.filter((module) => module.variant === 'primary')
  const secondaryModules = REQUEST_MODULES.filter((module) => module.variant === 'secondary')

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
        {primaryModules.map((module) => (
          <Link className={`admin-home-module module-${module.accent}`} key={module.title} to={module.to}>
            <div className="admin-home-module-head">
              <span className="admin-home-module-code">{module.code}</span>
              <ModuleMark mark={module.mark} />
            </div>
            <div className="admin-home-module-body">
              <span className="admin-home-module-kicker">Solicitações</span>
              <h4>{module.title}</h4>
              <p>{module.description}</p>
            </div>
            <ModuleAction />
          </Link>
        ))}
      </section>

      <section className="admin-requests-secondary" aria-label="Configurações de RH">
        <div className="admin-requests-secondary-header">
          <span className="eyebrow">Configuração de RH</span>
          <p>
            Atalhos mais usados para manutenção e conferência da base administrativa.
          </p>
        </div>

        <div className="admin-home-modules admin-home-modules-secondary">
          {secondaryModules.map((module) => (
            <Link
              className={`admin-home-module admin-home-module--secondary module-${module.accent}`}
              key={module.title}
              to={module.to}
            >
              <div className="admin-home-module-head">
                <span className="admin-home-module-code">{module.code}</span>
                <ModuleMark mark={module.mark} />
              </div>
              <div className="admin-home-module-body">
                <span className="admin-home-module-kicker admin-home-module-kicker-secondary">Configuração</span>
                <h4>{module.title}</h4>
                <p>{module.description}</p>
              </div>
              <ModuleAction className="admin-home-module-action-secondary" />
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Retorno rápido" style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <Link className="secondary-link-button" to="/admin">
          ← Voltar ao início
        </Link>
      </section>
    </div>
  )
}
