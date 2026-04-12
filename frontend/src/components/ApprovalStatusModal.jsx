import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../auth/AuthProvider'
import { getAdminAdmissionApprovalStatus, getAdminDismissalApprovalStatus } from '../services/admin'

function formatDateTime(value) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

const STATUS_LABELS = {
  PENDING: 'Pendente',
  UNDER_REVIEW: 'Em análise',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  CANCELED: 'Cancelada',
}

const REQUEST_KIND_LABELS = {
  ADMISSION: 'Admissão',
  DISMISSAL: 'Demissão',
}

const REQUEST_KIND_TO_FETCHER = {
  admission: getAdminAdmissionApprovalStatus,
  dismissal: getAdminDismissalApprovalStatus,
}

const ROLE_TO_APPROVAL_ROLES = {
  GESTOR: new Set(['MANAGER', 'DIRECTOR_RAVI']),
  DIRETOR_RAVI: new Set(['MANAGER', 'DIRECTOR_RAVI']),
  RH_ADMIN: new Set(['RH_MANAGER']),
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

function normalizeRequestKind(kind) {
  return String(kind ?? '').toLowerCase()
}

function getBannerMeta(status) {
  switch (status) {
    case 'APPROVED':
      return {
        className: 'success',
        title: 'Aprovada',
        description: 'A solicitação está liberada. O RH já pode iniciar o fluxo operacional.',
      }
    case 'UNDER_REVIEW':
      return {
        className: 'warning',
        title: 'Em análise',
        description: 'Ainda existem etapas pendentes. O RH não deve iniciar o processo.',
      }
    case 'PENDING':
      return {
        className: 'warning',
        title: 'Pendente',
        description: 'A solicitação ainda aguarda aprovação antes de seguir para o RH.',
      }
    case 'REJECTED':
      return {
        className: 'danger',
        title: 'Rejeitada',
        description: 'A solicitação foi bloqueada. O RH não deve prosseguir com o processo.',
      }
    default:
      return {
        className: 'neutral',
        title: status ?? 'Sem status',
        description: 'Status de aprovação não identificado.',
      }
  }
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

function getActionableStep(steps, userRole) {
  const allowedApprovalRoles = ROLE_TO_APPROVAL_ROLES[userRole] ?? new Set()
  const orderedPendingSteps = steps.filter((step) => step.status === 'PENDING')

  if (allowedApprovalRoles.size === 0 || orderedPendingSteps.length === 0) {
    return null
  }

  if (userRole === 'RH_ADMIN') {
    return orderedPendingSteps.find((step) => step.approver_role === 'RH_MANAGER') ?? null
  }

  return orderedPendingSteps.find((step) => allowedApprovalRoles.has(step.approver_role)) ?? null
}

function ApprovalStepTracker({ steps }) {
  const { total, approved, rejected, currentStep, progress } = getApprovalProgress(steps)
  const currentStepOrder = currentStep?.step_order ?? null
  const progressLabel = rejected ? 'Fluxo interrompido' : currentStep ? `Etapa ${currentStep.step_order} de ${total}` : 'Fluxo concluído'

  return (
    <div className="approval-step-tracker approval-step-tracker-modal">
      <div className="approval-step-tracker-header">
        <div>
          <span className="approval-step-tracker-label">Visão do fluxo</span>
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

function DetailField({ label, value }) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function ApprovalStatusModal({ request, token, onClose }) {
  const { user } = useAuth()
  const [detail, setDetail] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const requestKind = useMemo(() => normalizeRequestKind(request?.request_kind), [request])
  const fetchDetail = REQUEST_KIND_TO_FETCHER[requestKind]

  useEffect(() => {
    let isMounted = true

    if (!request || !fetchDetail || !token) {
      setDetail(null)
      setErrorMessage('')
      setIsLoading(false)
      return undefined
    }

    setIsLoading(true)
    setErrorMessage('')
    fetchDetail(token, request.request_id)
      .then((data) => {
        if (isMounted) {
          setDetail(data)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [fetchDetail, request, token])

  if (!request) {
    return null
  }

  const fullRequest = detail ?? request
  const status = fullRequest.request_status ?? request.status
  const statusLabel = STATUS_LABELS[status] ?? status
  const bannerMeta = getBannerMeta(status)
  const requestKindLabel = REQUEST_KIND_LABELS[fullRequest.request_kind] ?? fullRequest.request_kind
  const actionableStep = getActionableStep(fullRequest.steps ?? [], user?.role)
  const actionableStepLabel = actionableStep?.approver_label ?? fullRequest.current_step_label ?? 'Concluída'
  const actionableStepNote = actionableStep && user?.role === 'RH_ADMIN'
    ? 'Você pode aprovar essa solicitação diretamente na etapa final do RH.'
    : null

  return (
    <div className="request-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="request-modal" role="dialog" aria-modal="true" aria-labelledby="approval-status-title" onClick={(event) => event.stopPropagation()}>
        <div className="request-modal-header">
          <div>
            <span className="eyebrow">Status de aprovação</span>
            <h3 id="approval-status-title">{fullRequest.request_title}</h3>
            <p>{fullRequest.request_subtitle}</p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>

        {isLoading ? (
          <div className="empty-state">
            <strong>Carregando status de aprovação...</strong>
          </div>
        ) : null}

        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

        {!isLoading ? (
          <>
            <div className={`approval-status-banner ${bannerMeta.className}`}>
              <strong>{bannerMeta.title}</strong>
              <span>{bannerMeta.description}</span>
            </div>

            <ApprovalStepTracker steps={fullRequest.steps ?? []} />

            {actionableStep ? (
              <div className="request-note-box">
                <strong>Etapa acionável</strong>
                <p>
                  {actionableStepLabel}
                  {actionableStepNote ? ` · ${actionableStepNote}` : ''}
                </p>
              </div>
            ) : null}

            <div className="request-modal-meta">
              <DetailField label="Tipo" value={requestKindLabel} />
              <DetailField label="Status" value={statusLabel} />
              <DetailField label="Fluxo" value={fullRequest.workflow_name} />
              <DetailField label="Solicitante" value={fullRequest.requester_name} />
              <DetailField label="Etapa atual" value={fullRequest.current_step_label ?? 'Concluída'} />
              <div>
                <span>Atualização</span>
                <strong>{formatDateTime(fullRequest.updated_at)}</strong>
                <small>Criado em {formatDateTime(fullRequest.created_at)}</small>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
