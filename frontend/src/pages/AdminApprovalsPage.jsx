import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
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

const APPROVAL_ROLE_LABELS = {
  MANAGER: 'Gerente',
  DIRECTOR_RAVI: 'Diretor Ravi',
  RH_MANAGER: 'Gerente de RH',
}

const ROLE_TO_APPROVAL_ROLE = {
  GESTOR: 'MANAGER',
  DIRETOR_RAVI: 'DIRECTOR_RAVI',
  RH_ADMIN: 'RH_MANAGER',
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

export function AdminApprovalsPage() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('admission')
  const [queuesByKind, setQueuesByKind] = useState({ admission: [], dismissal: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessages, setErrorMessages] = useState({ admission: '', dismissal: '' })
  const [actionState, setActionState] = useState({ kind: '', requestId: null, action: '' })
  const [approvalComments, setApprovalComments] = useState({ admission: {}, dismissal: {} })

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

  const summary = useMemo(() => {
    return {
      total: activeQueue.length,
      pending: activeQueue.filter((item) => item.request_status === 'PENDING').length,
      underReview: activeQueue.filter((item) => item.request_status === 'UNDER_REVIEW').length,
    }
  }, [activeQueue])

  const currentApprovalRole = ROLE_TO_APPROVAL_ROLE[user?.role] ?? null

  function canActOnItem(item) {
    return Boolean(item.current_step_role && currentApprovalRole === item.current_step_role)
  }

  function updateApprovalComment(kind, requestId, value) {
    setApprovalComments((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        [requestId]: value,
      },
    }))
  }

  async function handleAction(kind, requestId, action) {
    const normalizedKind = normalizeRequestKind(kind)
    const comments = approvalComments[normalizedKind]?.[requestId]?.trim() || ''
    setActionState({ kind: normalizedKind, requestId, action })
    try {
      if (action === 'approve') {
        await approveAdminApprovalRequest(token, normalizedKind, requestId, { comments })
      } else {
        await rejectAdminApprovalRequest(token, normalizedKind, requestId, { comments })
      }
      setApprovalComments((current) => ({
        ...current,
        [normalizedKind]: {
          ...current[normalizedKind],
          [requestId]: '',
        },
      }))
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
                  <span className={`status-pill ${item.request_status === 'UNDER_REVIEW' ? 'active' : 'inactive'}`}>
                    {item.request_status === 'UNDER_REVIEW' ? 'Em análise' : 'Pendente'}
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

                <div className="approval-step-list">
                  {item.steps.map((step) => (
                    <div className="approval-step-item" key={`${item.request_id}-${step.step_order}`}>
                      <span className={`status-pill ${STEP_STATUS_CLASS[step.status] ?? 'inactive'}`}>
                        {STEP_STATUS_LABELS[step.status] ?? step.status}
                      </span>
                      <div>
                        <strong>{step.step_order}. {step.approver_label}</strong>
                        <small>{APPROVAL_ROLE_LABELS[step.approver_role] ?? step.approver_role}</small>
                        {step.decided_by_user_name || step.decided_at || step.comments ? (
                          <small>
                            {step.decided_by_user_name ? `Decidido por ${step.decided_by_user_name}` : 'Decisão registrada'}
                            {step.decided_at ? ` em ${formatDateTime(step.decided_at)}` : ''}
                            {step.comments ? ` • ${step.comments}` : ''}
                          </small>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="approval-request-actions">
                  {!canActOnItem(item) ? (
                    <div className="approval-locked-note">
                      Apenas {APPROVAL_ROLE_LABELS[item.current_step_role] ?? item.current_step_role ?? 'o próximo aprovador'} pode executar esta etapa.
                    </div>
                  ) : null}
                  {canActOnItem(item) ? (
                    <div className="field-group">
                      <label htmlFor={`approval-comments-${item.request_kind}-${item.request_id}`}>
                        Comentário da aprovação
                      </label>
                      <textarea
                        id={`approval-comments-${item.request_kind}-${item.request_id}`}
                        maxLength={2000}
                        placeholder="Descreva observações, justificativa ou orientações para a próxima etapa."
                        value={approvalComments[requestKind]?.[item.request_id] ?? ''}
                        onChange={(event) => updateApprovalComment(requestKind, item.request_id, event.target.value)}
                      />
                    </div>
                  ) : null}
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
    </div>
  )
}