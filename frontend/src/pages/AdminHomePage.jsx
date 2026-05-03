import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import {
  getAdminAdmissionRequests,
  getAdminApprovalQueue,
  getAdminDashboard,
  getAdminDismissalRequests,
} from '../services/admin'
import { hasModuleAccess, isApprovalOnlyUser } from '../utils/accessControl'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getFirstName(name) {
  return name?.trim()?.split(' ')[0] ?? 'Administrador'
}

function formatDateTime(value) {
  if (!value) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function isOpenRequest(request) {
  return !['FINALIZED', 'REJECTED', 'CANCELED', 'CANCELLED'].includes(request.status)
}

function getLatestDate(item) {
  return item.updated_at ?? item.submitted_at ?? item.created_at ?? item.finalized_at
}

function getRequestTitle(request, fallback) {
  return request.cargo ?? request.job_title_name ?? request.position_name ?? fallback
}

function MetricCard({ accent, label, value, detail, icon }) {
  return (
    <article className={`admin-overview-metric metric-${accent}`}>
      <div className="admin-overview-metric-top">
        <span>{label}</span>
        <span className="admin-overview-icon" aria-hidden="true">{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function EmptyOverview({ children }) {
  return <div className="admin-overview-empty">{children}</div>
}

export function AdminHomePage() {
  const { token, user } = useAuth()
  const [overview, setOverview] = useState({
    dashboard: null,
    admissions: [],
    dismissals: [],
    admissionApprovals: [],
    dismissalApprovals: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const isApprovalOnlyRole = isApprovalOnlyUser(user)

  const canAccessSurveys = hasModuleAccess(user, 'SURVEYS')
  const canAccessAdmissions = hasModuleAccess(user, 'ADMISSION')
  const canAccessDismissals = hasModuleAccess(user, 'DISMISSAL')
  const canAccessApprovals = hasModuleAccess(user, 'APPROVALS')
  const canAccessDashboard = hasModuleAccess(user, 'DASHBOARD')

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setErrorMessage('')

    const loaders = [
      canAccessSurveys || canAccessDashboard
        ? getAdminDashboard(token).then((data) => ['dashboard', data])
        : Promise.resolve(['dashboard', null]),
      canAccessAdmissions
        ? getAdminAdmissionRequests(token).then((data) => ['admissions', data.items ?? []])
        : Promise.resolve(['admissions', []]),
      canAccessDismissals
        ? getAdminDismissalRequests(token).then((data) => ['dismissals', data.items ?? []])
        : Promise.resolve(['dismissals', []]),
      canAccessApprovals
        ? getAdminApprovalQueue(token, 'admission').then((data) => ['admissionApprovals', data.items ?? []])
        : Promise.resolve(['admissionApprovals', []]),
      canAccessApprovals
        ? getAdminApprovalQueue(token, 'dismissal').then((data) => ['dismissalApprovals', data.items ?? []])
        : Promise.resolve(['dismissalApprovals', []]),
    ]

    Promise.allSettled(loaders)
      .then((results) => {
        if (!isMounted) return

        const next = {
          dashboard: null,
          admissions: [],
          dismissals: [],
          admissionApprovals: [],
          dismissalApprovals: [],
        }
        const failures = []

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const [key, value] = result.value
            next[key] = value
          } else {
            failures.push(result.reason?.message ?? 'Nao foi possivel carregar um indicador.')
          }
        })

        setOverview(next)
        if (failures.length > 0) {
          setErrorMessage(failures[0])
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [canAccessApprovals, canAccessAdmissions, canAccessDashboard, canAccessDismissals, canAccessSurveys, token])

  const summary = overview.dashboard?.summary
  const pendingApprovals = overview.admissionApprovals.length + overview.dismissalApprovals.length
  const openAdmissions = overview.admissions.filter(isOpenRequest).length
  const openDismissals = overview.dismissals.filter(isOpenRequest).length
  const activeCampaigns = summary?.active_campaigns ?? 0

  const recentActivity = useMemo(() => {
    const activities = [
      ...overview.admissions.map((request) => ({
        type: 'admission',
        title: `Admissao: ${getRequestTitle(request, 'solicitacao de vaga')}`,
        meta: request.requester_name ?? request.recruiter_user_name ?? 'Solicitacao de admissao',
        date: getLatestDate(request),
      })),
      ...overview.dismissals.map((request) => ({
        type: 'dismissal',
        title: `Demissao: ${request.employee_name ?? getRequestTitle(request, 'desligamento')}`,
        meta: request.requester_name ?? 'Solicitacao de demissao',
        date: getLatestDate(request),
      })),
      ...(overview.dashboard?.recent_surveys ?? []).map((survey) => ({
        type: 'survey',
        title: survey.name,
        meta: `${survey.active_campaigns ?? 0} campanha(s) ativa(s)`,
        date: survey.updated_at ?? survey.created_at,
      })),
    ]

    return activities
      .filter((activity) => activity.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
  }, [overview])

  const priorityActions = [
    pendingApprovals > 0 && canAccessApprovals
      ? {
        label: 'Aprovar pendencias',
        detail: `${pendingApprovals} item(ns) aguardando decisao`,
        to: '/admin/approvals',
        tone: 'blue',
      }
      : null,
    openAdmissions > 0 && canAccessAdmissions
      ? {
        label: 'Acompanhar admissoes',
        detail: `${openAdmissions} vaga(s) em andamento`,
        to: '/admin/admission-requests',
        tone: 'amber',
      }
      : null,
    openDismissals > 0 && canAccessDismissals
      ? {
        label: 'Acompanhar desligamentos',
        detail: `${openDismissals} processo(s) aberto(s)`,
        to: '/admin/dismissal-requests',
        tone: 'slate',
      }
      : null,
    canAccessSurveys && activeCampaigns === 0
      ? {
        label: 'Preparar campanha',
        detail: 'Nenhuma pesquisa ativa no momento',
        to: '/admin/surveys',
        tone: 'green',
      }
      : null,
  ].filter(Boolean)

  if (isApprovalOnlyRole) {
    return <Navigate replace to="/admin/approvals" />
  }

  return (
    <div className="admin-view admin-overview-view">
      <section className="admin-overview-header">
        <div>
          <span className="eyebrow">Inicio / Visao geral</span>
          <h2>{getGreeting()}, {getFirstName(user?.full_name)}</h2>
          <p>
            Um resumo operacional do portal para enxergar pendencias, movimento recente e
            pontos que precisam de atencao.
          </p>
        </div>
        <div className="admin-overview-today">
          <span>Hoje</span>
          <strong>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' }).format(new Date())}</strong>
        </div>
      </section>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

      <section className="admin-overview-metrics" aria-label="Resumo do portal">
        <MetricCard
          accent="blue"
          detail={pendingApprovals === 1 ? 'item aguardando aprovacao' : 'itens aguardando aprovacao'}
          icon="!"
          label="Aprovacoes pendentes"
          value={isLoading ? '...' : pendingApprovals}
        />
        <MetricCard
          accent="amber"
          detail="solicitacoes de admissao abertas"
          icon="+"
          label="Admissoes em andamento"
          value={isLoading ? '...' : openAdmissions}
        />
        <MetricCard
          accent="slate"
          detail="processos de desligamento abertos"
          icon="-"
          label="Desligamentos em andamento"
          value={isLoading ? '...' : openDismissals}
        />
        <MetricCard
          accent="green"
          detail={`${summary?.submitted_responses ?? 0} resposta(s) enviadas`}
          icon="~"
          label="Campanhas ativas"
          value={isLoading ? '...' : activeCampaigns}
        />
      </section>

      <div className="admin-overview-grid">
        <section className="admin-overview-panel admin-overview-focus">
          <div className="admin-overview-panel-header">
            <div>
              <h3>Atencao agora</h3>
              <p>Proximas acoes sugeridas a partir dos dados do portal.</p>
            </div>
          </div>

          {isLoading ? (
            <EmptyOverview>Carregando prioridades...</EmptyOverview>
          ) : priorityActions.length === 0 ? (
            <EmptyOverview>Nenhuma pendencia critica para o seu perfil.</EmptyOverview>
          ) : (
            <div className="admin-overview-actions">
              {priorityActions.map((action) => (
                <Link className={`admin-overview-action action-${action.tone}`} key={action.label} to={action.to}>
                  <span>
                    <strong>{action.label}</strong>
                    <small>{action.detail}</small>
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="admin-overview-panel">
          <div className="admin-overview-panel-header">
            <div>
              <h3>Atividade recente</h3>
              <p>Ultimas movimentacoes visiveis para o seu acesso.</p>
            </div>
          </div>

          {isLoading ? (
            <EmptyOverview>Carregando atividade...</EmptyOverview>
          ) : recentActivity.length === 0 ? (
            <EmptyOverview>Nenhuma atividade recente encontrada.</EmptyOverview>
          ) : (
            <div className="admin-overview-activity">
              {recentActivity.map((activity) => (
                <article className={`admin-overview-activity-item activity-${activity.type}`} key={`${activity.type}-${activity.title}-${activity.date}`}>
                  <span className="admin-overview-activity-dot" aria-hidden="true" />
                  <div>
                    <strong>{activity.title}</strong>
                    <span>{activity.meta}</span>
                  </div>
                  <time>{formatDateTime(activity.date)}</time>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="admin-overview-panel">
        <div className="admin-overview-panel-header">
          <div>
            <h3>Saude do portal</h3>
            <p>Leitura rapida dos principais fluxos administrativos.</p>
          </div>
        </div>

        <div className="admin-overview-health">
          <div>
            <span>Pesquisas publicadas</span>
            <strong>{isLoading ? '...' : (summary?.published_versions ?? 0)}</strong>
          </div>
          <div>
            <span>Pesquisas cadastradas</span>
            <strong>{isLoading ? '...' : (summary?.total_surveys ?? 0)}</strong>
          </div>
          <div>
            <span>Rascunhos de respostas</span>
            <strong>{isLoading ? '...' : (summary?.draft_responses ?? 0)}</strong>
          </div>
          <div>
            <span>Volume operacional</span>
            <strong>{isLoading ? '...' : overview.admissions.length + overview.dismissals.length}</strong>
          </div>
        </div>
      </section>
    </div>
  )
}
