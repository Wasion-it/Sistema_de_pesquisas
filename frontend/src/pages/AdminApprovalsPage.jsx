import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { RequestDetailsModal } from '../components/RequestDetailsModal'
import { approveAdminApprovalRequest, getAdminApprovalQueue, rejectAdminApprovalRequest } from '../services/admin'

const REQUEST_KIND_TABS = {
  admission: {
    label: 'Admissão',
    title: 'Fila de aprovação de admissão',
    emptyText: 'Não há solicitações de admissão aguardando aprovação.',
  },
  dismissal: {
    label: 'Demissão',
    title: 'Fila de aprovação de demissão',
    emptyText: 'Não há solicitações de demissão aguardando aprovação.',
  },
}

const APPROVAL_ROLE_LABELS = {
  MANAGER: 'Gerente',
  DIRECTOR_RAVI: 'Diretor Ravi',
  RH_MANAGER: 'Gerente de RH',
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

const ROLE_TO_APPROVAL_ROLES = {
  GESTOR: new Set(['MANAGER', 'DIRECTOR_RAVI']),
  DIRETOR_RAVI: new Set(['MANAGER', 'DIRECTOR_RAVI']),
  RH_ADMIN: new Set(['RH_MANAGER']),
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

export function AdminApprovalsPage() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('admission')
  const [queuesByKind, setQueuesByKind] = useState({ admission: [], dismissal: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessages, setErrorMessages] = useState({ admission: '', dismissal: '' })
  const [actionState, setActionState] = useState({ kind: '', requestId: null, action: '' })
  const [selectedRequest, setSelectedRequest] = useState(null)

  async function loadQueues() {
    setIsLoading(true)
    try {
      const [admissionResult, dismissalResult] = await Promise.allSettled([
        getAdminApprovalQueue(token, 'admission'),
        getAdminApprovalQueue(token, 'dismissal'),
      ])

      const nextQueues = { admission: [], dismissal: [] }
      const nextErrors = { admission: '', dismissal: '' }

      if (admissionResult.status === 'fulfilled') {
        nextQueues.admission = admissionResult.value.items ?? []
      } else {
        nextErrors.admission = admissionResult.reason?.message ?? 'Erro ao carregar aprovações de admissão.'
      }

      if (dismissalResult.status === 'fulfilled') {
        nextQueues.dismissal = dismissalResult.value.items ?? []
      } else {
        nextErrors.dismissal = dismissalResult.reason?.message ?? 'Erro ao carregar aprovações de demissão.'
      }

      setQueuesByKind(nextQueues)
      setErrorMessages(nextErrors)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadQueues()
  }, [token])

  const activeQueue = queuesByKind[activeTab]
  const activeConfig = REQUEST_KIND_TABS[activeTab]
  const activeQueueStatusKey = activeTab === 'admission' ? 'PENDING' : 'UNDER_REVIEW'

  const summary = useMemo(() => {
    return {
      total: activeQueue.length,
      pending: activeQueue.filter((item) => item.request_status === 'PENDING').length,
      underReview: activeQueue.filter((item) => item.request_status === activeQueueStatusKey).length,
    }
  }, [activeQueue, activeQueueStatusKey])

  const allowedApprovalRoles = ROLE_TO_APPROVAL_ROLES[user?.role] ?? new Set()

  function canActOnItem(item) {
    return Boolean(item.steps?.some((step) => step.status === 'PENDING' && allowedApprovalRoles.has(step.approver_role)))
  }

  function getActionableStepLabel(item) {
    const actionableStep = item.steps?.find((step) => step.status === 'PENDING' && allowedApprovalRoles.has(step.approver_role))
    if (actionableStep) {
      return APPROVAL_ROLE_LABELS[actionableStep.approver_role] ?? actionableStep.approver_role
    }

    return APPROVAL_ROLE_LABELS[item.current_step_role] ?? item.current_step_role ?? 'o próximo aprovador'
  }

  async function handleAction(kind, requestId, action) {
    const normalizedKind = normalizeRequestKind(kind)
    setActionState({ kind: normalizedKind, requestId, action })
    try {
      if (action === 'approve') {
        await approveAdminApprovalRequest(token, normalizedKind, requestId, {})
      } else {
        await rejectAdminApprovalRequest(token, normalizedKind, requestId, {})
      }
      await loadQueues()
    } catch (error) {
      setErrorMessages((current) => ({
        ...current,
        [kind]: error.message,
      }))
    } finally {
      setActionState({ kind: '', requestId: null, action: '' })
    }
  }

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Aprovações RH</span>
          <h2>{activeConfig.title}</h2>
          <p>Acompanhe a trilha única de aprovação e avance cada solicitação por etapa.</p>
        </div>
        <Link className="secondary-link-button" to="/admin">
          Voltar ao início
        </Link>
      </div>

      <section className="admin-panel-card admin-request-tabs">
        <div className="admin-request-tabs-row">
          {Object.entries(REQUEST_KIND_TABS).map(([kind, config]) => {
            const isActive = kind === activeTab
            return (
              <button
                key={kind}
                className={`admin-request-tab ${isActive ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab(kind)}
              >
                <span>{config.label}</span>
                <strong>{queuesByKind[kind].length}</strong>
              </button>
            )
          })}
        </div>
      </section>

      {errorMessages[activeTab] ? <div className="form-error">{errorMessages[activeTab]}</div> : null}

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
          <span>Em andamento</span>
          <strong>{summary.underReview}</strong>
        </article>
        <article className="stat-card">
          <span>Fila</span>
          <strong>{activeQueue.length}</strong>
        </article>
      </section>

      <section className="admin-panel-card">
        {isLoading ? (
          <div className="empty-state">
            <strong>Carregando aprovações...</strong>
          </div>
        ) : activeQueue.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma aprovação pendente</strong>
            <span>{activeConfig.emptyText}</span>
          </div>
        ) : (
          <div className="approval-queue-grid">
            {activeQueue.map((item) => (
              <article className="approval-request-card" key={`${item.request_kind}-${item.request_id}`}>
                {(() => {
                  const requestKind = normalizeRequestKind(item.request_kind)
                  return (
                    <>
                <div className="approval-request-top">
                  <div>
                    <span className="approval-kind">{REQUEST_KIND_TABS[requestKind]?.label ?? item.request_kind}</span>
                    <h3>{item.request_title}</h3>
                    <p>{item.request_subtitle}</p>
                  </div>
                  <span className={`status-pill ${item.request_status === activeQueueStatusKey ? 'active' : 'inactive'}`}>
                    {item.request_status === activeQueueStatusKey ? (activeTab === 'admission' ? 'Pendente' : 'Em análise') : 'Pendente'}
                  </span>
                </div>

                <div className="approval-request-meta">
                  <div>
                    <span>Solicitante</span>
                    <strong>{item.requester_name}</strong>
                    <small>{item.requester_email}</small>
                  </div>
                  <div>
                    <span>Fluxo</span>
                    <strong>{item.workflow_name}</strong>
                    <small>Etapa atual: {item.current_step_label ?? 'Concluída'}</small>
                  </div>
                  <div>
                    <span>Atualizado em</span>
                    <strong>{formatDateTime(item.created_at)}</strong>
                    <small>Submetido em {formatDateTime(item.submitted_at)}</small>
                  </div>
                </div>

                <ApprovalStepTracker steps={item.steps} />

                <div className="approval-request-actions">
                  {!canActOnItem(item) ? (
                    <div className="approval-locked-note">
                      Apenas {getActionableStepLabel(item)} pode executar esta etapa.
                    </div>
                  ) : null}
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setSelectedRequest(item)}
                  >
                    Detalhes
                  </button>
                  <button
                    className="primary-button"
                    disabled={actionState.kind === requestKind && actionState.requestId === item.request_id || !canActOnItem(item)}
                    type="button"
                    onClick={() => handleAction(requestKind, item.request_id, 'approve')}
                  >
                    {actionState.kind === requestKind && actionState.requestId === item.request_id && actionState.action === 'approve'
                      ? 'Aprovando...'
                      : 'Aprovar etapa'}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={actionState.kind === requestKind && actionState.requestId === item.request_id || !canActOnItem(item)}
                    type="button"
                    onClick={() => handleAction(requestKind, item.request_id, 'reject')}
                  >
                    {actionState.kind === requestKind && actionState.requestId === item.request_id && actionState.action === 'reject'
                      ? 'Rejeitando...'
                      : 'Rejeitar solicitação'}
                  </button>
                </div>
                    </>
                  )
                })()}
              </article>
            ))}
          </div>
        )}
      </section>

      <RequestDetailsModal request={selectedRequest} token={token} onClose={() => setSelectedRequest(null)} />
    </div>
  )
}