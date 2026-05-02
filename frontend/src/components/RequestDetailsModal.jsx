import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { getAdminAdmissionRequest, getAdminDismissalRequest } from '../services/admin'

function formatDateTime(value) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDateOnly(value) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(value))
}

function formatCurrency(value, currency = 'BRL') {
  if (value === null || value === undefined || value === '') return 'Não informado'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(Number(value))
}

const STATUS_CONFIG = {
  PENDING:      { label: 'Pendente',   color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  UNDER_REVIEW: { label: 'Em análise', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
  APPROVED:     { label: 'Aprovada',   color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  FINALIZED:    { label: 'Finalizada', color: '#15803d', bg: '#ecfdf5', border: '#a7f3d0', dot: '#16a34a' },
  REJECTED:     { label: 'Rejeitada',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  CANCELED:     { label: 'Cancelada',  color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8' },
}

const KIND_CONFIG = {
  ADMISSION: { label: 'Admissão', color: '#1d4ed8', bg: '#eff6ff' },
  DISMISSAL: { label: 'Demissão', color: '#b45309', bg: '#fffbeb' },
}

const REQUEST_KIND_TO_FETCHER = {
  admission: getAdminAdmissionRequest,
  dismissal: getAdminDismissalRequest,
}

const ADMISSION_POSITION_LABELS = {
  PUBLIC_ADMINISTRATIVE: 'Administrativo',
  PUBLIC_OPERATIONAL:    'Operacional',
  PUBLIC_LEADERSHIP:     'Liderança',
}

const RECRUITMENT_SCOPE_LABELS = {
  INTERNAL: 'Interno',
  EXTERNAL: 'Externo',
  MIXED:    'Misto',
}

const CONTRACT_REGIME_LABELS = {
  TEMPORARY:  'Temporário',
  EFFECTIVE:  'Efetivo',
  INTERN:     'Estagiário',
  APPRENTICE: 'Aprendiz',
  CLT:        'CLT',
  PJ:         'PJ',
}

const DISMISSAL_TYPE_LABELS = {
  JUST_CAUSE:         'Justa causa',
  RESIGNATION:        'Pedido de demissão',
  WITHOUT_JUST_CAUSE: 'Dispensa sem justa causa',
  TERM_CONTRACT:      'Término de contrato',
  CONSENSUAL:         'Demissão consensual',
}

const REQUEST_TYPE_LABELS = {
  GROWTH:      'Aumento de quadro',
  REPLACEMENT: 'Substituição',
}

function normalizeRequestKind(kind) {
  return String(kind ?? '').toLowerCase()
}

function mergeDetailAndQueue(request, detail) {
  if (!request || !detail) return request
  return {
    ...request,
    ...detail,
    request_kind:       request.request_kind,
    request_id:         request.request_id,
    request_title:      request.request_title,
    request_subtitle:   request.request_subtitle,
    workflow_name:      request.workflow_name,
    current_step_label: request.current_step_label,
    current_step_role:  request.current_step_role,
    request_status:     request.request_status,
    requester_name:     request.requester_name,
    requester_email:    request.requester_email,
    submitted_at:       request.submitted_at,
    created_at:         request.created_at,
    updated_at:         request.updated_at,
    steps:              request.steps,
  }
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  return (
    <span
      className="request-detail-status-badge"
      style={{
        '--request-status-bg': cfg.bg,
        '--request-status-border': cfg.border,
        '--request-status-color': cfg.color,
        '--request-status-dot': cfg.dot,
      }}
    >
      <span />
      {cfg.label}
    </span>
  )
}

function KindBadge({ kind }) {
  const cfg = KIND_CONFIG[String(kind ?? '').toUpperCase()] ?? { label: kind, color: '#64748b', bg: '#f1f5f9' }
  return (
    <span
      className="request-detail-kind-badge"
      style={{
        '--request-kind-bg': cfg.bg,
        '--request-kind-color': cfg.color,
      }}
    >
      {cfg.label}
    </span>
  )
}

function InfoChip({ label, value, accent }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div
      className="request-detail-info-chip"
      style={accent ? { '--request-chip-accent': accent } : undefined}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function BooleanChip({ label, value, trueColor, falseColor }) {
  const color  = value ? (trueColor ?? '#16a34a') : (falseColor ?? '#64748b')
  const bg     = value ? '#f0fdf4' : '#f8fafc'
  const border = value ? '#bbf7d0' : '#e2e8f0'
  return (
    <div
      className="request-detail-boolean-chip"
      style={{
        '--request-boolean-bg': bg,
        '--request-boolean-border': border,
        '--request-boolean-color': color,
      }}
    >
      <span>{label}</span>
      <div>
        <span />
        <strong>{value ? 'Sim' : 'Não'}</strong>
      </div>
    </div>
  )
}

function SectionDivider({ title }) {
  return (
    <div className="request-detail-section-divider">
      <span>{title}</span>
    </div>
  )
}

function TextNote({ label, children, tone = 'neutral' }) {
  if (!children) return null
  return (
    <div className={`request-detail-note ${tone}`}>
      <span>{label}</span>
      <p>{children}</p>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function RequestDetailsModal({ request, token, onClose }) {
  const [detail, setDetail]             = useState(null)
  const [isLoading, setIsLoading]       = useState(false)
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
      .then((data) => { if (isMounted) setDetail(data) })
      .catch((error) => { if (isMounted) setErrorMessage(error.message) })
      .finally(() => { if (isMounted) setIsLoading(false) })

    return () => { isMounted = false }
  }, [fetchDetail, request, token])

  if (!request) return null

  const fullRequest = mergeDetailAndQueue(request, detail)
  const isAdmission = requestKind === 'admission'
  const isDismissal = requestKind === 'dismissal'

  const modalContent = (
    <div className="request-modal-backdrop request-details-backdrop" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-details-title"
        className="request-details-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="request-details-header">
          <div className="request-details-header-main">
            <div className="request-details-title-block">
              <div className="request-details-badge-row">
                <KindBadge kind={fullRequest.request_kind} />
                <StatusBadge status={fullRequest.request_status} />
              </div>
              <h3 id="request-details-title">{fullRequest.request_title}</h3>
              {fullRequest.request_subtitle ? <p>{fullRequest.request_subtitle}</p> : null}
            </div>

            <button type="button" className="request-details-close" aria-label="Fechar modal" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>

          {!isLoading ? (
            <div className="request-details-meta-strip">
              {[
                { label: 'ID', text: `#${fullRequest.request_id ?? fullRequest.id}` },
                { label: 'Solicitante', text: fullRequest.requester_name },
                { label: 'Criado', text: formatDateTime(fullRequest.created_at) },
              ].filter((item) => item.text).map((item) => (
                <span key={`${item.label}-${item.text}`}>
                  <small>{item.label}</small>
                  {item.text}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <div className="request-details-body">
          {isLoading ? (
            <div className="request-details-loading">
              <div />
              <span>Carregando detalhes...</span>
            </div>
          ) : null}

          {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

          {!isLoading ? (
            <>
              {isAdmission ? (
                <>
                  <SectionDivider title="Identificação da vaga" />
                  <div className="request-detail-grid">
                    <InfoChip label="Tipo de admissão" value={REQUEST_TYPE_LABELS[fullRequest.request_type] ?? fullRequest.request_type} accent="#1d4ed8" />
                    <InfoChip label="Posição da vaga" value={ADMISSION_POSITION_LABELS[fullRequest.posicao_vaga] ?? fullRequest.posicao_vaga ?? 'Não informada'} />
                    <InfoChip label="Cargo" value={fullRequest.cargo} accent="#2563eb" />
                    <InfoChip label="Setor" value={fullRequest.setor} />
                    <InfoChip label="Escopo de recrutamento" value={RECRUITMENT_SCOPE_LABELS[fullRequest.recruitment_scope] ?? fullRequest.recruitment_scope} />
                    <InfoChip label="Turno" value={fullRequest.turno} />
                    <InfoChip label="Regime de contrato" value={CONTRACT_REGIME_LABELS[fullRequest.contract_regime] ?? fullRequest.contract_regime} />
                    <InfoChip label="Quantidade de vagas" value={fullRequest.quantity_people} />
                    <InfoChip label="Salário da vaga" value={formatCurrency(fullRequest.vacancy_salary, fullRequest.vacancy_salary_currency ?? 'BRL')} accent="#16a34a" />
                  </div>

                  <div className="request-detail-grid">
                    <BooleanChip label="Vaga confidencial" value={fullRequest.is_confidential} falseColor="#16a34a" />
                    <InfoChip label="Recrutador" value={fullRequest.recruiter_user_name ?? 'Ainda não definido'} accent="#0284c7" />
                  </div>

                  {fullRequest.substituted_employee_name ? (
                    <>
                      <SectionDivider title="Substituição" />
                      <InfoChip label="Colaborador substituído" value={fullRequest.substituted_employee_name} accent="#d97706" />
                    </>
                  ) : null}

                  {fullRequest.justification || fullRequest.manager_reminder ? (
                    <>
                      <SectionDivider title="Observações" />
                      <div className="request-detail-note-list">
                        <TextNote label="Justificativa" tone="warning">{fullRequest.justification}</TextNote>
                        <TextNote label="Observação do gestor">{fullRequest.manager_reminder}</TextNote>
                      </div>
                    </>
                  ) : null}
                </>
              ) : null}

              {isDismissal ? (
                <>
                  <SectionDivider title="Colaborador e vínculo" />
                  <div className="request-detail-grid">
                    <InfoChip label="Nome do colaborador" value={fullRequest.employee_name} accent="#b45309" />
                    <InfoChip label="Cargo" value={fullRequest.cargo} accent="#0284c7" />
                    <InfoChip label="Departamento" value={fullRequest.departamento} />
                    <InfoChip label="Regime de contratação" value={CONTRACT_REGIME_LABELS[fullRequest.contract_regime] ?? fullRequest.contract_regime} />
                  </div>

                  <SectionDivider title="Motivo e continuidade" />
                  <div className="request-detail-grid">
                    <InfoChip label="Tipo de demissão" value={DISMISSAL_TYPE_LABELS[fullRequest.dismissal_type] ?? fullRequest.dismissal_type} accent="#dc2626" />
                    <InfoChip label="Data estimada do desligamento" value={fullRequest.estimated_termination_date ? formatDateOnly(fullRequest.estimated_termination_date) : 'Não informada'} accent="#d97706" />
                  </div>

                  <div className="request-detail-grid">
                    <BooleanChip label="Substituição prevista" value={fullRequest.has_replacement} />
                    <BooleanChip label="Pode ser recontratada" value={fullRequest.can_be_rehired} falseColor="#dc2626" />
                  </div>

                  {!fullRequest.can_be_rehired && fullRequest.rehire_justification ? (
                    <>
                      <SectionDivider title="Restrição de recontratação" />
                      <TextNote label="Justificativa" tone="danger">{fullRequest.rehire_justification}</TextNote>
                    </>
                  ) : null}

                  <div className="request-detail-operation-note">
                    <strong>Lembrete operacional</strong>
                    <p>Se houver reposição da posição, a nova vaga deve seguir o fluxo específico de admissão.</p>
                    <p>Revise o tipo e a data estimada do desligamento antes de avançar a solicitação no fluxo.</p>
                  </div>

                  {fullRequest.manager_reminder ? (
                    <>
                      <SectionDivider title="Observações" />
                      <TextNote label="Observação do gestor">{fullRequest.manager_reminder}</TextNote>
                    </>
                  ) : null}
                </>
              ) : null}

              <footer className="request-details-footer">
                <span>{fullRequest.requester_email ?? '-'}</span>
                <div>
                  <span><strong>Criado</strong> {formatDateTime(fullRequest.created_at)}</span>
                  <span><strong>Atualizado</strong> {formatDateTime(fullRequest.updated_at)}</span>
                </div>
              </footer>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modalContent
  return createPortal(modalContent, document.body)
}
