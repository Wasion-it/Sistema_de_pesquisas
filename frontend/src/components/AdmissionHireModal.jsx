import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { createAdminAdmissionHire } from '../services/admin'

function buildLocalDateInputValue(value = new Date()) {
  const date = new Date(value)
  const offsetMinutes = date.getTimezoneOffset()
  return new Date(date.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 10)
}

function createCandidateDraft() {
  return {
    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    full_name: '',
    email: '',
    phone_number: '',
    hire_date: '',
    is_hired: false,
  }
}

function makeInitialForm() {
  return {
    candidates: [createCandidateDraft()],
  }
}

function formatRequestLabel(request) {
  if (!request) {
    return ''
  }

  const hiredCount = request.hired_employee_count ?? 0
  const totalPeople = request.quantity_people ?? 0
  const candidateCount = request.candidates?.length ?? 0
  return `${request.cargo} • ${request.setor} • ${hiredCount}/${totalPeople} contratados • ${candidateCount} participantes`
}

export function AdmissionHireModal({ request, token, onClose, onSubmitted }) {
  const [form, setForm] = useState(makeInitialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const requestLabel = useMemo(() => formatRequestLabel(request), [request])

  useEffect(() => {
    if (!request) {
      setForm(makeInitialForm())
      setErrorMessage('')
      setIsSubmitting(false)
      return undefined
    }

    setForm(makeInitialForm())
    setErrorMessage('')
  }, [request, token])

  if (!request) {
    return null
  }

  const remainingPositions = request.remaining_positions ?? 0
  const candidateCount = form.candidates.length
  const hiredCount = form.candidates.filter((candidate) => candidate.is_hired).length

  function updateCandidate(candidateId, fieldName, value) {
    setForm((current) => ({
      ...current,
      candidates: current.candidates.map((candidate) => (
        candidate.id === candidateId
          ? { ...candidate, [fieldName]: value }
          : candidate
      )),
    }))
  }

  function addCandidate() {
    if (isSubmitting) {
      return
    }

    setForm((current) => ({
      ...current,
      candidates: [...current.candidates, createCandidateDraft()],
    }))
  }


  function toggleCandidateHired(candidateId, nextValue) {
    if (nextValue && hiredCount >= remainingPositions) {
      setErrorMessage('Não há vagas disponíveis para marcar mais candidatos como contratados.')
      return
    }

    setErrorMessage('')
    updateCandidate(candidateId, 'is_hired', nextValue)
  }
  function removeCandidate(candidateId) {
    setForm((current) => {
      if (current.candidates.length <= 1) {
        return current
      }

      return {
        ...current,
        candidates: current.candidates.filter((candidate) => candidate.id !== candidateId),
      }
    })
  }

  function buildCandidatePayload(candidate) {
    return {
      full_name: candidate.full_name.trim(),
      email: candidate.email.trim(),
      phone_number: candidate.phone_number.trim() || null,
      hire_date: candidate.hire_date || null,
      is_hired: Boolean(candidate.is_hired),
    }
  }

  function validateCandidatePayloads(candidatePayloads) {
    if (candidatePayloads.length === 0) {
      return 'Adicione pelo menos um candidato.'
    }

    const seenEmployeeCodes = new Set()
    const seenWorkEmails = new Set()
    let hiredSelectionCount = 0

    for (const [index, candidatePayload] of candidatePayloads.entries()) {
      if (!candidatePayload.full_name || !candidatePayload.email) {
        return `Preencha todos os campos obrigatórios do candidato ${index + 1}.`
      }

      const normalizedEmail = candidatePayload.email.toLowerCase()

      if (seenWorkEmails.has(normalizedEmail)) {
        return `O email corporativo do candidato ${index + 1} já foi informado em outro registro.`
      }

      if (candidatePayload.is_hired) {
        hiredSelectionCount += 1
      }

      seenWorkEmails.add(normalizedEmail)
    }

    if (hiredSelectionCount > remainingPositions) {
      return 'Não há vagas suficientes para todos os candidatos marcados como contratados.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!token) {
      setErrorMessage('Sessão inválida. Faça login novamente.')
      return
    }

    if (form.candidates.length === 0) {
      setErrorMessage('Adicione pelo menos um candidato.')
      return
    }

    const candidatePayloads = form.candidates.map(buildCandidatePayload)
    const validationError = validateCandidatePayloads(candidatePayloads)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const latestResult = await createAdminAdmissionHire(token, request.id, { candidates: candidatePayloads })
      if (onSubmitted) {
        onSubmitted(latestResult)
      }
      onClose()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalContent = (
    <div className="request-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="request-modal" role="dialog" aria-modal="true" aria-labelledby="hire-request-title" onClick={(event) => event.stopPropagation()}>
        <div className="request-modal-header">
          <div>
            <span className="eyebrow">Contratação</span>
            <h3 id="hire-request-title">Cadastrar candidatos</h3>
            <p>{requestLabel}</p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="approval-status-banner neutral">
          <strong>Vagas disponíveis</strong>
          <span>
            {remainingPositions} posição(ões) podem ser ocupadas por candidatos marcados como contratados. Os demais podem ser registrados como participantes.
          </span>
        </div>

        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="request-modal-section">
            <div className="request-modal-section-header">
              <h4>Dados dos candidatos</h4>
              <span>{candidateCount} participante(s) • {hiredCount}/{request.quantity_people} contratados</span>
            </div>

            <div className="candidate-form-list">
              {form.candidates.map((candidate, index) => (
                <article className="candidate-form-card" key={candidate.id}>
                  <div className="candidate-form-card-header">
                    <div>
                      <span className="candidate-form-card-eyebrow">Candidato {index + 1}</span>
                      <strong>{request.cargo}</strong>
                    </div>
                    <label className="candidate-hired-toggle">
                      <input
                        type="checkbox"
                        checked={candidate.is_hired}
                        onChange={(event) => toggleCandidateHired(candidate.id, event.target.checked)}
                        disabled={isSubmitting || (hiredCount >= remainingPositions && !candidate.is_hired)}
                      />
                      <span>Contratado</span>
                    </label>
                  </div>

                  <div className="request-modal-form-grid">
                    <label className="field-group">
                      <span>Nome completo</span>
                      <input
                        required
                        value={candidate.full_name}
                        onChange={(event) => updateCandidate(candidate.id, 'full_name', event.target.value)}
                        placeholder="Nome do candidato"
                      />
                    </label>

                    <label className="field-group">
                      <span>Email</span>
                      <input
                        required
                        type="email"
                        value={candidate.email}
                        onChange={(event) => updateCandidate(candidate.id, 'email', event.target.value)}
                        placeholder="nome.sobrenome@empresa.com"
                      />
                    </label>

                    <label className="field-group">
                      <span>Telefone</span>
                      <input
                        value={candidate.phone_number}
                        onChange={(event) => updateCandidate(candidate.id, 'phone_number', event.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </label>
                  </div>

                  {candidate.is_hired ? (
                    <div className="candidate-hire-date-row">
                      <label className="field-group">
                        <span>Data de admissão</span>
                        <input
                          type="date"
                          value={candidate.hire_date}
                          onChange={(event) => updateCandidate(candidate.id, 'hire_date', event.target.value)}
                        />
                      </label>
                    </div>
                  ) : null}

                  <div className="candidate-form-card-footer">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => removeCandidate(candidate.id)}
                      disabled={form.candidates.length <= 1 || isSubmitting}
                    >
                      Remover candidato
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="candidate-form-footer">
              <p className="request-modal-helper-text">
                Cadastre quantos participantes forem necessários. Apenas os marcados como contratados entram na contagem da vaga.
              </p>
              <button
                className="secondary-button"
                type="button"
                onClick={addCandidate}
                disabled={isSubmitting}
              >
                Adicionar candidato
              </button>
            </div>
          </div>

          <div className="form-actions-row">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Cadastrar candidatos'}
            </button>
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return modalContent
  }

  return createPortal(modalContent, document.body)
}