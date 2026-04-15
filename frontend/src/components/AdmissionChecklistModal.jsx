import { createPortal } from 'react-dom'

const STATUS_TO_STEP_INDEX = {
  PENDING: 0,
  UNDER_REVIEW: 1,
  APPROVED: 2,
  REJECTED: 5,
  CANCELED: 5,
}

const CHECKLIST_STEPS = [
  {
    title: 'Solicitação criada',
    description: 'O pedido foi registrado e já pode ser acompanhado pelo RH.',
  },
  {
    title: 'Em análise',
    description: 'A solicitação está em avaliação no fluxo de aprovação.',
  },
  {
    title: 'Aprovada',
    description: 'O fluxo aprovou a abertura da vaga e o RH pode seguir com a contratação.',
  },
  {
    title: 'Cadastro do contratado',
    description: 'A equipe do RH pode registrar o novo colaborador vinculado à solicitação.',
  },
  {
    title: 'Integração e documentação',
    description: 'Etapa de conferência final, documentação e entrada do colaborador.',
  },
  {
    title: 'Concluída ou encerrada',
    description: 'O processo foi finalizado, aprovado com contratação ou encerrado sem prosseguimento.',
  },
]

function formatSummary(request) {
  const hiredCount = request?.hired_employee_count ?? 0
  const totalPositions = request?.quantity_people ?? 0
  const remainingPositions = request?.remaining_positions ?? Math.max(totalPositions - hiredCount, 0)

  return `${hiredCount}/${totalPositions} contratados • ${remainingPositions} posição(ões) em aberto`
}

function getCurrentStepIndex(request) {
  const status = String(request?.status ?? 'PENDING').toUpperCase()

  if (status === 'APPROVED') {
    const hiredCount = request?.hired_employee_count ?? 0
    const totalPositions = request?.quantity_people ?? 0

    if (hiredCount >= totalPositions && totalPositions > 0) {
      return 5
    }

    return 3
  }

  return STATUS_TO_STEP_INDEX[status] ?? 0
}

function getStepState(stepIndex, currentIndex) {
  if (stepIndex < currentIndex) return 'done'
  if (stepIndex === currentIndex) return 'current'
  return 'pending'
}

export function AdmissionChecklistModal({ request, onClose }) {
  if (!request) {
    return null
  }

  const currentIndex = getCurrentStepIndex(request)
  const statusLabel = String(request.status ?? 'PENDING')

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
            <span>Visão genérica para o RH</span>
          </div>

          <div className="admission-checklist-grid">
            {CHECKLIST_STEPS.map((step, index) => {
              const stepState = getStepState(index, currentIndex)

              return (
                <article className={`admission-checklist-step ${stepState}`} key={step.title}>
                  <div className="admission-checklist-step-index">{index + 1}</div>
                  <div className="admission-checklist-step-content">
                    <strong>{step.title}</strong>
                    <span>{step.description}</span>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return modalContent
  }

  return createPortal(modalContent, document.body)
}