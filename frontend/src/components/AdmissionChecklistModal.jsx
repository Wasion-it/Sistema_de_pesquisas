import { useState } from 'react'
import { createPortal } from 'react-dom'

import { updateAdminAdmissionChecklistProgress } from '../services/admin'

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

function getStepState(stepIndex, completedSteps, totalSteps) {
  if (completedSteps >= totalSteps) return 'done'
  if (stepIndex < completedSteps) return 'done'
  if (stepIndex === completedSteps) return 'current'
  return 'pending'
}

export function AdmissionChecklistModal({ request, steps = [], token, onClose, onUpdated }) {
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
      const updatedRequest = await updateAdminAdmissionChecklistProgress(token, request.id, {
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
          <span>{statusLabel} • {progressLabel} • {formatSummary(request)}</span>
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