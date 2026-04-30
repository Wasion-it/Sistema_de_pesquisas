import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useAuth } from '../auth/AuthProvider'
import { finalizeAdminAdmissionRequest, getAdminAdmissionApprovalStatus, getAdminDismissalApprovalStatus } from '../services/admin'

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDateOnly(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function formatCurrency(value, currency = 'BRL') {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(Number(value))
}

const STATUS_META = {
  PENDING: {
    label: 'Pendente',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
    dot: '#f59e0b',
    bar: '#f59e0b',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    description: 'A solicitação ainda aguarda aprovação antes de seguir para o RH.',
  },
  UNDER_REVIEW: {
    label: 'Em análise',
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#bfdbfe',
    dot: '#3b82f6',
    bar: '#3b82f6',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    description: 'Ainda existem etapas pendentes. O RH não deve iniciar o processo.',
  },
  APPROVED: {
    label: 'Aprovada',
    color: '#15803d',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    dot: '#22c55e',
    bar: '#22c55e',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    description: 'A solicitação está liberada. O RH já pode iniciar o fluxo operacional.',
  },
  FINALIZED: {
    label: 'Finalizada',
    color: '#0f766e',
    bg: '#f0fdfa',
    border: '#99f6e4',
    dot: '#14b8a6',
    bar: '#14b8a6',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
    description: 'A vaga foi concluída e encerrada pelo RH.',
  },
  REJECTED: {
    label: 'Rejeitada',
    color: '#b91c1c',
    bg: '#fef2f2',
    border: '#fecaca',
    dot: '#ef4444',
    bar: '#ef4444',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    description: 'A solicitação foi bloqueada. O RH não deve prosseguir com o processo.',
  },
}

const REQUEST_KIND_LABELS = {
  ADMISSION: 'Admissão',
  DISMISSAL: 'Demissão',
}

const REQUEST_KIND_TO_FETCHER = {
  admission: getAdminAdmissionApprovalStatus,
  dismissal: getAdminDismissalApprovalStatus,
}

function normalizeRequestKind(kind) {
  return String(kind ?? '').toLowerCase()
}

function getApprovalProgress(steps = []) {
  const total = steps.length
  const approved = steps.filter((s) => s.status === 'APPROVED').length
  const rejected = steps.some((s) => s.status === 'REJECTED')
  const currentStep = steps.find((s) => s.status === 'PENDING') ?? null
  const progress = total === 0 ? 0 : Math.round((approved / total) * 100)
  return { total, approved, rejected, currentStep, progress }
}

function getStepDecisionSummary(step) {
  if (!step.decided_by_user_name && !step.decided_at) return null
  if (step.decided_by_user_name && step.decided_at)
    return `${step.decided_by_user_name} · ${formatDateTime(step.decided_at)}`
  if (step.decided_by_user_name) return step.decided_by_user_name
  return formatDateTime(step.decided_at)
}

function StepNode({ step, isCurrent, totalSteps }) {
  const isApproved = step.status === 'APPROVED'
  const isRejected = step.status === 'REJECTED'
  const isPending = step.status === 'PENDING'
  const decisionSummary = getStepDecisionSummary(step)

  const nodeColor = isApproved ? '#22c55e' : isRejected ? '#ef4444' : isCurrent ? '#3b82f6' : '#cbd5e1'
  const nodeBg = isApproved ? '#f0fdf4' : isRejected ? '#fef2f2' : isCurrent ? '#eff6ff' : '#f8fafc'
  const nodeBorder = isApproved ? '#bbf7d0' : isRejected ? '#fecaca' : isCurrent ? '#bfdbfe' : '#e2e8f0'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 14,
        background: nodeBg,
        border: `1px solid ${nodeBorder}`,
        boxShadow: isCurrent ? `0 0 0 3px ${nodeColor}22` : 'none',
        transition: 'all .15s',
        position: 'relative',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: nodeColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {isApproved ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        ) : isRejected ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        ) : step.step_order}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <strong style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>
            {step.approver_label}
          </strong>
          {isCurrent && (
            <span
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 9px',
                borderRadius: 999,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 2s infinite' }} />
              Aguardando
            </span>
          )}
          {isApproved && (
            <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#15803d' }}>Concluída</span>
          )}
          {isRejected && (
            <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>Rejeitada</span>
          )}
        </div>
        {decisionSummary && (
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{decisionSummary}</p>
        )}
      </div>
    </div>
  )
}

