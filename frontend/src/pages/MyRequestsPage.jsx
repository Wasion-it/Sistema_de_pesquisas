import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { RequestDetailsModal } from '../components/RequestDetailsModal'
import { getMyRequests } from '../services/admin'
import { formatApprovalLabel } from '../utils/approvalLabels'

// ─── Constants ───────────────────────────────────────────────────────────────

const REQUEST_KIND_TABS = {
  all: { label: 'Todas', emptyText: 'Você ainda não enviou solicitações pelo portal.' },
  admission: { label: 'Admissão', emptyText: 'Nenhuma solicitação de admissão encontrada.' },
  dismissal: { label: 'Demissão', emptyText: 'Nenhuma solicitação de demissão encontrada.' },
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pendente',
    color: '#F28C1B',
    bg: '#FFF4E6',
    border: '#FED7AA',
    dot: '#F28C1B',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  UNDER_REVIEW: {
    label: 'Em análise',
    color: '#1F4E99',
    bg: '#EAF1FB',
    border: '#BFD1EA',
    dot: '#2E5DA8',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  APPROVED: {
    label: 'Aprovada',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    dot: '#22c55e',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
  FINALIZED: {
    label: 'Finalizada',
    color: '#15803d',
    bg: '#ecfdf5',
    border: '#bbf7d0',
    dot: '#16a34a',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  REJECTED: {
    label: 'Rejeitada',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    dot: '#ef4444',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    ),
  },
  CANCELED: {
    label: 'Cancelada',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    dot: '#94a3b8',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
    ),
  },
}

const REQUEST_KIND_CONFIG = {
  ADMISSION: { label: 'Admissão', color: '#1F4E99', bg: '#EAF1FB' },
  DISMISSAL: { label: 'Demissão', color: '#F28C1B', bg: '#FFF4E6' },
}

const STEP_STATUS_CONFIG = {
  APPROVED: { className: 'completed', label: 'Concluída', color: '#16a34a', bg: '#f0fdf4' },
  PENDING: { className: 'current', label: 'Aguardando', color: '#1F4E99', bg: '#EAF1FB' },
  REJECTED: { className: 'rejected', label: 'Rejeitada', color: '#dc2626', bg: '#fef2f2' },
  SKIPPED: { className: 'skipped', label: 'Ignorada', color: '#94a3b8', bg: '#f8fafc' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function formatDateShort(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function normalizeRequestKind(kind) {
  return String(kind ?? '').toLowerCase()
}

function getApprovalProgress(steps = []) {
  const total = steps.length
  const approved = steps.filter((s) => s.status === 'APPROVED').length
  const skipped = steps.filter((s) => s.status === 'SKIPPED').length
  const rejected = steps.some((s) => s.status === 'REJECTED')
  const currentStep = steps.find((s) => s.status === 'PENDING') ?? null
  const completed = approved + skipped
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100)
  return { total, approved, skipped, completed, rejected, currentStep, progress }
}

function getCurrentStepLabel(item) {
  if (item.current_step_label) return formatApprovalLabel(item.current_step_label)
  if (['APPROVED', 'FINALIZED', 'REJECTED', 'CANCELED'].includes(item.request_status)) return 'Concluída'
  return 'Aguardando etapa'
}

function getStepDecisionSummary(step) {
  if (!step.decided_by_user_name && !step.decided_at) return null
  if (step.decided_by_user_name && step.decided_at)
    return `${step.decided_by_user_name} · ${formatDateShort(step.decided_at)}`
  if (step.decided_by_user_name) return step.decided_by_user_name
  return formatDateShort(step.decided_at)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 11px',
      borderRadius: 999,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      color: cfg.color,
      fontSize: 12, fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function KindBadge({ kind }) {
  const cfg = REQUEST_KIND_CONFIG[kind] ?? { label: kind, color: '#64748b', bg: '#f1f5f9' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px',
      borderRadius: 999,
      background: cfg.bg,
      color: cfg.color,
      fontSize: 11, fontWeight: 700,
      letterSpacing: '.03em',
      textTransform: 'uppercase',
    }}>
      {cfg.label}
    </span>
  )
}

function ApprovalFlowTracker({ steps }) {
  if (!steps || steps.length === 0) return null
  const { total, approved, rejected, currentStep, progress } = getApprovalProgress(steps)
  const currentStepOrder = currentStep?.step_order ?? null
  const progressLabel = rejected
    ? 'Fluxo interrompido'
    : currentStep
    ? `Etapa ${currentStep.step_order} de ${total}`
    : 'Fluxo concluído'

  return (
    <div style={{
      padding: '16px 18px',
      borderRadius: 14,
      background: rejected
        ? 'linear-gradient(180deg,#fef2f2 0%,#fff 100%)'
        : approved === total
        ? 'linear-gradient(180deg,#f0fdf4 0%,#fff 100%)'
        : 'linear-gradient(180deg,#EAF1FB 0%,#fff 100%)',
      border: `1px solid ${rejected ? '#fecaca' : approved === total ? '#bbf7d0' : '#BFD1EA'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: rejected ? '#dc2626' : approved === total ? '#16a34a' : '#1F4E99', marginBottom: 4 }}>
            Fluxo de aprovação
          </span>
          <strong style={{ fontSize: 13, color: 'var(--slate-800)', fontWeight: 600 }}>{progressLabel}</strong>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-500)', flexShrink: 0 }}>
          {approved}/{total}
        </span>
      </div>

      <div style={{ height: 5, borderRadius: 999, background: 'rgba(148,163,184,.2)', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          borderRadius: 999,
          background: rejected
            ? 'linear-gradient(90deg,#ef4444,#dc2626)'
            : approved === total
            ? 'linear-gradient(90deg,#22c55e,#16a34a)'
            : 'linear-gradient(90deg,#2E5DA8,#1F4E99)',
          transition: 'width .4s ease',
        }} />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {steps.map((step) => {
          const cfg = STEP_STATUS_CONFIG[step.status] ?? STEP_STATUS_CONFIG.PENDING
          const isCurrent = step.status === 'PENDING' && step.step_order === currentStepOrder
          const decisionSummary = getStepDecisionSummary(step)
          return (
            <div
              key={step.step_order}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px',
                borderRadius: 10,
                background: cfg.bg,
                border: `1px solid ${isCurrent ? cfg.color + '44' : 'transparent'}`,
                boxShadow: isCurrent ? `0 0 0 2px ${cfg.color}22` : 'none',
                minWidth: 0,
              }}
            >
              <div style={{
                flexShrink: 0,
                width: 22, height: 22,
                borderRadius: '50%',
                background: cfg.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#fff',
              }}>
                {step.status === 'APPROVED' ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : step.status === 'REJECTED' ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                ) : (
                  step.step_order
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 12, fontWeight: 600, color: cfg.color, whiteSpace: 'nowrap' }}>
                  {formatApprovalLabel(step.approver_label)}
                </strong>
                {decisionSummary && (
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--slate-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                    {decisionSummary}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RequestCard({ item, onViewDetails }) {
  const statusCfg = STATUS_CONFIG[item.request_status] ?? STATUS_CONFIG.PENDING
  const kindKey = String(item.request_kind ?? '').toUpperCase()
  const currentStepLabel = getCurrentStepLabel(item)
  const { progress, approved, total, rejected } = getApprovalProgress(item.steps ?? [])

  return (
    <article style={{
      borderRadius: 18,
      background: '#fff',
      border: '1px solid var(--slate-200)',
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(15,23,42,.04)',
      transition: 'box-shadow 160ms, border-color 160ms',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,23,42,.09)'; e.currentTarget.style.borderColor = 'var(--slate-300)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,.04)'; e.currentTarget.style.borderColor = 'var(--slate-200)' }}
    >
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${statusCfg.dot}, ${statusCfg.color})`,
      }} />

      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <KindBadge kind={kindKey} />
              <StatusBadge status={item.request_status} />
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '4px 10px', borderRadius: 6,
                background: '#eef2ff', color: '#3730a3',
                fontSize: 11, fontWeight: 700,
              }}>
                ID #{item.request_id}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontFamily: 'var(--font-display)', color: 'var(--slate-900)', lineHeight: 1.3 }}>
              {item.request_title}
            </h3>
            {item.request_subtitle && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.5 }}>
                {item.request_subtitle}
              </p>
            )}
          </div>

          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <MiniProgressRing progress={progress} rejected={rejected} approved={approved === total && total > 0} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {approved}/{total}
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
          gap: 10,
        }}>
          <MetaCell
            label="Fluxo"
            value={item.workflow_name}
            sub={currentStepLabel}
          />
          <MetaCell
            label="Criado em"
            value={formatDateShort(item.created_at)}
            sub={formatDateTime(item.updated_at) !== formatDateTime(item.created_at) ? `Atualizado ${formatDateShort(item.updated_at)}` : null}
          />
          <MetaCell
            label="Etapa atual"
            value={currentStepLabel}
            highlight={item.request_status === 'UNDER_REVIEW'}
          />
        </div>

        <ApprovalFlowTracker steps={item.steps ?? []} />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onViewDetails(item)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, padding: '9px 16px' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Ver detalhes
          </button>
        </div>
      </div>
    </article>
  )
}

