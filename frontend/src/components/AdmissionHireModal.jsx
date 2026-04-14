import { useEffect, useMemo, useState } from 'react'

import { createAdminAdmissionHire, getAdminDepartments, getAdminJobTitles } from '../services/admin'

function buildLocalDateInputValue(value = new Date()) {
  const date = new Date(value)
  const offsetMinutes = date.getTimezoneOffset()
  return new Date(date.getTime() - offsetMinutes * 60_000).toISOString().slice(0, 10)
}

function makeInitialForm() {
  return {
    full_name: '',
    employee_code: '',
    work_email: '',
    personal_email: '',
    department_id: '',
    job_title_id: '',
    hire_date: buildLocalDateInputValue(),
  }
}

function formatRequestLabel(request) {
  if (!request) {
    return ''
  }

  const hiredCount = request.hired_employee_count ?? 0
  const totalPeople = request.quantity_people ?? 0
  return `${request.cargo} • ${request.setor} • ${hiredCount}/${totalPeople} contratados`
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

  async function handleSubmit(event) {
    event.preventDefault()

    if (!token) {
      setErrorMessage('Sessão inválida. Faça login novamente.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const payload = {
        full_name: form.full_name.trim(),
        employee_code: form.employee_code.trim(),
        work_email: form.work_email.trim(),
        personal_email: form.personal_email.trim() || null,
        department_id: Number(form.department_id),
        job_title_id: Number(form.job_title_id),
        hire_date: form.hire_date || null,
      }

      const result = await createAdminAdmissionHire(token, request.id, payload)
      if (onSubmitted) {
        onSubmitted(result)
      }
      onClose()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="request-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="request-modal" role="dialog" aria-modal="true" aria-labelledby="hire-request-title" onClick={(event) => event.stopPropagation()}>
        <div className="request-modal-header">
          <div>
            <span className="eyebrow">Contratação</span>
            <h3 id="hire-request-title">Cadastrar contratado</h3>
            <p>{requestLabel}</p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="approval-status-banner neutral">
          <strong>Vagas disponíveis</strong>
          <span>{remainingPositions} posição(ões) ainda podem ser convertidas em cadastro de funcionário.</span>
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
              <h4>Dados do contratado</h4>
              <span>{request.cargo}</span>
            </div>

            <div className="request-modal-form-grid">
              <label className="field-group">
                <span>Nome completo</span>
                <input
                  required
                  value={form.full_name}
                  onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                  placeholder="Nome do novo colaborador"
                />
              </label>

              <label className="field-group">
                <span>Matrícula</span>
                <input
                  required
                  value={form.employee_code}
                  onChange={(event) => setForm((current) => ({ ...current, employee_code: event.target.value }))}
                  placeholder="EMP-2026-001"
                />
              </label>

              <label className="field-group">
                <span>Email corporativo</span>
                <input
                  required
                  type="email"
                  value={form.work_email}
                  onChange={(event) => setForm((current) => ({ ...current, work_email: event.target.value }))}
                  placeholder="nome.sobrenome@empresa.com"
                />
              </label>

              <label className="field-group">
                <span>Email pessoal</span>
                <input
                  type="email"
                  value={form.personal_email}
                  onChange={(event) => setForm((current) => ({ ...current, personal_email: event.target.value }))}
                  placeholder="nome@gmail.com"
                />
              </label>

              <label className="field-group">
                <span>Departamento</span>
                <select
                  required
                  value={form.department_id}
                  onChange={(event) => setForm((current) => ({ ...current, department_id: event.target.value }))}
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
                  value={form.job_title_id}
                  onChange={(event) => setForm((current) => ({ ...current, job_title_id: event.target.value }))}
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
                  value={form.hire_date}
                  onChange={(event) => setForm((current) => ({ ...current, hire_date: event.target.value }))}
                />
              </label>
            </div>
          </div>

          <div className="form-actions-row">
            <button className="primary-button" type="submit" disabled={isSubmitting || isLoadingLookups}>
              {isSubmitting ? 'Salvando...' : 'Cadastrar contratado'}
            </button>
            <button className="secondary-button" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}