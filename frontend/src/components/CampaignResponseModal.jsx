import { createPortal } from 'react-dom'

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getAnswerValue(answer) {
  if (answer.selected_option_label) {
    return answer.selected_option_label
  }

  if (typeof answer.numeric_answer === 'number') {
    return String(answer.numeric_answer)
  }

  if (answer.text_answer) {
    return answer.text_answer
  }

  return 'Sem resposta registrada'
}

function getAnswerTypeLabel(questionType) {
  if (questionType === 'SCALE_1_5') {
    return 'Escala'
  }

  if (questionType === 'TEXT') {
    return 'Texto'
  }

  return 'Opções'
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

export function CampaignResponseModal({ response, responseNumber, onClose }) {
  if (!response) {
    return null
  }

  const statusLabel = response.status === 'SUBMITTED' ? 'Enviada' : 'Rascunho'
  const modalContent = (
    <div className="request-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="request-modal" role="dialog" aria-modal="true" aria-labelledby="campaign-response-title" onClick={(event) => event.stopPropagation()}>
        <div className="request-modal-header">
          <div>
            <span className="eyebrow">Detalhes da resposta</span>
            <h3 id="campaign-response-title">Resposta #{responseNumber}</h3>
            <p>
              {response.department_name ?? 'Departamento não informado'} · {response.position_name ?? 'Posição não informada'}
            </p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="request-modal-meta">
          <DetailField label="Status" value={statusLabel} />
          <DetailField label="Departamento" value={response.department_name ?? 'Não informado'} />
          <DetailField label="Posição" value={response.position_name ?? 'Não informada'} />
          <div>
            <span>Atualização</span>
            <strong>{formatDateTime(response.submitted_at ?? response.started_at)}</strong>
            <small>Criada em {formatDateTime(response.started_at)}</small>
          </div>
        </div>

        <div className="request-modal-section">
          <div className="request-modal-section-header">
            <h4>Perguntas e respostas</h4>
            <span>{response.total_answers} item(ns)</span>
          </div>

          <div className="admin-answer-list" style={{ padding: 0, maxHeight: '56vh', overflowY: 'auto' }}>
            {response.answers.map((answer) => (
              <div className="admin-answer-item" key={`${response.response_id}-${answer.question_id}`}>
                <strong>{answer.question_text}</strong>
                <div className="admin-answer-meta">
                  <span>{answer.question_code}</span>
                  <span>{getAnswerTypeLabel(answer.question_type)}</span>
                </div>
                <div className="admin-answer-value">{getAnswerValue(answer)}</div>
              </div>
            ))}
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
