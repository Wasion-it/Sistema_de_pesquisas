import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { RequestDetailsModal } from '../components/RequestDetailsModal'
import { getMyRequests } from '../services/admin'

const REQUEST_KIND_TABS = {
  all: {
    label: 'Todas',
    title: 'Minhas solicitações',
    emptyText: 'Você ainda não enviou solicitações pelo portal.',
  },
  admission: {
    label: 'Admissão',
    title: 'Minhas solicitações de admissão',
    emptyText: 'Nenhuma solicitação de admissão encontrada.',
  },
  dismissal: {
    label: 'Demissão',
    title: 'Minhas solicitações de demissão',
    emptyText: 'Nenhuma solicitação de demissão encontrada.',
  },
}

const STATUS_META = {
  PENDING: { label: 'Pendente', className: 'inactive' },
  UNDER_REVIEW: { label: 'Em análise', className: 'active' },
  APPROVED: { label: 'Aprovada', className: 'active' },
  REJECTED: { label: 'Rejeitada', className: 'inactive' },
  CANCELED: { label: 'Cancelada', className: 'inactive' },
}

const REQUEST_KIND_LABELS = {
  ADMISSION: 'Admissão',
  DISMISSAL: 'Demissão',
}

const STEP_TRACKER_META = {
  APPROVED: {
    className: 'completed',
    title: 'Concluída',
  },
  PENDING: {
    className: 'current',
    title: 'Etapa atual',
  },
  REJECTED: {
    className: 'rejected',
    title: 'Rejeitada',
  },
  SKIPPED: {
    className: 'skipped',
    title: 'Ignorada',
  },
}

function formatDateTime(value) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function normalizeRequestKind(kind) {
  return String(kind ?? '').toLowerCase()
}

function getApprovalProgress(steps = []) {
  const total = steps.length
  const approved = steps.filter((step) => step.status === 'APPROVED').length
  const rejected = steps.some((step) => step.status === 'REJECTED')
  const currentStep = steps.find((step) => step.status === 'PENDING') ?? null
  const progress = total === 0 ? 0 : Math.round((approved / total) * 100)

  return {
    total,
    approved,
    rejected,
    currentStep,
    progress,
  }
}

function getStepDecisionSummary(step) {
  if (!step.decided_by_user_name && !step.decided_at) {
    return null
  }

  if (step.decided_by_user_name && step.decided_at) {
    return `Por ${step.decided_by_user_name} em ${formatDateTime(step.decided_at)}`
  }

  if (step.decided_by_user_name) {
    return `Por ${step.decided_by_user_name}`
  }

  return `Em ${formatDateTime(step.decided_at)}`
}

