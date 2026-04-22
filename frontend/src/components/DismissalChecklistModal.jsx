import { useState } from 'react'
import { createPortal } from 'react-dom'

import { updateAdminDismissalChecklistProgress } from '../services/admin'

const STATUS_LABELS = {
  PENDING: 'Pendente',
  UNDER_REVIEW: 'Em análise',
  APPROVED: 'Aprovada',
  FINALIZED: 'Finalizada',
  REJECTED: 'Rejeitada',
  CANCELED: 'Cancelada',
}

const DISMISSAL_TYPE_LABELS = {
  JUST_CAUSE: 'Justa causa',
  RESIGNATION: 'Pedido de demissão',
  WITHOUT_JUST_CAUSE: 'Dispensa sem justa causa',
  TERM_CONTRACT: 'Término de contrato',
  CONSENSUAL: 'Demissão consensual',
}

function formatSummary(request) {
  const replacementLabel = request?.has_replacement ? 'com substituição' : 'sem substituição'
  const rehireLabel = request?.can_be_rehired ? 'recontratação permitida' : 'recontratação bloqueada'
  return `${replacementLabel} • ${rehireLabel}`
}

function getStepState(stepIndex, completedSteps, totalSteps) {
  if (completedSteps >= totalSteps) return 'done'
  if (stepIndex < completedSteps) return 'done'
  if (stepIndex === completedSteps) return 'current'
  return 'pending'
}

export function DismissalChecklistModal({ request, steps = [], token, onClose, onUpdated }) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [actionError, setActionError] = useState('')

  if (!request) {
    return null
  }

  const totalSteps = steps.length
  const completedSteps = Math.max(0, Math.min(request.checklist_completed_steps ?? 0, totalSteps))
  const statusKey = String(request.status ?? 'PENDING')
  const statusLabel = STATUS_LABELS[statusKey] ?? statusKey
  const hasSteps = steps.length > 0
  const progressLabel = totalSteps > 0 ? `${completedSteps}/${totalSteps} concluído(s)` : 'Sem passos configurados'

  async function handleUpdateProgress(nextCompletedSteps) {
    setIsUpdating(true)
    setActionError('')

    try {
      const updatedRequest = await updateAdminDismissalChecklistProgress(token, request.id, {
        completed_steps: nextCompletedSteps,
      })

      if (onUpdated) {
        onUpdated(updatedRequest)
      }
    } catch (error) {
      setActionError(error.message)
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleAdvance() {
    if (completedSteps >= totalSteps) {
      return
    }

    await handleUpdateProgress(completedSteps + 1)
  }

  async function handleGoBack() {
    if (completedSteps <= 0) {
      return
    }

    await handleUpdateProgress(completedSteps - 1)
  }

  const modalContent = (
    <div className="request-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="request-modal" role="dialog" aria-modal="true" aria-labelledby="dismissal-checklist-title" onClick={(event) => event.stopPropagation()}>
        <div className="request-modal-header">
          <div>
            <span className="eyebrow">Checklist da demissão</span>
            <h3 id="dismissal-checklist-title">{request.employee_name}</h3>
            <p>{request.cargo} • {request.departamento}</p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="approval-status-banner neutral">
          <strong>Etapa atual</strong>
          <span>{statusLabel} • {progressLabel} • {formatSummary(request)} • {DISMISSAL_TYPE_LABELS[request.dismissal_type] ?? request.dismissal_type}</span>
        </div>

        <div className="request-modal-section">
          <div className="request-modal-section-header">
            <h4>Controle do checklist</h4>
            <span>As alterações ficam salvas na solicitação</span>
          </div>

          <div className="checklist-progress-actions">
            <button className="secondary-button" type="button" onClick={handleGoBack} disabled={completedSteps <= 0 || isUpdating}>
              Voltar etapa
            </button>
            <button className="primary-button" type="button" onClick={handleAdvance} disabled={!hasSteps || completedSteps >= totalSteps || isUpdating}>
              Avançar etapa
            </button>
          </div>
          {actionError ? <div className="form-error" style={{ marginTop: 12 }}>{actionError}</div> : null}
        </div>

        <div className="request-modal-section">
          <div className="request-modal-section-header">
            <h4>Fluxo de acompanhamento</h4>
            <span>Checklist configurado pelo RH</span>
          </div>

          {hasSteps ? (
            <div className="admission-checklist-grid">
              {steps.map((step, index) => {
                const stepState = getStepState(index, completedSteps, totalSteps)

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
