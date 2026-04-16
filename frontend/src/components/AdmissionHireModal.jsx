import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { createAdminAdmissionHire, getAdminDepartments, getAdminJobTitles } from '../services/admin'

function buildLocalDateInputValue(value = new Date()) {
  const date = new Date(value)
  const offsetMinutes = date.getTimezoneOffset()
  return new Date(date.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 10)
}

function createCandidateDraft() {
  return {
    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    full_name: '',
    employee_code: '',
    work_email: '',
    personal_email: '',
    department_id: '',
    job_title_id: '',
    hire_date: buildLocalDateInputValue(),
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
  return `${request.cargo} • ${request.setor} • ${hiredCount}/${totalPeople} candidatos cadastrados`
}

export function AdmissionHireModal({ request, token, onClose, onSubmitted }) {
  const [form, setForm] = useState(makeInitialForm)
  const [departments, setDepartments] = useState([])
  const [jobTitles, setJobTitles] = useState([])
  const [isLoadingLookups, setIsLoadingLookups] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const requestLabel = useMemo(() => formatRequestLabel(request), [request])

  useEffect(() => {
    if (!request) {
      setForm(makeInitialForm())
      setDepartments([])
      setJobTitles([])
      setErrorMessage('')
      setIsLoadingLookups(false)
      setIsSubmitting(false)
      return undefined
    }

    setForm(makeInitialForm())
    setErrorMessage('')
    setIsLoadingLookups(true)

    let isMounted = true

    Promise.allSettled([getAdminDepartments(token), getAdminJobTitles(token)]).then(([departmentResult, jobTitleResult]) => {
      if (!isMounted) {
        return
      }

      if (departmentResult.status === 'fulfilled') {
        setDepartments((departmentResult.value.items ?? []).filter((item) => item.is_active))
      } else {
        setDepartments([])
        setErrorMessage(departmentResult.reason?.message ?? 'Erro ao carregar departamentos.')
      }

      if (jobTitleResult.status === 'fulfilled') {
        setJobTitles((jobTitleResult.value.items ?? []).filter((item) => item.is_active))
      } else {
        setJobTitles([])
        setErrorMessage((currentError) => currentError || (jobTitleResult.reason?.message ?? 'Erro ao carregar cargos.'))
      }

      setIsLoadingLookups(false)
    })

    return () => {
      isMounted = false
    }
  }, [request, token])

  if (!request) {
    return null
  }

  const remainingPositions = request.remaining_positions ?? 0
  const candidateCount = form.candidates.length
  const canAddMoreCandidates = candidateCount < remainingPositions

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
    if (!canAddMoreCandidates || isSubmitting || isLoadingLookups) {
      return
    }

    setForm((current) => ({
      ...current,
      candidates: [...current.candidates, createCandidateDraft()],
    }))
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
      employee_code: candidate.employee_code.trim(),
      work_email: candidate.work_email.trim(),
      personal_email: candidate.personal_email.trim() || null,
      department_id: Number(candidate.department_id),
      job_title_id: Number(candidate.job_title_id),
      hire_date: candidate.hire_date || null,
    }
  }

  function validateCandidatePayloads(candidatePayloads) {
    if (candidatePayloads.length === 0) {
      return 'Adicione pelo menos um candidato.'
    }

    if (candidatePayloads.length > remainingPositions) {
      return `Existem apenas ${remainingPositions} posição(ões) disponíveis para esta solicitação.`
    }

    const seenEmployeeCodes = new Set()
    const seenWorkEmails = new Set()

    for (const [index, candidatePayload] of candidatePayloads.entries()) {
      if (!candidatePayload.full_name || !candidatePayload.employee_code || !candidatePayload.work_email || !candidatePayload.department_id || !candidatePayload.job_title_id) {
        return `Preencha todos os campos obrigatórios do candidato ${index + 1}.`
      }

      const normalizedEmployeeCode = candidatePayload.employee_code.toUpperCase()
      const normalizedWorkEmail = candidatePayload.work_email.toLowerCase()

      if (seenEmployeeCodes.has(normalizedEmployeeCode)) {
        return `O código de matrícula do candidato ${index + 1} já foi informado em outro registro.`
      }

      if (seenWorkEmails.has(normalizedWorkEmail)) {
        return `O email corporativo do candidato ${index + 1} já foi informado em outro registro.`
      }

      seenEmployeeCodes.add(normalizedEmployeeCode)
      seenWorkEmails.add(normalizedWorkEmail)
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!token) {
      setErrorMessage('Sessão inválida. Faça login novamente.')
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
      let latestResult = null

      for (const candidatePayload of candidatePayloads) {
        latestResult = await createAdminAdmissionHire(token, request.id, candidatePayload)
      }

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
          <span>{remainingPositions} posição(ões) ainda podem ser usadas para cadastrar candidatos participantes do processo.</span>
        </div>

        {isLoadingLookups ? (
          <div className="empty-state">
            <strong>Carregando departamentos e cargos...</strong>
          </div>
        ) : null}

        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="request-modal-section">
            <div className="request-modal-section-header">
              <h4>Dados dos candidatos</h4>
              <span>{candidateCount}/{remainingPositions} candidato(s)</span>
            </div>

            <div className="candidate-form-list">
              {form.candidates.map((candidate, index) => (
                <article className="candidate-form-card" key={candidate.id}>
                  <div className="candidate-form-card-header">
                    <div>
                      <span className="candidate-form-card-eyebrow">Candidato {index + 1}</span>
                      <strong>{request.cargo}</strong>
                    </div>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => removeCandidate(candidate.id)}
                      disabled={form.candidates.length <= 1 || isSubmitting}
                    >
                      Remover
                    </button>
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
                      <span>Matrícula</span>
                      <input
                        required
                        value={candidate.employee_code}
                        onChange={(event) => updateCandidate(candidate.id, 'employee_code', event.target.value)}
                        placeholder="EMP-2026-001"
                      />
                    </label>

                    <label className="field-group">
                      <span>Email corporativo</span>
                      <input
                        required
                        type="email"
                        value={candidate.work_email}
                        onChange={(event) => updateCandidate(candidate.id, 'work_email', event.target.value)}
                        placeholder="nome.sobrenome@empresa.com"
                      />
                    </label>

                    <label className="field-group">
                      <span>Email pessoal</span>
                      <input
                        type="email"
                        value={candidate.personal_email}
                        onChange={(event) => updateCandidate(candidate.id, 'personal_email', event.target.value)}
                        placeholder="nome@gmail.com"
                      />
                    </label>

                    <label className="field-group">
                      <span>Departamento</span>
                      <select
                        required
                        value={candidate.department_id}
                        onChange={(event) => updateCandidate(candidate.id, 'department_id', event.target.value)}
                        disabled={isLoadingLookups}
                      >
                        <option value="">Selecione um departamento</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field-group">
                      <span>Cargo</span>
                      <select
                        required
                        value={candidate.job_title_id}
                        onChange={(event) => updateCandidate(candidate.id, 'job_title_id', event.target.value)}
                        disabled={isLoadingLookups}
                      >
                        <option value="">Selecione um cargo</option>
                        {jobTitles.map((jobTitle) => (
                          <option key={jobTitle.id} value={jobTitle.id}>
                            {jobTitle.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field-group">
                      <span>Data de admissão</span>
                      <input
                        type="date"
                        value={candidate.hire_date}
                        onChange={(event) => updateCandidate(candidate.id, 'hire_date', event.target.value)}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>

            <div className="candidate-form-footer">
              <p className="request-modal-helper-text">
                Cada candidato adicionado será enviado individualmente para a mesma solicitação de admissão.
              </p>
              <button
                className="secondary-button"
                type="button"
                onClick={addCandidate}
                disabled={!canAddMoreCandidates || isSubmitting || isLoadingLookups}
              >
                Adicionar candidato
              </button>
            </div>
          </div>

          <div className="form-actions-row">
            <button className="primary-button" type="submit" disabled={isSubmitting || isLoadingLookups}>
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