function ApprovalStepTracker({ steps }) {
  const { total, approved, rejected, currentStep, progress } = getApprovalProgress(steps)
  const currentStepOrder = currentStep?.step_order ?? null
  const progressLabel = rejected ? 'Fluxo interrompido' : currentStep ? `Etapa ${currentStep.step_order} de ${total}` : 'Fluxo concluído'

  return (
    <div className="approval-step-tracker">
      <div className="approval-step-tracker-header">
        <div>
          <span className="approval-step-tracker-label">Andamento do fluxo</span>
          <strong>{progressLabel}</strong>
        </div>
        <span className="approval-step-tracker-count">{approved}/{total} concluídas</span>
      </div>

      <div className="approval-step-tracker-bar" aria-hidden="true">
        <div className="approval-step-tracker-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="approval-step-tracker-list">
        {steps.map((step) => {
          const trackerMeta = STEP_TRACKER_META[step.status] ?? STEP_TRACKER_META.PENDING
          const isCurrent = step.status === 'PENDING' && step.step_order === currentStepOrder
          const decisionSummary = getStepDecisionSummary(step)

          return (
            <div className={`approval-step-node ${trackerMeta.className} ${isCurrent ? 'is-current' : ''}`} key={step.step_order}>
              <span className="approval-step-node-index">{step.step_order}</span>
              <div className="approval-step-node-content">
                <strong>{step.approver_label}</strong>
                <small>{trackerMeta.title}</small>
                {decisionSummary ? <small className="approval-step-node-detail">{decisionSummary}</small> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getCurrentStepLabel(item) {
  if (item.current_step_label) {
    return item.current_step_label
  }

  if (item.request_status === 'APPROVED' || item.request_status === 'REJECTED' || item.request_status === 'CANCELED') {
    return 'Concluída'
  }

  return 'Aguardando etapa'
}

export function MyRequestsPage() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)

  async function loadRequests() {
    setIsLoading(true)
    try {
      const data = await getMyRequests(token)
      setRequests(data.items ?? [])
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [token])

  const visibleRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filteredByKind = activeTab === 'all'
      ? requests
      : requests.filter((item) => normalizeRequestKind(item.request_kind) === activeTab)

    if (!normalizedQuery) {
      return filteredByKind
    }

    return filteredByKind.filter((item) => {
      const searchValues = [
        item.request_title,
        item.request_subtitle,
        item.request_status,
        REQUEST_KIND_LABELS[item.request_kind],
        item.workflow_name,
        item.current_step_label,
        item.requester_name,
        item.requester_email,
        item.steps?.map((step) => `${step.approver_label} ${step.status} ${step.comments ?? ''}`).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchValues.includes(normalizedQuery)
    })
  }, [activeTab, query, requests])

  const summary = useMemo(() => ({
    total: visibleRequests.length,
    pending: visibleRequests.filter((item) => item.request_status === 'PENDING').length,
    underReview: visibleRequests.filter((item) => item.request_status === 'UNDER_REVIEW').length,
    approved: visibleRequests.filter((item) => item.request_status === 'APPROVED').length,
    rejected: visibleRequests.filter((item) => item.request_status === 'REJECTED').length,
  }), [visibleRequests])

  const activeConfig = REQUEST_KIND_TABS[activeTab]

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Solicitações RH</span>
          <h2>{activeConfig.title}</h2>
          <p>
            Veja o andamento das solicitações que você abriu e acompanhe cada etapa da aprovação.
            {user?.full_name ? ` Você está logado como ${user.full_name}.` : ''}
          </p>
        </div>
        <Link className="secondary-link-button" to="/admin">
          Voltar ao início
        </Link>
      </div>

      <section className="admin-panel-card admin-request-tabs">
        <div className="admin-request-tabs-row">
          {Object.entries(REQUEST_KIND_TABS).map(([kind, config]) => {
            const kindRequests = kind === 'all'
              ? requests
              : requests.filter((item) => normalizeRequestKind(item.request_kind) === kind)

            return (
              <button
                key={kind}
                className={`admin-request-tab ${activeTab === kind ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab(kind)}
              >
                <span>{config.label}</span>
                <strong>{kindRequests.length}</strong>
              </button>
            )
          })}
        </div>
      </section>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

      <section className="dashboard-stats-grid">
        <article className="stat-card">
          <span>Total</span>
          <strong>{summary.total}</strong>
        </article>
        <article className="stat-card">
          <span>Pendentes</span>
          <strong>{summary.pending}</strong>
        </article>
        <article className="stat-card">
          <span>Em análise</span>
          <strong>{summary.underReview}</strong>
        </article>
        <article className="stat-card">
          <span>Aprovadas</span>
          <strong>{summary.approved}</strong>
        </article>
      </section>

      <section className="admin-toolbar-card">
        <label className="field-group">
          <span>Buscar solicitação</span>
          <input
            placeholder="Filtrar por título, status, fluxo ou etapa"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </section>

      <section className="admin-panel-card">
        {isLoading ? (
          <div className="empty-state">
            <strong>Carregando suas solicitações...</strong>
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma solicitação encontrada</strong>
            <span>{activeConfig.emptyText}</span>
          </div>
        ) : (
          <div className="approval-queue-grid">
            {visibleRequests.map((item) => {
              const statusMeta = STATUS_META[item.request_status] ?? STATUS_META.PENDING
              const requestKind = normalizeRequestKind(item.request_kind)
              const currentStepLabel = getCurrentStepLabel(item)

              return (
                <article className="approval-request-card" key={`${item.request_kind}-${item.request_id}`}>
                  <div className="approval-request-top">
                    <div>
                      <span className="approval-kind">{REQUEST_KIND_LABELS[item.request_kind] ?? item.request_kind}</span>
                      <h3>{item.request_title}</h3>
                      <p>{item.request_subtitle}</p>
                    </div>
                    <span className={`status-pill ${statusMeta.className}`}>{statusMeta.label}</span>
                  </div>

                  <div className="approval-request-meta">
                    <div>
                      <span>Tipo</span>
                      <strong>{REQUEST_KIND_TABS[requestKind]?.label ?? item.request_kind}</strong>
                      <small>Sua solicitação no portal</small>
                    </div>
                    <div>
                      <span>Fluxo</span>
                      <strong>{item.workflow_name}</strong>
                      <small>Etapa atual: {currentStepLabel}</small>
                    </div>
                    <div>
                      <span>Atualizado em</span>
                      <strong>{formatDateTime(item.updated_at)}</strong>
                      <small>Criado em {formatDateTime(item.created_at)}</small>
                    </div>
                  </div>

                  <ApprovalStepTracker steps={item.steps ?? []} />

                  <div className="approval-request-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => setSelectedRequest(item)}
                    >
                      Detalhes
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <RequestDetailsModal request={selectedRequest} token={token} onClose={() => setSelectedRequest(null)} />
    </div>
  )
}
