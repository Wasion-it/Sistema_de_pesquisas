import { useEffect, useMemo, useState } from 'react'

import { getAdminAdmissionRequest, getAdminDismissalRequest } from '../services/admin'

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
  admission: getAdminAdmissionRequest,
  dismissal: getAdminDismissalRequest,
}

function normalizeRequestKind(kind) {
  return String(kind ?? '').toLowerCase()
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

function HiredEmployeesSection({ hiredEmployees = [] }) {
  if (!hiredEmployees.length) {
    return (
      <div className="request-modal-section">
        <div className="request-modal-section-header">
          <h4>Contratados vinculados</h4>
          <span>0 registros</span>
        </div>
        <div className="empty-state compact">
          <strong>Nenhum contratado registrado ainda</strong>
          <span>O vínculo aparece aqui depois que o RH cadastrar o funcionário contratado.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="request-modal-section">
      <div className="request-modal-section-header">
        <h4>Contratados vinculados</h4>
        <span>{hiredEmployees.length} registro(s)</span>
      </div>
      <div className="hired-employees-list">
        {hiredEmployees.map((employee) => (
          <article className="hired-employee-card" key={employee.id}>
            <strong>{employee.full_name}</strong>
            <span>{employee.employee_code}</span>
            <small>{employee.department_name} • {employee.job_title_name}</small>
            <small>{employee.work_email ?? 'Sem email corporativo'}</small>
            {employee.hire_date ? <small>Admissão em {formatDateTime(employee.hire_date)}</small> : null}
          </article>
        ))}
      </div>
    </div>
  )
}

function mergeDetailAndQueue(request, detail) {
  if (!request || !detail) {
    return request
  }

  return {
    ...request,
    ...detail,
    request_kind: request.request_kind,
    request_id: request.request_id,
    request_title: request.request_title,
    request_subtitle: request.request_subtitle,
    workflow_name: request.workflow_name,
    current_step_label: request.current_step_label,
    current_step_role: request.current_step_role,
    request_status: request.request_status,
    requester_name: request.requester_name,
    requester_email: request.requester_email,
    submitted_at: request.submitted_at,
    created_at: request.created_at,
    updated_at: request.updated_at,
    steps: request.steps,
  }
}

export function RequestDetailsModal({ request, token, onClose }) {
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

  const fullRequest = mergeDetailAndQueue(request, detail)
  const statusLabel = STATUS_LABELS[fullRequest.request_status] ?? fullRequest.request_status
  const requestKindLabel = REQUEST_KIND_LABELS[fullRequest.request_kind] ?? fullRequest.request_kind

  return (
    <div className="request-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="request-modal" role="dialog" aria-modal="true" aria-labelledby="request-details-title" onClick={(event) => event.stopPropagation()}>
        <div className="request-modal-header">
          <div>
            <span className="eyebrow">Detalhes da solicitação</span>
            <h3 id="request-details-title">{fullRequest.request_title}</h3>
            <p>{fullRequest.request_subtitle}</p>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>

        {isLoading ? (
          <div className="empty-state">
            <strong>Carregando detalhes...</strong>
          </div>
        ) : null}

        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

        {!isLoading ? (
          <>
            <div className="request-modal-meta">
              <DetailField label="Tipo" value={requestKindLabel} />
              <DetailField label="Status" value={statusLabel} />
              <DetailField label="Fluxo" value={fullRequest.workflow_name} />
              <DetailField label="Solicitante" value={fullRequest.requester_name} />
              <DetailField label="Email" value={fullRequest.requester_email} />
              <div>
                <span>Atualização</span>
                <strong>{formatDateTime(fullRequest.updated_at)}</strong>
                <small>Criado em {formatDateTime(fullRequest.created_at)}</small>
              </div>
            </div>

            <div className="request-modal-section">
              <div className="request-modal-section-header">
                <h4>Dados do formulário</h4>
                <span>{requestKindLabel}</span>
              </div>

              {requestKind === 'admission' ? (
                <div className="request-modal-form-grid">
                  <DetailField label="Tipo de admissão" value={fullRequest.request_type} />
                  <DetailField label="Cargo" value={fullRequest.cargo} />
                  <DetailField label="Setor" value={fullRequest.setor} />
                  <DetailField label="Escopo" value={fullRequest.recruitment_scope} />
                  <DetailField label="Quantidade" value={fullRequest.quantity_people} />
                  <DetailField label="Turno" value={fullRequest.turno} />
                  <DetailField label="Regime" value={fullRequest.contract_regime} />
                  <DetailField label="Substitui colaborador" value={fullRequest.substituted_employee_name ?? 'Não se aplica'} />
                  <DetailField label="Justificativa" value={fullRequest.justification ?? 'Não informada'} />
                  <DetailField label="Observação do gestor" value={fullRequest.manager_reminder ?? 'Não informada'} />
                </div>
              ) : null}

              {requestKind === 'dismissal' ? (
                <div className="request-modal-form-grid">
                  <DetailField label="Colaborador" value={fullRequest.employee_name} />
                  <DetailField label="Cargo" value={fullRequest.cargo} />
                  <DetailField label="Departamento" value={fullRequest.departamento} />
                  <DetailField label="Tipo de demissão" value={fullRequest.dismissal_type} />
                  <DetailField label="Substituição" value={fullRequest.has_replacement ? 'Sim' : 'Não'} />
                  <DetailField label="Data estimada" value={formatDateTime(fullRequest.estimated_termination_date)} />
                  <DetailField label="Regime" value={fullRequest.contract_regime} />
                  <DetailField label="Observação do gestor" value={fullRequest.manager_reminder ?? 'Não informada'} />
                </div>
              ) : null}

              <HiredEmployeesSection hiredEmployees={fullRequest.hired_employees ?? []} />
            </div>

          </>
        ) : null}
      </div>
    </div>
  )
}
