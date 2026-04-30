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
  PENDING:      { label: 'Pendente',    color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  UNDER_REVIEW: { label: 'Em análise',  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
  APPROVED:     { label: 'Aprovada',    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  FINALIZED:    { label: 'Finalizada',  color: '#15803d', bg: '#ecfdf5', border: '#a7f3d0', dot: '#16a34a' },
  REJECTED:     { label: 'Rejeitada',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  CANCELED:     { label: 'Cancelada',   color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8' },
}

const KIND_CONFIG = {
  ADMISSION: { label: 'Admissão',  color: '#7c3aed', bg: '#ede9fe' },
  DISMISSAL: { label: 'Demissão',  color: '#0284c7', bg: '#e0f2fe' },
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

/* ── Small building blocks ─────────────────────────────────────────── */

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 999,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, fontSize: 12, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

function KindBadge({ kind }) {
  const cfg = KIND_CONFIG[String(kind ?? '').toUpperCase()] ?? { label: kind, color: '#64748b', bg: '#f1f5f9' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 6,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
    }}>
      {cfg.label}
    </span>
  )
}

function InfoChip({ label, value, accent }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div style={{
      display: 'grid', gap: 4,
      padding: '12px 14px', borderRadius: 12,
      background: accent ? `${accent}0d` : 'var(--slate-50)',
      border: `1px solid ${accent ? `${accent}22` : 'var(--slate-100)'}`,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
        textTransform: 'uppercase', color: accent ?? 'var(--slate-400)',
      }}>
        {label}
      </span>
      <strong style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-800)', lineHeight: 1.4 }}>
        {value}
      </strong>
    </div>
  )
}

function SectionDivider({ title, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 2px' }}>
      {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
      <span style={{
        fontSize: 10, fontWeight: 800, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--slate-400)',
      }}>
        {title}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--slate-100)' }} />
    </div>
  )
}

