import { createPortal } from 'react-dom'

const STATUS_TO_STEP_INDEX = {
  PENDING: 0,
  UNDER_REVIEW: 1,
  APPROVED: 2,
  FINALIZED: 5,
  REJECTED: 5,
  CANCELED: 5,
}

const STATUS_LABELS = {
  PENDING: 'Pendente',
  UNDER_REVIEW: 'Em análise',
  APPROVED: 'Aprovada',
  FINALIZED: 'Finalizada',
  REJECTED: 'Rejeitada',
  CANCELED: 'Cancelada',
}

function formatSummary(request) {
  const hiredCount = request?.hired_employee_count ?? 0
  const totalPositions = request?.quantity_people ?? 0
  const remainingPositions = request?.remaining_positions ?? Math.max(totalPositions - hiredCount, 0)

  return `${hiredCount}/${totalPositions} contratados • ${remainingPositions} posição(ões) em aberto`
}

function getCurrentStepIndex(request, totalSteps) {
  const lastIndex = Math.max(totalSteps - 1, 0)
  const status = String(request?.status ?? 'PENDING').toUpperCase()

  if (status === 'APPROVED') {
    const hiredCount = request?.hired_employee_count ?? 0
    const totalPositions = request?.quantity_people ?? 0

    if (hiredCount >= totalPositions && totalPositions > 0) {
      return lastIndex
    }

    return Math.min(3, lastIndex)
  }

  return Math.min(STATUS_TO_STEP_INDEX[status] ?? 0, lastIndex)
}

function getStepState(stepIndex, currentIndex) {
  if (stepIndex < currentIndex) return 'done'
  if (stepIndex === currentIndex) return 'current'
  return 'pending'
}

export function AdmissionChecklistModal({ request, steps = [], onClose }) {
  if (!request) {
    return null
  }

  const currentIndex = getCurrentStepIndex(request, steps.length)
  const statusKey = String(request.status ?? 'PENDING')
  const statusLabel = STATUS_LABELS[statusKey] ?? statusKey
  const hasSteps = steps.length > 0

  const modalContent = (
    <div className="request-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="request-modal" role="dialog" aria-modal="true" aria-labelledby="admission-checklist-title" onClick={(event) => event.stopPropagation()}>
        <div className="request-modal-header">
          <div>
            <span className="eyebrow">Checklist da admissão</span>
            <h3 id="admission-checklist-title">{request.cargo}</h3>
            <p>{request.setor} • {request.turno}</p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="approval-status-banner neutral">
          <strong>Etapa atual</strong>
          <span>{statusLabel} • {formatSummary(request)}</span>
        </div>

        <div className="request-modal-section">
          <div className="request-modal-section-header">
            <h4>Fluxo de acompanhamento</h4>
            <span>Checklist configurado pelo RH</span>
          </div>

          {hasSteps ? (
            <div className="admission-checklist-grid">
              {steps.map((step, index) => {
                const stepState = getStepState(index, currentIndex)

                return (
                  <article className={`admission-checklist-step ${stepState}`} key={step.id ?? `${step.step_order}-${step.title}`}>
                    <div className="admission-checklist-step-index">{step.step_order ?? index + 1}</div>
                    <div className="admission-checklist-step-content">
                      <strong>{step.title}</strong>
                      <span>{step.description || 'Sem descrição cadastrada.'}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ margin: 0 }}>
              <strong>Checklist sem passos cadastrados</strong>
              <span>Use a página de gerenciamento para adicionar os passos que o RH precisa seguir.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return modalContent
  }

  return createPortal(modalContent, document.body)
}