function MiniProgressRing({ progress, rejected, approved }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const dash = (progress / 100) * circ
  const color = rejected ? '#ef4444' : approved ? '#22c55e' : '#1F4E99'

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--slate-100)" strokeWidth="3.5" />
      <circle
        cx="22" cy="22" r={r}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .5s ease' }}
      />
    </svg>
  )
}

function MetaCell({ label, value, sub, highlight }) {
  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: 10,
      background: highlight ? '#EAF1FB' : 'var(--slate-50)',
      border: `1px solid ${highlight ? '#BFD1EA' : 'var(--slate-100)'}`,
    }}>
      <span style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: highlight ? '#1F4E99' : 'var(--slate-400)', marginBottom: 4 }}>
        {label}
      </span>
      <strong style={{ display: 'block', fontSize: 13, fontWeight: 600, color: highlight ? '#163B73' : 'var(--slate-800)', lineHeight: 1.3, wordBreak: 'break-word' }}>
        {value || '—'}
      </strong>
      {sub && (
        <span style={{ display: 'block', fontSize: 11, color: highlight ? '#2E5DA8' : 'var(--slate-400)', marginTop: 2 }}>
          {sub}
        </span>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <article style={{
      padding: '18px 20px',
      borderRadius: 16,
      background: '#fff',
      border: '1px solid var(--slate-200)',
      boxShadow: '0 1px 3px rgba(15,23,42,.05)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: color ?? 'linear-gradient(90deg, #1F4E99, #2E5DA8)',
      }} />
      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--slate-400)', marginBottom: 10 }}>
        {label}
      </span>
      <strong style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--slate-900)', lineHeight: 1, letterSpacing: '-.02em' }}>
        {value}
      </strong>
    </article>
  )
}

