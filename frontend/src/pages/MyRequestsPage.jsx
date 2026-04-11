import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
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

const STEP_STATUS_LABELS = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  SKIPPED: 'Ignorado',
}

const STEP_STATUS_CLASS = {
  PENDING: 'inactive',
  APPROVED: 'active',
  REJECTED: 'inactive',
  SKIPPED: 'inactive',
}

const REQUEST_KIND_LABELS = {
  ADMISSION: 'Admissão',
  DISMISSAL: 'Demissão',
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
            placeholder="Filtrar por título, status, fluxo ou comentário"
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

                  <div className="approval-step-list">
                    {item.steps.map((step) => (
                      <div className="approval-step-item" key={`${item.request_id}-${step.step_order}`}>
                        <span className={`status-pill ${STEP_STATUS_CLASS[step.status] ?? 'inactive'}`}>
                          {STEP_STATUS_LABELS[step.status] ?? step.status}
                        </span>
                        <div>
                          <strong>{step.step_order}. {step.approver_label}</strong>
                          <small>{step.decided_by_user_name ? `Decidido por ${step.decided_by_user_name}` : 'Aguardando decisão'}</small>
                          <small>{step.decided_at ? formatDateTime(step.decided_at) : 'Sem data de decisão'}</small>
                          {step.comments ? <small>{step.comments}</small> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
