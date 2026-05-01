import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { RequestDetailsModal } from '../components/RequestDetailsModal'
import { approveAdminApprovalRequest, getAdminApprovalHistory, getAdminApprovalQueue, getAdminRecruiters, rejectAdminApprovalRequest } from '../services/admin'
import { formatApprovalLabel } from '../utils/approvalLabels'

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

const APPROVAL_VIEW_MODES = {
  pending: {
    label: 'Pendentes',
    titlePrefix: 'Fila de aprovação',
  },
  history: {
    label: 'Meu histórico',
    titlePrefix: 'Histórico de aprovações',
    emptyText: 'Você ainda não aprovou solicitações deste tipo.',
  },
}

const APPROVAL_ROLE_LABELS = {
  MANAGER: 'Gerente',
  DIRECTOR_RAVI: 'General Manager',
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
  GESTOR: new Set(['MANAGER']),
  DIRETOR_RAVI: new Set(['DIRECTOR_RAVI']),
  RH_ADMIN: new Set(['RH_MANAGER']),
}

function formatDateTime(value) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

const SALARY_REQUIRED_POSITIONS = new Set(['PUBLIC_ADMINISTRATIVE', 'PUBLIC_LEADERSHIP'])

function formatCurrency(value, currency = 'BRL') {
  if (value === null || value === undefined || value === '') return 'Não informado'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(Number(value))
}

function normalizeRequestKind(kind) {
  return String(kind ?? '').toLowerCase()
}