function TabButton({ label, count, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 9,
        padding: '11px 18px',
        borderRadius: 12,
        border: isActive ? '1.5px solid #BFD1EA' : '1.5px solid var(--slate-200)',
        background: isActive ? 'linear-gradient(180deg, #EAF1FB 0%, #fff 100%)' : 'linear-gradient(180deg, #fff 0%, var(--slate-50) 100%)',
        color: isActive ? '#163B73' : 'var(--slate-600)',
        fontSize: 13, fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 140ms',
        boxShadow: isActive ? '0 4px 12px rgba(31,78,153,.1)' : 'none',
      }}
    >
      <span>{label}</span>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 24, height: 24, padding: '0 7px',
        borderRadius: 999,
        background: isActive ? '#1F4E99' : 'var(--slate-200)',
        color: isActive ? '#fff' : 'var(--slate-600)',
        fontSize: 11, fontWeight: 700,
      }}>
        {count}
      </span>
    </button>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '72px 32px' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: 'var(--slate-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--slate-300)',
        marginBottom: 4,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/>
          <path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>
        </svg>
      </div>
      <strong style={{ fontSize: 16, color: 'var(--slate-700)', fontWeight: 600 }}>Nenhuma solicitação encontrada</strong>
      <span style={{ fontSize: 14, color: 'var(--slate-400)', maxWidth: 300, lineHeight: 1.65 }}>{text}</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MyRequestsPage() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    getMyRequests(token)
      .then((data) => { if (isMounted) { setRequests(data.items ?? []); setErrorMessage('') } })
      .catch((error) => { if (isMounted) setErrorMessage(error.message) })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [token])

  const countsByKind = useMemo(() => ({
    all: requests.length,
    admission: requests.filter((r) => normalizeRequestKind(r.request_kind) === 'admission').length,
    dismissal: requests.filter((r) => normalizeRequestKind(r.request_kind) === 'dismissal').length,
  }), [requests])

  const visibleRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filteredByKind = activeTab === 'all'
      ? requests
      : requests.filter((r) => normalizeRequestKind(r.request_kind) === activeTab)

    if (!normalizedQuery) return filteredByKind

    return filteredByKind.filter((item) => {
      const haystack = [
        item.request_title,
        item.request_subtitle,
        item.request_status,
        item.request_kind,
        item.workflow_name,
        formatApprovalLabel(item.current_step_label),
        item.requester_name,
        item.requester_email,
        ...(item.steps ?? []).map((s) => `${formatApprovalLabel(s.approver_label)} ${s.status}`),
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [activeTab, query, requests])

  const summary = useMemo(() => ({
    total: visibleRequests.length,
    pending: visibleRequests.filter((r) => r.request_status === 'PENDING').length,
    underReview: visibleRequests.filter((r) => r.request_status === 'UNDER_REVIEW').length,
    approved: visibleRequests.filter((r) => r.request_status === 'APPROVED').length,
    rejected: visibleRequests.filter((r) => r.request_status === 'REJECTED').length,
  }), [visibleRequests])

  const firstName = user?.full_name?.split(' ')[0] ?? 'usuário'

  return (
    <main
      className="page-shell"
      style={{ background: 'linear-gradient(150deg, var(--slate-50) 0%, #EAF1FB 50%, #F5F8FC 100%)' }}
    >
      <div className="admin-view admin-home-view" style={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
          paddingBottom: 8,
        }}>
          <div>
            <span className="eyebrow" style={{ color: '#F28C1B' }}>Solicitações RH</span>
            <h2 style={{ margin: '4px 0 6px', fontSize: 'clamp(1.4rem, 2.2vw, 1.85rem)', letterSpacing: '-.02em' }}>
              Minhas solicitações
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {firstName} · Acompanhe o andamento de cada pedido em tempo real.
            </p>
          </div>
          <Link className="secondary-link-button" to="/">← Voltar para a home</Link>
        </div>

        {errorMessage && (
          <div className="form-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {errorMessage}
          </div>
        )}

        {!isLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 12 }}>
            <StatCard label="Total" value={summary.total} color="linear-gradient(90deg, var(--slate-400), var(--slate-300))" />
            <StatCard label="Pendentes" value={summary.pending} color="linear-gradient(90deg, #F28C1B, #d97706)" />
            <StatCard label="Em análise" value={summary.underReview} color="linear-gradient(90deg, #2E5DA8, #1F4E99)" />
            <StatCard label="Aprovadas" value={summary.approved} color="linear-gradient(90deg, #22c55e, #16a34a)" />
            <StatCard label="Rejeitadas" value={summary.rejected} color="linear-gradient(90deg, #f87171, #dc2626)" />
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
          padding: '16px 20px',
          borderRadius: 16,
          background: '#fff',
          border: '1px solid var(--slate-200)',
          boxShadow: '0 1px 3px rgba(15,23,42,.04)',
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(REQUEST_KIND_TABS).map(([kind, cfg]) => (
              <TabButton
                key={kind}
                label={cfg.label}
                count={countsByKind[kind]}
                isActive={activeTab === kind}
                onClick={() => { setActiveTab(kind); setQuery('') }}
              />
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: 260 }}>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder="Buscar por título, status…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 36px 10px 38px',
                border: '1.5px solid var(--slate-200)',
                borderRadius: 10,
                background: 'var(--slate-50)',
                color: 'var(--slate-900)',
                fontSize: 13,
                outline: 'none',
                transition: 'border-color 140ms, box-shadow 140ms',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#1F4E99'; e.target.style.boxShadow = '0 0 0 3px rgba(31,78,153,.08)'; e.target.style.background = '#fff' }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--slate-200)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--slate-50)' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 20, height: 20, borderRadius: '50%',
                  border: 'none', background: 'var(--slate-200)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--slate-500)',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {!isLoading && visibleRequests.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--slate-400)', fontWeight: 600 }}>
              {visibleRequests.length} solicitaç{visibleRequests.length === 1 ? 'ão' : 'ões'} encontrada{visibleRequests.length === 1 ? '' : 's'}
            </span>
            {query && (
              <span style={{
                padding: '3px 10px', borderRadius: 999,
                background: '#EAF1FB', color: '#163B73',
                fontSize: 12, fontWeight: 600,
              }}>
                "{query}"
              </span>
            )}
          </div>
        )}

        {isLoading ? (
          <div style={{
            padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            borderRadius: 20, background: '#fff', border: '1px solid var(--slate-200)',
          }}>
            <div style={{
              width: 36, height: 36,
              border: '3px solid #BFD1EA', borderTopColor: '#1F4E99',
              borderRadius: '50%', animation: 'spin .7s linear infinite',
            }} />
            <p style={{ margin: 0, fontSize: 14, color: 'var(--slate-400)', fontWeight: 500 }}>
              Carregando suas solicitações…
            </p>
          </div>
        ) : visibleRequests.length === 0 ? (
          <div style={{ borderRadius: 20, background: '#fff', border: '1px solid var(--slate-200)' }}>
            <EmptyState text={REQUEST_KIND_TABS[activeTab]?.emptyText ?? 'Nenhuma solicitação encontrada.'} />
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {visibleRequests.map((item) => (
              <RequestCard
                key={`${item.request_kind}-${item.request_id}`}
                item={item}
                onViewDetails={setSelectedRequest}
              />
            ))}
          </div>
        )}

        <RequestDetailsModal
          request={selectedRequest}
          token={token}
          onClose={() => setSelectedRequest(null)}
        />
      </div>
    </main>
  )
}