function BooleanChip({ label, value, trueColor, falseColor }) {
  const color  = value ? (trueColor ?? '#16a34a') : (falseColor ?? '#64748b')
  const bg     = value ? '#f0fdf4' : '#f8fafc'
  const border = value ? '#bbf7d0' : '#e2e8f0'
  return (
    <div style={{
      display: 'grid', gap: 4,
      padding: '12px 14px', borderRadius: 12,
      background: bg, border: `1px solid ${border}`,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
        textTransform: 'uppercase', color: 'var(--slate-400)',
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <strong style={{ fontSize: 13, fontWeight: 700, color }}>{value ? 'Sim' : 'Não'}</strong>
      </div>
    </div>
  )
}

/* ── Main modal ─────────────────────────────────────────────────────── */

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
      .then((data)   => { if (isMounted) setDetail(data) })
      .catch((error) => { if (isMounted) setErrorMessage(error.message) })
      .finally(()    => { if (isMounted) setIsLoading(false) })

    return () => { isMounted = false }
  }, [fetchDetail, request, token])

  if (!request) return null

  const fullRequest = mergeDetailAndQueue(request, detail)
  const isAdmission = requestKind === 'admission'
  const isDismissal = requestKind === 'dismissal'

  const modalContent = (
    <div
      className="request-modal-backdrop"
      role="presentation"
      onClick={onClose}
      style={{ alignItems: 'center' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-details-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(100%, 760px)',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 24,
          background: '#fff',
          border: '1px solid var(--slate-200)',
          boxShadow: '0 24px 64px rgba(15,23,42,.18)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Hero header ───────────────────────────────────── */}
        <div style={{
          padding: '28px 28px 24px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
          borderRadius: '24px 24px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* decorative glow */}
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 180, height: 180, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(96,165,250,.2), transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between', gap: 16,
            position: 'relative', zIndex: 1,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              {/* badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <KindBadge kind={fullRequest.request_kind} />
                <StatusBadge status={fullRequest.request_status} />
              </div>

              <h3
                id="request-details-title"
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.1rem,2vw,1.4rem)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1.2,
                  letterSpacing: '-.01em',
                }}
              >
                {fullRequest.request_title}
              </h3>

              {fullRequest.request_subtitle && (
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(203,213,225,.85)', lineHeight: 1.5 }}>
                  {fullRequest.request_subtitle}
                </p>
              )}
            </div>

            {/* close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal"
              style={{
                flexShrink: 0, width: 36, height: 36,
                borderRadius: 10, border: '1px solid rgba(255,255,255,.15)',
                background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.8)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.18)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.08)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* meta pills */}
          {!isLoading && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18, position: 'relative', zIndex: 1 }}>
              {[
                { icon: '🔁', text: fullRequest.workflow_name },
                { icon: '👤', text: fullRequest.requester_name },
                { icon: '📅', text: `Criado ${formatDateTime(fullRequest.created_at)}` },
              ].filter((item) => item.text).map((item) => (
                <span
                  key={item.text}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 11px', borderRadius: 999,
                    background: 'rgba(255,255,255,.09)', border: '1px solid rgba(255,255,255,.12)',
                    color: 'rgba(226,232,240,.9)', fontSize: 12, fontWeight: 500,
                  }}
                >
                  <span style={{ fontSize: 11 }}>{item.icon}</span>
                  {item.text}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Body ──────────────────────────────────────────── */}
        <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Loading */}
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' }}>
              <div style={{
                width: 28, height: 28,
                border: '3px solid var(--blue-100)', borderTopColor: 'var(--blue-600)',
                borderRadius: '50%', animation: 'spin .7s linear infinite',
              }} />
              <span style={{ fontSize: 13, color: 'var(--slate-400)', fontWeight: 500 }}>
                Carregando detalhes...
              </span>
            </div>
          )}

          {/* Error */}
          {errorMessage && (
            <div className="form-error">{errorMessage}</div>
          )}

          {/* Content */}
          {!isLoading && (
            <>
              {/* ── Admissão ────────────────────────── */}
              {isAdmission && (
                <>
                  <SectionDivider title="Identificação da vaga" icon="🏷️" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
                    <InfoChip
                      label="Tipo de admissão"
                      value={REQUEST_TYPE_LABELS[fullRequest.request_type] ?? fullRequest.request_type}
                      accent="#7c3aed"
                    />
                    <InfoChip
                      label="Posição da vaga"
                      value={ADMISSION_POSITION_LABELS[fullRequest.posicao_vaga] ?? fullRequest.posicao_vaga ?? 'Não informada'}
                    />
                    <InfoChip label="Cargo"  value={fullRequest.cargo} accent="#2563eb" />
                    <InfoChip label="Setor"  value={fullRequest.setor} />
                    <InfoChip
                      label="Escopo de recrutamento"
                      value={RECRUITMENT_SCOPE_LABELS[fullRequest.recruitment_scope] ?? fullRequest.recruitment_scope}
                    />
                    <InfoChip label="Turno" value={fullRequest.turno} />
                    <InfoChip
                      label="Regime de contrato"
                      value={CONTRACT_REGIME_LABELS[fullRequest.contract_regime] ?? fullRequest.contract_regime}
                    />
                    <InfoChip label="Quantidade de vagas" value={fullRequest.quantity_people} />
                    <InfoChip
                      label="Salário da vaga"
                      value={formatCurrency(fullRequest.vacancy_salary, fullRequest.vacancy_salary_currency ?? 'BRL')}
                      accent="#16a34a"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
                    <BooleanChip label="Vaga confidencial" value={fullRequest.is_confidential} falseColor="#16a34a" />
                    <InfoChip
                      label="Recrutador"
                      value={fullRequest.recruiter_user_name ?? 'Ainda não definido'}
                      accent="#0284c7"
                    />
                  </div>

                  {fullRequest.substituted_employee_name && (
                    <>
                      <SectionDivider title="Substituição" icon="🔄" />
                      <InfoChip
                        label="Colaborador substituído"
                        value={fullRequest.substituted_employee_name}
                        accent="#d97706"
                      />
                    </>
                  )}

                  {(fullRequest.justification || fullRequest.manager_reminder) && (
                    <>
                      <SectionDivider title="Observações" icon="📝" />
                      <div style={{ display: 'grid', gap: 10 }}>
                        {fullRequest.justification && (
                          <div style={{
                            padding: '14px 16px', borderRadius: 12,
                            background: '#fffbeb', border: '1px solid #fde68a',
                          }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
                              textTransform: 'uppercase', color: '#d97706',
                              display: 'block', marginBottom: 6,
                            }}>
                              Justificativa
                            </span>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-700)', lineHeight: 1.65 }}>
                              {fullRequest.justification}
                            </p>
                          </div>
                        )}
                        {fullRequest.manager_reminder && (
                          <div style={{
                            padding: '14px 16px', borderRadius: 12,
                            background: 'var(--slate-50)', border: '1px solid var(--slate-200)',
                          }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
                              textTransform: 'uppercase', color: 'var(--slate-400)',
                              display: 'block', marginBottom: 6,
                            }}>
                              Observação do gestor
                            </span>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.65 }}>
                              {fullRequest.manager_reminder}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── Demissão ────────────────────────── */}
              {isDismissal && (
                <>
                  <SectionDivider title="Colaborador e vínculo" icon="👤" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
                    <InfoChip label="Nome do colaborador" value={fullRequest.employee_name} accent="#b45309" />
                    <InfoChip label="Cargo" value={fullRequest.cargo} accent="#0284c7" />
                    <InfoChip label="Departamento" value={fullRequest.departamento} />
                    <InfoChip
                      label="Regime de contratação"
                      value={CONTRACT_REGIME_LABELS[fullRequest.contract_regime] ?? fullRequest.contract_regime}
                    />
                  </div>

                  <SectionDivider title="Motivo e continuidade" icon="📋" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
                    <InfoChip
                      label="Tipo de demissão"
                      value={DISMISSAL_TYPE_LABELS[fullRequest.dismissal_type] ?? fullRequest.dismissal_type}
                      accent="#dc2626"
                    />
                    <InfoChip
                      label="Data estimada do desligamento"
                      value={fullRequest.estimated_termination_date ? formatDateOnly(fullRequest.estimated_termination_date) : 'Não informada'}
                      accent="#d97706"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
                    <BooleanChip label="Substituição prevista" value={fullRequest.has_replacement} />
                    <BooleanChip
                      label="Pode ser recontratada"
                      value={fullRequest.can_be_rehired}
                      falseColor="#dc2626"
                    />
                  </div>

                  {!fullRequest.can_be_rehired && fullRequest.rehire_justification && (
                    <>
                      <SectionDivider title="Restrição de recontratação" icon="🚫" />
                      <div style={{
                        padding: '14px 16px', borderRadius: 12,
                        background: '#fef2f2', border: '1px solid #fecaca',
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
                          textTransform: 'uppercase', color: '#dc2626',
                          display: 'block', marginBottom: 6,
                        }}>
                          Justificativa
                        </span>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-700)', lineHeight: 1.65 }}>
                          {fullRequest.rehire_justification}
                        </p>
                      </div>
                    </>
                  )}

                  <div style={{
                    display: 'flex',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '1px solid #fde68a',
                    background: '#fffbeb',
                  }}>
                    <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1 }}>⚠️</span>
                    <div>
                      <strong style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                        Lembrete operacional
                      </strong>
                      <p style={{ margin: '0 0 4px', fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
                        Se houver reposição da posição, a nova vaga deve seguir o fluxo específico de admissão.
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
                        Revise o tipo e a data estimada do desligamento antes de avançar a solicitação no fluxo.
                      </p>
                    </div>
                  </div>

                  {fullRequest.manager_reminder && (
                    <>
                      <SectionDivider title="Observações" icon="📝" />
                      <div style={{
                        padding: '14px 16px', borderRadius: 12,
                        background: 'var(--slate-50)', border: '1px solid var(--slate-200)',
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
                          textTransform: 'uppercase', color: 'var(--slate-400)',
                          display: 'block', marginBottom: 6,
                        }}>
                          Observação do gestor
                        </span>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.65 }}>
                          {fullRequest.manager_reminder}
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── Footer timestamps ─────────────────── */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', flexWrap: 'wrap', gap: 8,
                paddingTop: 16, borderTop: '1px solid var(--slate-100)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--slate-400)', fontWeight: 500 }}>
                  ✉ {fullRequest.requester_email ?? '—'}
                </span>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>
                    <strong style={{ color: 'var(--slate-600)', fontWeight: 600 }}>Criado</strong>{' '}
                    {formatDateTime(fullRequest.created_at)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>
                    <strong style={{ color: 'var(--slate-600)', fontWeight: 600 }}>Atualizado</strong>{' '}
                    {formatDateTime(fullRequest.updated_at)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modalContent
  return createPortal(modalContent, document.body)
}