function requiresVacancySalary(request) {
  return normalizeRequestKind(request?.request_kind) === 'admission' && SALARY_REQUIRED_POSITIONS.has(request?.posicao_vaga)
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
                <strong>{formatApprovalLabel(step.approver_label)}</strong>
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

function RecruiterApprovalModal({
  request,
  recruiterOptions,
  selectedRecruiterId,
  vacancySalary,
  onChangeRecruiterId,
  onChangeVacancySalary,
  onClose,
  onConfirm,
  isLoading,
  isSubmitting,
  errorMessage,
}) {
  if (!request) {
    return null
  }

  const requestKind = normalizeRequestKind(request.request_kind)
  const isAdmission = requestKind === 'admission'
  const assigneeLabel = isAdmission ? 'recrutador' : 'analista de RH'
  const assigneeTitle = isAdmission ? 'Selecionar recrutador' : 'Selecionar analista de RH'
  const assigneeSectionTitle = isAdmission ? 'Recrutador responsável' : 'Analista de RH responsável'
  const shouldRequestSalary = requiresVacancySalary(request)

  return (
    <div className="request-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="request-modal" role="dialog" aria-modal="true" aria-labelledby="recruiter-approval-title" onClick={(event) => event.stopPropagation()}>
        <div className="request-modal-header">
          <div>
            <span className="eyebrow">Aprovação com {assigneeLabel}</span>
            <h3 id="recruiter-approval-title">{assigneeTitle}</h3>
            <p>{request.request_title}</p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="request-modal-section">
          <div className="request-modal-section-header">
            <h4>{assigneeSectionTitle}</h4>
            <span>{formatApprovalLabel(request.current_step_label) ?? 'Gerente de RH'}</span>
          </div>

          {isLoading ? (
            <div className="empty-state compact">
              <strong>Carregando recrutadores...</strong>
            </div>
          ) : null}

          {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

          {!isLoading ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <label className="field-group">
                <span>Selecione o {assigneeLabel}</span>
                <select value={selectedRecruiterId} onChange={(event) => onChangeRecruiterId(event.target.value)}>
                  <option value="">Selecione</option>
                  {recruiterOptions.map((recruiter) => (
                    <option key={recruiter.id} value={recruiter.id}>
                      {recruiter.full_name} • {recruiter.email}
                    </option>
                  ))}
                </select>
              </label>

              {shouldRequestSalary ? (
                <label className="field-group">
                  <span>Salário da vaga</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Ex: 3500,00"
                    value={vacancySalary}
                    onChange={(event) => onChangeVacancySalary(event.target.value)}
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          <p className="request-modal-helper-text">
            {isAdmission
              ? shouldRequestSalary
                ? 'A solicitação só será aprovada quando um recrutador ativo e o salário da vaga forem informados.'
                : 'A solicitação só será aprovada quando um recrutador ativo for vinculado.'
              : 'A solicitação só será aprovada quando um analista de RH ativo for vinculado.'}
          </p>

          <div className="request-modal-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting || !selectedRecruiterId || (shouldRequestSalary && !vacancySalary) || isLoading}
            >
              {isSubmitting ? 'Aprovando...' : 'Confirmar aprovação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminApprovalsPage() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('admission')
  const [activeViewMode, setActiveViewMode] = useState('pending')
  const [queuesByKind, setQueuesByKind] = useState({ admission: [], dismissal: [] })
  const [historiesByKind, setHistoriesByKind] = useState({ admission: [], dismissal: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [errorMessages, setErrorMessages] = useState({ admission: '', dismissal: '' })
  const [actionState, setActionState] = useState({ kind: '', requestId: null, action: '' })
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [recruiterApprovalRequest, setRecruiterApprovalRequest] = useState(null)
  const [recruiterOptions, setRecruiterOptions] = useState([])
  const [isLoadingRecruiters, setIsLoadingRecruiters] = useState(false)
  const [selectedRecruiterId, setSelectedRecruiterId] = useState('')
  const [vacancySalary, setVacancySalary] = useState('')
  const [recruiterErrorMessage, setRecruiterErrorMessage] = useState('')

  async function loadQueues() {
    setIsLoading(true)
    try {
      const [admissionResult, dismissalResult] = await Promise.allSettled([
        getAdminApprovalQueue(token, 'admission'),
        getAdminApprovalQueue(token, 'dismissal'),
      ])
      const [admissionHistoryResult, dismissalHistoryResult] = await Promise.allSettled([
        getAdminApprovalHistory(token, 'admission'),
        getAdminApprovalHistory(token, 'dismissal'),
      ])

      const nextQueues = { admission: [], dismissal: [] }
      const nextHistories = { admission: [], dismissal: [] }
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

      if (admissionHistoryResult.status === 'fulfilled') {
        nextHistories.admission = admissionHistoryResult.value.items ?? []
      } else {
        nextErrors.admission = nextErrors.admission || admissionHistoryResult.reason?.message || 'Erro ao carregar histórico de admissão.'
      }

      if (dismissalHistoryResult.status === 'fulfilled') {
        nextHistories.dismissal = dismissalHistoryResult.value.items ?? []
      } else {
        nextErrors.dismissal = nextErrors.dismissal || dismissalHistoryResult.reason?.message || 'Erro ao carregar histórico de demissão.'
      }

      setQueuesByKind(nextQueues)
      setHistoriesByKind(nextHistories)
      setErrorMessages(nextErrors)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadQueues()
  }, [token])

  useEffect(() => {
    let isMounted = true

    if (!recruiterApprovalRequest || !token) {
      setRecruiterOptions([])
      setIsLoadingRecruiters(false)
      setRecruiterErrorMessage('')
      return undefined
    }

    setIsLoadingRecruiters(true)
    setRecruiterErrorMessage('')
    getAdminRecruiters(token)
      .then((data) => {
        if (isMounted) {
          setRecruiterOptions(data.items ?? [])
        }
      })
      .catch((error) => {
        if (isMounted) {
          setRecruiterErrorMessage(error.message)
          setRecruiterOptions([])
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingRecruiters(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [recruiterApprovalRequest, token])

  const activeConfig = REQUEST_KIND_TABS[activeTab]
  const activeViewConfig = APPROVAL_VIEW_MODES[activeViewMode]
  const activeQueue = activeViewMode === 'history' ? historiesByKind[activeTab] : queuesByKind[activeTab]
  const activeQueueStatusKey = activeTab === 'admission' ? 'PENDING' : 'UNDER_REVIEW'

  const visibleQueue = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return activeQueue

    return activeQueue.filter((item) => {
      const haystack = [
        item.request_title,
        item.request_subtitle,
        item.request_status,
        item.request_kind,
        item.workflow_name,
        formatApprovalLabel(item.current_step_label),
        item.requester_name,
        item.requester_email,
        ...(item.steps ?? []).map((step) => `${formatApprovalLabel(step.approver_label)} ${step.status}`),
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [activeQueue, query])

  const summary = useMemo(() => {
    return {
      total: visibleQueue.length,
      pending: visibleQueue.filter((item) => item.request_status === 'PENDING').length,
      underReview: visibleQueue.filter((item) => item.request_status === activeQueueStatusKey).length,
      approved: visibleQueue.filter((item) => item.request_status === 'APPROVED').length,
    }
  }, [activeQueueStatusKey, visibleQueue])

  const allowedApprovalRoles = ROLE_TO_APPROVAL_ROLES[user?.role] ?? new Set()

  function getUserApprovedStep(item) {
    return item.steps?.find((step) => step.status === 'APPROVED' && step.decided_by_user_id === user?.id) ?? null
  }

  function canActOnItem(item) {
    if (activeViewMode === 'history') return false
    return Boolean(item.steps?.some((step) => step.status === 'PENDING' && allowedApprovalRoles.has(step.approver_role)))
  }

  function getActionableStep(item) {
    return item.steps?.find((step) => step.status === 'PENDING' && allowedApprovalRoles.has(step.approver_role)) ?? null
  }

  function getActionableStepLabel(item) {
    const actionableStep = getActionableStep(item)
    if (actionableStep) {
      return APPROVAL_ROLE_LABELS[actionableStep.approver_role] ?? actionableStep.approver_role
    }

    return APPROVAL_ROLE_LABELS[item.current_step_role] ?? item.current_step_role ?? 'o próximo aprovador'
  }

  function requiresRecruiterSelection(item) {
    const actionableStep = getActionableStep(item)
    return (
      user?.role === 'RH_ADMIN' &&
      actionableStep?.approver_role === 'RH_MANAGER' &&
      ['admission', 'dismissal'].includes(normalizeRequestKind(item.request_kind))
    )
  }

  function openApprovalConfirmation(item) {
    if (requiresRecruiterSelection(item)) {
      setRecruiterApprovalRequest(item)
      setSelectedRecruiterId('')
      setVacancySalary('')
      setRecruiterErrorMessage('')
      return
    }

    handleAction(item.request_kind, item.request_id, 'approve')
  }

  function closeRecruiterModal() {
    setRecruiterApprovalRequest(null)
    setSelectedRecruiterId('')
    setVacancySalary('')
    setRecruiterErrorMessage('')
  }

  async function confirmRecruiterApproval() {
    if (!recruiterApprovalRequest || !selectedRecruiterId) {
      setRecruiterErrorMessage('Selecione um recrutador para continuar.')
      return
    }

    const normalizedKind = normalizeRequestKind(recruiterApprovalRequest.request_kind)
    const shouldSendSalary = requiresVacancySalary(recruiterApprovalRequest)
    const normalizedSalary = String(vacancySalary).replace(',', '.')
    const parsedSalary = Number(normalizedSalary)
    if (shouldSendSalary && (!Number.isFinite(parsedSalary) || parsedSalary <= 0)) {
      setRecruiterErrorMessage('Informe um salário válido para a vaga.')
      return
    }

    setActionState({ kind: normalizedKind, requestId: recruiterApprovalRequest.request_id, action: 'approve' })
    setRecruiterErrorMessage('')

    try {
      await approveAdminApprovalRequest(token, normalizedKind, recruiterApprovalRequest.request_id, {
        recruiter_user_id: Number(selectedRecruiterId),
        ...(shouldSendSalary ? { vacancy_salary: parsedSalary } : {}),
      })
      setRecruiterApprovalRequest(null)
      setSelectedRecruiterId('')
      setVacancySalary('')
      await loadQueues()
    } catch (error) {
      setRecruiterErrorMessage(error.message)
    } finally {
      setActionState({ kind: '', requestId: null, action: '' })
    }
  }

  async function handleReject(kind, requestId) {
    const normalizedKind = normalizeRequestKind(kind)
    setActionState({ kind: normalizedKind, requestId, action: 'reject' })
    try {
      await rejectAdminApprovalRequest(token, normalizedKind, requestId, {})
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

  function handleTabChange(nextTab) {
    setActiveTab(nextTab)
    setQuery('')
  }

  function handleViewModeChange(nextMode) {
    setActiveViewMode(nextMode)
    setQuery('')
  }

  const firstName = user?.full_name?.split(' ')[0] ?? 'usuário'
  const pageTitle = activeViewMode === 'history'
    ? `${activeViewConfig.titlePrefix} de ${activeConfig.label.toLowerCase()}`
    : activeConfig.title

  return (
    <main className="page-shell" style={{ background: 'linear-gradient(150deg, var(--slate-50) 0%, var(--blue-50) 50%, #eef2ff 100%)' }}>
      <div className="admin-view admin-home-view" style={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingBottom: 8 }}>
          <div>
            <span className="eyebrow">Solicitações RH</span>
            <h2 style={{ margin: '4px 0 6px', fontSize: 'clamp(1.4rem, 2.2vw, 1.85rem)', letterSpacing: '-.02em' }}>{pageTitle}</h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              {firstName} · Acompanhe a trilha única de aprovação e avance cada solicitação por etapa.
            </p>
          </div>
          <Link className="secondary-link-button" to="/admin">← Voltar ao início</Link>
        </div>

        {errorMessages[activeTab] && (
          <div className="form-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errorMessages[activeTab]}
          </div>
        )}

        {!isLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            <article className="stat-card">
              <span>{activeViewMode === 'history' ? 'No histórico' : 'Total'}</span>
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
              <span>Aprovadas</span>
              <strong>{summary.approved}</strong>
            </article>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '16px 20px', borderRadius: 16, background: '#fff', border: '1px solid var(--slate-200)', boxShadow: '0 1px 3px rgba(15,23,42,.04)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(APPROVAL_VIEW_MODES).map(([mode, config]) => {
              const isActive = mode === activeViewMode
              const modeCount = mode === 'history'
                ? historiesByKind[activeTab].length
                : queuesByKind[activeTab].length

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleViewModeChange(mode)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 9,
                    padding: '11px 18px',
                    borderRadius: 12,
                    border: isActive ? '1.5px solid var(--blue-300)' : '1.5px solid var(--slate-200)',
                    background: isActive ? 'linear-gradient(180deg, var(--blue-50) 0%, #fff 100%)' : 'linear-gradient(180deg, #fff 0%, var(--slate-50) 100%)',
                    color: isActive ? 'var(--blue-800)' : 'var(--slate-600)',
                    fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 140ms',
                    boxShadow: isActive ? '0 4px 12px rgba(37,99,235,.1)' : 'none',
                  }}
                >
                  <span>{config.label}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 24, height: 24, padding: '0 7px',
                    borderRadius: 999,
                    background: isActive ? 'var(--blue-600)' : 'var(--slate-200)',
                    color: isActive ? '#fff' : 'var(--slate-600)',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {modeCount}
                  </span>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(REQUEST_KIND_TABS).map(([kind, config]) => {
              const isActive = kind === activeTab
              const tabCount = activeViewMode === 'history'
                ? historiesByKind[kind].length
                : queuesByKind[kind].length

              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => handleTabChange(kind)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 9,
                    padding: '11px 18px',
                    borderRadius: 12,
                    border: isActive ? '1.5px solid var(--blue-300)' : '1.5px solid var(--slate-200)',
                    background: isActive ? 'linear-gradient(180deg, var(--blue-50) 0%, #fff 100%)' : 'linear-gradient(180deg, #fff 0%, var(--slate-50) 100%)',
                    color: isActive ? 'var(--blue-800)' : 'var(--slate-600)',
                    fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 140ms',
                    boxShadow: isActive ? '0 4px 12px rgba(37,99,235,.1)' : 'none',
                  }}
                >
                  <span>{config.label}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 24, height: 24, padding: '0 7px',
                    borderRadius: 999,
                    background: isActive ? 'var(--blue-600)' : 'var(--slate-200)',
                    color: isActive ? '#fff' : 'var(--slate-600)',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {tabCount}
                  </span>
                </button>
              )
            })}
          </div>

          <div style={{ position: 'relative', minWidth: 260 }}>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Buscar por título, fluxo ou solicitante..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              style={{
                width: '100%',
                padding: '10px 36px 10px 38px',
                border: '1.5px solid var(--slate-200)',
                borderRadius: 10,
                background: 'var(--slate-50)',
                color: 'var(--slate-900)',
                fontSize: 13,
                outline: 'none',
                transition: 'border-color 140ms, box-shadow 140ms',
              }}
              onFocus={(event) => { event.target.style.borderColor = 'var(--blue-400)'; event.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,.08)'; event.target.style.background = '#fff' }}
              onBlur={(event) => { event.target.style.borderColor = 'var(--slate-200)'; event.target.style.boxShadow = 'none'; event.target.style.background = 'var(--slate-50)' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 20, height: 20, borderRadius: '50%',
                  border: 'none', background: 'var(--slate-200)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--slate-500)',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {!isLoading && visibleQueue.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--slate-400)', fontWeight: 600 }}>
              {visibleQueue.length} aprovação{visibleQueue.length === 1 ? '' : 'es'} encontrada{visibleQueue.length === 1 ? '' : 's'}
            </span>
            {query && (
              <span style={{
                padding: '3px 10px', borderRadius: 999,
                background: 'var(--blue-50)', color: 'var(--blue-700)',
                fontSize: 12, fontWeight: 600,
              }}>
                "{query}"
              </span>
            )}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, borderRadius: 20, background: '#fff', border: '1px solid var(--slate-200)' }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--blue-100)', borderTopColor: 'var(--blue-600)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 14, color: 'var(--slate-400)', fontWeight: 500 }}>Carregando aprovações…</p>
          </div>
        ) : visibleQueue.length === 0 ? (
          <div style={{ borderRadius: 20, background: '#fff', border: '1px solid var(--slate-200)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '72px 32px' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-300)', marginBottom: 4 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" />
                  <path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
                </svg>
              </div>
              <strong style={{ fontSize: 16, color: 'var(--slate-700)', fontWeight: 600 }}>Nenhuma aprovação encontrada</strong>
              <span style={{ fontSize: 14, color: 'var(--slate-400)', maxWidth: 300, lineHeight: 1.65 }}>
                {activeViewMode === 'history' ? activeViewConfig.emptyText : activeConfig.emptyText}
              </span>
              {query && (
                <button type="button" onClick={() => setQuery('')} className="secondary-button" style={{ marginTop: 8 }}>
                  Limpar busca
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {visibleQueue.map((item) => (
              <article className="approval-request-card" key={`${item.request_kind}-${item.request_id}`}>
                {(() => {
                  const requestKind = normalizeRequestKind(item.request_kind)
                  const approvedStep = getUserApprovedStep(item)
                  return (
                    <>
                      <div className="approval-request-top">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className="approval-kind">{REQUEST_KIND_TABS[requestKind]?.label ?? item.request_kind}</span>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: 5,
                              background: '#eef2ff',
                              color: '#3730a3',
                              fontSize: 11,
                              fontWeight: 700,
                            }}>
                              ID #{item.request_id}
                            </span>
                          </div>
                          <h3>{item.request_title}</h3>
                          <p>{item.request_subtitle}</p>
                        </div>
                        <span className={`status-pill ${item.request_status === activeQueueStatusKey ? 'active' : 'inactive'}`}>
                          {activeViewMode === 'history'
                            ? 'Aprovada por você'
                            : item.request_status === activeQueueStatusKey ? (activeTab === 'admission' ? 'Pendente' : 'Em análise') : 'Pendente'}
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
                          <small>Etapa atual: {formatApprovalLabel(item.current_step_label) ?? 'Concluída'}</small>
                        </div>
                        {requiresVacancySalary(item) ? (
                          <div>
                            <span>Salário da vaga</span>
                            <strong>{formatCurrency(item.vacancy_salary, item.vacancy_salary_currency ?? 'BRL')}</strong>
                            <small>Definido pelo Gerente de RH</small>
                          </div>
                        ) : null}
                        <div>
                          <span>{activeViewMode === 'history' ? 'Sua aprovação' : 'Atualizado em'}</span>
                          <strong>{formatDateTime(activeViewMode === 'history' ? approvedStep?.decided_at : item.updated_at)}</strong>
                          <small>Submetido em {formatDateTime(item.submitted_at)}</small>
                        </div>
                      </div>

                      <ApprovalStepTracker steps={item.steps} />

                      <div className="approval-request-actions">
                        {activeViewMode === 'history' ? (
                          <div className="approval-locked-note">
                            Etapa aprovada: {formatApprovalLabel(approvedStep?.approver_label) ?? 'aprovação registrada'}.
                          </div>
                        ) : !canActOnItem(item) ? (
                          <div className="approval-locked-note">
                            Apenas {getActionableStepLabel(item)} pode executar esta etapa.
                          </div>
                        ) : null}
                        <button className="secondary-button" type="button" onClick={() => setSelectedRequest(item)}>
                          Detalhes
                        </button>
                        {canActOnItem(item) ? (
                          <>
                            <button
                              className="primary-button"
                              disabled={actionState.kind === requestKind && actionState.requestId === item.request_id}
                              type="button"
                              onClick={() => openApprovalConfirmation(item)}
                            >
                              {actionState.kind === requestKind && actionState.requestId === item.request_id && actionState.action === 'approve'
                                ? 'Aprovando...'
                                : 'Aprovar etapa'}
                            </button>
                            <button
                              className="secondary-button"
                              disabled={actionState.kind === requestKind && actionState.requestId === item.request_id}
                              type="button"
                              onClick={() => handleReject(requestKind, item.request_id)}
                            >
                              {actionState.kind === requestKind && actionState.requestId === item.request_id && actionState.action === 'reject'
                                ? 'Rejeitando...'
                                : 'Rejeitar solicitação'}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </>
                  )
                })()}
              </article>
            ))}
          </div>
        )}

        <RequestDetailsModal request={selectedRequest} token={token} onClose={() => setSelectedRequest(null)} />
        <RecruiterApprovalModal
          request={recruiterApprovalRequest}
          recruiterOptions={recruiterOptions}
          selectedRecruiterId={selectedRecruiterId}
          vacancySalary={vacancySalary}
          onChangeRecruiterId={setSelectedRecruiterId}
          onChangeVacancySalary={setVacancySalary}
          onClose={closeRecruiterModal}
          onConfirm={confirmRecruiterApproval}
          isLoading={isLoadingRecruiters}
          isSubmitting={actionState.requestId === recruiterApprovalRequest?.request_id && actionState.action === 'approve'}
          errorMessage={recruiterErrorMessage}
        />
      </div>
    </main>
  )
}
