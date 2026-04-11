import { useEffect, useMemo, useState } from 'react'

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

const REQUEST_KIND_TO_FETCHER = {
  admission: getAdminAdmissionApprovalStatus,
  dismissal: getAdminDismissalApprovalStatus,
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

            <div className="request-modal-section">
              <div className="request-modal-section-header">
                <h4>Etapas de aprovação</h4>
                <span>{fullRequest.steps?.length ?? 0} etapa(s)</span>
              </div>
              <div className="request-modal-steps">
                {(fullRequest.steps ?? []).map((step) => (
                  <div className="request-modal-step" key={`${fullRequest.request_id}-${step.step_order}`}>
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
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