function ApprovalFlowSection({ steps, requestStatus }) {
  const { total, approved, rejected, currentStep, progress } = getApprovalProgress(steps)
  const currentStepOrder = currentStep?.step_order ?? null
  const isInterrupted = rejected || requestStatus === 'REJECTED'
  const isComplete = approved === total && total > 0

  const barColor = isInterrupted ? '#ef4444' : isComplete ? '#22c55e' : '#3b82f6'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
            Fluxo de aprovação
          </p>
          <strong style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
            {isInterrupted ? 'Fluxo interrompido' : isComplete ? 'Todas as etapas concluídas' : currentStep ? `Etapa ${currentStep.step_order} de ${total}` : 'Processando...'}
          </strong>
        </div>
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 999,
            background: isInterrupted ? '#fef2f2' : isComplete ? '#f0fdf4' : '#eff6ff',
            border: `1px solid ${isInterrupted ? '#fecaca' : isComplete ? '#bbf7d0' : '#bfdbfe'}`,
          }}
        >
          <strong style={{ fontSize: 16, fontWeight: 700, color: barColor }}>{approved}</strong>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>/ {total}</span>
        </div>
      </div>

      <div style={{ position: 'relative', height: 8, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${progress}%`,
            borderRadius: 999,
            background: barColor,
            transition: 'width .5s cubic-bezier(.4,0,.2,1)',
          }}
        />
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {steps.map((step) => (
          <StepNode
            key={step.step_order}
            step={step}
            isCurrent={step.status === 'PENDING' && step.step_order === currentStepOrder}
            totalSteps={total}
          />
        ))}
      </div>
    </div>
  )
}

function MetaField({ label, value, sub }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em' }}>
        {label}
      </span>
      <strong style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>{value}</strong>
      {sub && <span style={{ fontSize: 12, color: '#64748b' }}>{sub}</span>}
    </div>
  )
}

function CandidatesSection({ candidates = [] }) {
  if (!candidates.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionLabel title="Candidatos participantes" count={0} />
        <div style={{ padding: '28px 20px', borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Nenhum candidato registrado ainda.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionLabel title="Candidatos participantes" count={candidates.length} />
      <div style={{ display: 'grid', gap: 8 }}>
        {candidates.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 12,
              background: c.is_hired ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${c.is_hired ? '#bbf7d0' : '#e2e8f0'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div
                style={{
                  flexShrink: 0,
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: c.is_hired ? '#dcfce7' : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: c.is_hired ? '#16a34a' : '#64748b',
                }}
              >
                {c.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{c.full_name}</strong>
                <span style={{ fontSize: 12, color: '#64748b' }}>{c.email}</span>
              </div>
            </div>
            <span
              style={{
                flexShrink: 0,
                padding: '4px 10px',
                borderRadius: 999,
                background: c.is_hired ? '#dcfce7' : '#f1f5f9',
                color: c.is_hired ? '#15803d' : '#64748b',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {c.is_hired ? 'Contratado' : 'Participante'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HiredEmployeesSection({ candidates = [] }) {
  const hired = candidates.filter((c) => c.is_hired)
  if (!hired.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionLabel title="Contratados" count={hired.length} accent="#15803d" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
        {hired.map((c) => (
          <div
            key={c.id}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <strong style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{c.full_name}</strong>
            <span style={{ fontSize: 12, color: '#64748b' }}>{c.email}</span>
            {c.phone_number && <span style={{ fontSize: 12, color: '#94a3b8' }}>{c.phone_number}</span>}
            {c.hire_date && (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d', marginTop: 4 }}>
                Admissão: {formatDateOnly(c.hire_date)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionLabel({ title, count, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: accent ?? '#334155' }}>{title}</span>
      {count !== undefined && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 22,
            height: 22,
            padding: '0 7px',
            borderRadius: 999,
            background: '#f1f5f9',
            color: '#64748b',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
    </div>
  )
}

export function ApprovalStatusModal({ request, token, onClose, onUpdated }) {
  const { user } = useAuth()
  const [detail, setDetail] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isFinalizing, setIsFinalizing] = useState(false)

  const requestKind = useMemo(() => normalizeRequestKind(request?.request_kind), [request])
  const fetchDetail = REQUEST_KIND_TO_FETCHER[requestKind]

  useEffect(() => {
    let isMounted = true
    if (!request || !fetchDetail || !token) {
      setDetail(null)
      setErrorMessage('')
      setIsLoading(false)
      setIsFinalizing(false)
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

  const fullRequest = detail ?? request
  const status = fullRequest.request_status ?? request.status
  const statusMeta = STATUS_META[status] ?? STATUS_META.PENDING
  const requestKindLabel = REQUEST_KIND_LABELS[String(fullRequest.request_kind ?? '').toUpperCase()] ?? fullRequest.request_kind
  const admissionQuantity = request?.quantity_people ?? 0
  const admissionHiredCount = request?.hired_employee_count ?? 0
  const canFinalizeAdmission =
    request?.request_kind === 'ADMISSION' &&
    status === 'APPROVED' &&
    admissionQuantity > 0 &&
    admissionHiredCount >= admissionQuantity

  async function handleFinalizeAdmission() {
    if (!token || !request?.request_id) return
    setIsFinalizing(true)
    setErrorMessage('')
    try {
      await finalizeAdminAdmissionRequest(token, request.request_id)
      const refreshed = await fetchDetail(token, request.request_id)
      setDetail(refreshed)
      if (onUpdated) onUpdated(refreshed)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsFinalizing(false)
    }
  }

  const modalContent = (
    <div
      className="request-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-status-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(100%, 680px)',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 24,
          background: '#fff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 24px 64px rgba(15,23,42,.18)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: '24px 28px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: '#f1f5f9',
                  color: '#475569',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                }}
              >
                {requestKindLabel}
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: statusMeta.bg,
                  border: `1px solid ${statusMeta.border}`,
                  color: statusMeta.color,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <span style={{ display: 'flex', color: statusMeta.color }}>{statusMeta.icon}</span>
                {statusMeta.label}
              </span>
            </div>

            <h3
              id="approval-status-title"
              style={{
                margin: 0,
                fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
                fontFamily: 'var(--font-display, Georgia, serif)',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.2,
                letterSpacing: '-.01em',
              }}
            >
              {fullRequest.request_title}
            </h3>

            {fullRequest.request_subtitle && (
              <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                {fullRequest.request_subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              flexShrink: 0,
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Status banner ── */}
        <div
          style={{
            margin: '0 28px',
            marginTop: 20,
            padding: '14px 18px',
            borderRadius: 14,
            background: statusMeta.bg,
            border: `1px solid ${statusMeta.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#fff',
              border: `1px solid ${statusMeta.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: statusMeta.color,
            }}
          >
            {statusMeta.icon}
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: 14, fontWeight: 700, color: statusMeta.color, marginBottom: 2 }}>
              {statusMeta.label}
            </strong>
            <p style={{ margin: 0, fontSize: 13, color: statusMeta.color, opacity: .85, lineHeight: 1.5 }}>
              {statusMeta.description}
            </p>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 0' }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  border: '2.5px solid #dbeafe',
                  borderTopColor: '#2563eb',
                  borderRadius: '50%',
                  animation: 'spin .7s linear infinite',
                }}
              />
              <span style={{ fontSize: 14, color: '#64748b' }}>Carregando detalhes...</span>
            </div>
          )}

          {errorMessage && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 14 }}>
              {errorMessage}
            </div>
          )}

          {!isLoading && (
            <>
              {/* Flow tracker */}
              {(fullRequest.steps ?? []).length > 0 && (
                <ApprovalFlowSection steps={fullRequest.steps ?? []} requestStatus={status} />
              )}

              {/* Meta info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
                {[
                  { label: 'Fluxo', value: fullRequest.workflow_name },
                  { label: 'Solicitante', value: fullRequest.requester_name, sub: fullRequest.requester_email },
                  {
                    label: 'Etapa atual',
                    value: fullRequest.current_step_label ?? (status === 'APPROVED' || status === 'FINALIZED' ? 'Concluída' : '—'),
                  },
                  {
                    label: 'Atualizado',
                    value: formatDateTime(fullRequest.updated_at),
                    sub: `Criado em ${formatDateTime(fullRequest.created_at)}`,
                  },
                  ...(request?.request_kind === 'ADMISSION'
                    ? [
                        { label: 'Recrutador', value: fullRequest.recruiter_user_name ?? 'Ainda não definido' },
                        { label: 'Salário da vaga', value: formatCurrency(fullRequest.vacancy_salary, fullRequest.vacancy_salary_currency ?? 'BRL') },
                      ]
                    : []),
                ].filter((f) => f.value).map((f, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: '#f8fafc',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <MetaField label={f.label} value={f.value} sub={f.sub} />
                  </div>
                ))}
              </div>

              {/* Post-approval rejection */}
              {request?.request_kind === 'DISMISSAL' && status === 'REJECTED' && fullRequest.post_approval_rejection_reason && (
                <div
                  style={{
                    padding: '16px 18px',
                    borderRadius: 14,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <strong style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>Recusa após aprovação</strong>
                  <p style={{ margin: 0, fontSize: 13, color: '#7f1d1d', lineHeight: 1.65 }}>{fullRequest.post_approval_rejection_reason}</p>
                  <span style={{ fontSize: 12, color: '#ef4444' }}>Registrada em {formatDateTime(fullRequest.post_approval_rejected_at)}</span>
                </div>
              )}

              {/* Recruiter note */}
              {fullRequest.recruiter_user_name && (
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  <div>
                    <strong style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 2 }}>
                      {request?.request_kind === 'ADMISSION' ? 'Recrutador designado' : 'Analista designado'}
                    </strong>
                    <span style={{ fontSize: 13, color: '#1d4ed8' }}>
                      {fullRequest.recruiter_user_name}
                      {fullRequest.recruiter_user_email ? ` · ${fullRequest.recruiter_user_email}` : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Candidates */}
              {request?.request_kind === 'ADMISSION' && (fullRequest.candidates ?? []).length > 0 && (
                <CandidatesSection candidates={fullRequest.candidates ?? []} />
              )}

              {/* Hired */}
              <HiredEmployeesSection candidates={fullRequest.candidates ?? []} />

              {/* Finalize action */}
              {request?.request_kind === 'ADMISSION' && canFinalizeAdmission && (
                <div
                  style={{
                    padding: '18px 20px',
                    borderRadius: 16,
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#15803d', marginBottom: 4 }}>
                      Todas as posições preenchidas
                    </strong>
                    <p style={{ margin: 0, fontSize: 13, color: '#16a34a' }}>
                      Clique para encerrar oficialmente esta vaga.
                    </p>
                  </div>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={handleFinalizeAdmission}
                    disabled={isFinalizing}
                    style={{ background: '#16a34a', flexShrink: 0 }}
                  >
                    {isFinalizing ? 'Finalizando...' : 'Finalizar vaga'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer timestamps ── */}
        <div
          style={{
            padding: '14px 28px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            {fullRequest.requester_email ?? '—'}
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Atualizado {formatDateTime(fullRequest.updated_at)}
          </span>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modalContent
  return createPortal(modalContent, document.body)
}
