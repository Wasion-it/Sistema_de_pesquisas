import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { createAdminSurvey, deleteAdminSurvey, getAdminSurveys } from '../services/admin'

// ─── Constants ───────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  code: '',
  name: '',
  description: '',
  category: '',
  versionTitle: 'Versão 1',
  versionDescription: '',
  dimensions: '',
  isActive: true,
}

const VERSION_STATUS_META = {
  DRAFT: { label: 'Rascunho', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  PUBLISHED: { label: 'Publicada', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  ARCHIVED: { label: 'Arquivada', color: '#94a3b8', bg: '#f1f5f9', border: '#e2e8f0' },
}

const WIZARD_STEPS = [
  { n: 1, label: 'Identificação' },
  { n: 2, label: 'Estrutura' },
]

const CATEGORY_COLORS = [
  { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' },
  { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe', dot: '#8b5cf6' },
  { bg: '#f0fdf4', text: '#14532d', border: '#bbf7d0', dot: '#22c55e' },
  { bg: '#fff7ed', text: '#7c2d12', border: '#fed7aa', dot: '#f97316' },
  { bg: '#fdf4ff', text: '#6b21a8', border: '#f0abfc', dot: '#d946ef' },
  { bg: '#f0fdfa', text: '#064e3b', border: '#99f6e4', dot: '#14b8a6' },
  { bg: '#fff1f2', text: '#881337', border: '#fecdd3', dot: '#f43f5e' },
  { bg: '#fefce8', text: '#713f12', border: '#fef08a', dot: '#eab308' },
]

function getColorForStr(str) {
  if (!str) return CATEGORY_COLORS[0]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length]
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function WizardSteps({ currentStep, step1Valid, onGoTo }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {WIZARD_STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.n
        const isActive = currentStep === step.n
        const canClick = step.n < currentStep || (step.n === 2 && step1Valid)
        return (
          <div key={step.n} style={{ display: 'flex', alignItems: 'center', flex: idx < WIZARD_STEPS.length - 1 ? 1 : 'none' }}>
            <button
              disabled={!canClick}
              type="button"
              onClick={() => canClick && onGoTo(step.n)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'none', border: 'none', padding: 0,
                cursor: canClick ? 'pointer' : 'default',
                opacity: !canClick && !isActive ? 0.45 : 1,
              }}
            >
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: '50%',
                background: isCompleted || isActive ? '#0f172a' : '#e2e8f0',
                color: isCompleted || isActive ? '#fff' : '#94a3b8',
                fontSize: 13, fontWeight: 700,
                flexShrink: 0,
                transition: 'all 200ms',
              }}>
                {isCompleted ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : step.n}
              </span>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: isActive || isCompleted ? '#0f172a' : '#94a3b8',
              }}>
                {step.label}
              </span>
            </button>
            {idx < WIZARD_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 1.5, margin: '0 16px',
                background: isCompleted ? '#0f172a' : '#e2e8f0',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SurveyCard({ survey, onDelete, confirmDeleteId, setConfirmDeleteId, deletingSurveyId, isDeleting }) {
  const color = getColorForStr(survey.code)
  const versionMeta = VERSION_STATUS_META[survey.current_version_status] ?? VERSION_STATUS_META.DRAFT
  const isConfirmingDelete = confirmDeleteId === survey.id
  const isThisDeleting = deletingSurveyId === survey.id

  return (
    <article style={{
      borderRadius: 18,
      background: '#fff',
      border: '1.5px solid #e2e8f0',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'border-color 160ms, box-shadow 160ms',
      boxShadow: '0 1px 4px rgba(15,23,42,.04)',
      position: 'relative',
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#cbd5e1'
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e2e8f0'
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,.04)'
      }}
    >
      {/* Color accent top bar */}
      <div style={{ height: 3, background: color.dot }} />

      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            flexShrink: 0,
            width: 46, height: 46,
            borderRadius: 13,
            background: color.bg,
            border: `1.5px solid ${color.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 800,
            color: color.text,
            letterSpacing: '-.01em',
          }}>
            {getInitials(survey.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'Courier New, monospace',
                fontSize: 11, fontWeight: 700,
                color: color.text,
                background: color.bg,
                padding: '3px 8px', borderRadius: 5,
                letterSpacing: '.03em',
                border: `1px solid ${color.border}`,
              }}>
                {survey.code}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: '#64748b',
                background: '#f1f5f9',
                padding: '3px 8px', borderRadius: 5,
              }}>
                {survey.category}
              </span>
              {!survey.is_active && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: '#94a3b8',
                  background: '#f8fafc',
                  padding: '3px 8px', borderRadius: 5,
                  border: '1px solid #e2e8f0',
                }}>
                  Inativa
                </span>
              )}
            </div>
            <h3 style={{
              margin: 0,
              fontSize: '0.98rem',
              fontWeight: 700,
              color: survey.is_active ? '#0f172a' : '#94a3b8',
              lineHeight: 1.3,
              letterSpacing: '-.01em',
            }}>
              {survey.name}
            </h3>
          </div>
        </div>

        {/* Metrics row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}>
          <MetricChip
            label="Perguntas"
            value={survey.total_questions}
            icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            }
          />
          <MetricChip
            label="Versão"
            value={survey.current_version ?? '—'}
            statusColor={versionMeta.color}
            statusBg={versionMeta.bg}
            icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
              </svg>
            }
          />
          <MetricChip
            label="Campanhas"
            value={survey.active_campaigns > 0 ? `${survey.active_campaigns} ativas` : 'Nenhuma'}
            highlight={survey.active_campaigns > 0}
            icon={
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
              </svg>
            }
          />
        </div>

        {/* Campaign links */}
        {survey.latest_campaign_id ? (
          <div style={{
            display: 'flex', gap: 8,
            padding: '10px 14px',
            background: '#f8fafc',
            borderRadius: 10,
            border: '1px solid #f1f5f9',
          }}>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>Última:</span>
            <Link
              to={`/admin/campaigns/${survey.latest_campaign_id}/responses`}
              style={{
                fontSize: 12, fontWeight: 600, color: '#2563eb',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
              Respostas
            </Link>
            <span style={{ color: '#e2e8f0' }}>·</span>
            <Link
              to={`/admin/campaigns/${survey.latest_campaign_id}/kpis`}
              style={{
                fontSize: 12, fontWeight: 600, color: '#7c3aed',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13l4-4 4 4 6-6 4 4"/>
              </svg>
              KPIs
            </Link>
          </div>
        ) : null}
      </div>

      {/* Footer actions */}
      <div style={{
        padding: '14px 22px',
        borderTop: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        background: '#fafafa',
      }}>
        <Link
          to={`/admin/surveys/${survey.id}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px',
            borderRadius: 9,
            background: '#0f172a',
            color: '#fff',
            fontSize: 12, fontWeight: 700,
            textDecoration: 'none',
            transition: 'background 160ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#0f172a' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Gerenciar
        </Link>

        {!isConfirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDeleteId(survey.id)}
            disabled={isThisDeleting}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '7px 12px',
              borderRadius: 9,
              background: 'transparent',
              border: '1.5px solid #e2e8f0',
              color: '#94a3b8',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 160ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fef2f2'
              e.currentTarget.style.borderColor = '#fecaca'
              e.currentTarget.style.color = '#dc2626'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.color = '#94a3b8'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
            Excluir
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>Confirmar?</span>
            <button
              type="button"
              onClick={() => onDelete(survey)}
              disabled={isThisDeleting}
              style={{
                padding: '6px 11px', borderRadius: 8,
                background: '#fef2f2', border: '1.5px solid #fecaca',
                color: '#dc2626', fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isThisDeleting ? '...' : 'Sim'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              style={{
                padding: '6px 11px', borderRadius: 8,
                background: '#f8fafc', border: '1.5px solid #e2e8f0',
                color: '#64748b', fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Não
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

function MetricChip({ label, value, icon, highlight, statusColor, statusBg }) {
  return (
    <div style={{
      padding: '9px 11px',
      borderRadius: 9,
      background: highlight ? '#eff6ff' : statusBg ?? '#f8fafc',
      border: `1px solid ${highlight ? '#bfdbfe' : '#f1f5f9'}`,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: highlight ? '#2563eb' : statusColor ?? '#94a3b8' }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          {label}
        </span>
      </div>
      <strong style={{
        fontSize: 13, fontWeight: 700,
        color: highlight ? '#1e40af' : statusColor ?? '#334155',
        lineHeight: 1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {value}
      </strong>
    </div>
  )
}

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      padding: '20px 22px',
      borderRadius: 16,
      background: '#fff',
      border: '1.5px solid #e2e8f0',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2.5,
        background: color,
      }} />
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
        textTransform: 'uppercase', color: '#94a3b8',
        display: 'block', marginBottom: 10,
      }}>
        {label}
      </span>
      <strong style={{
        fontSize: '2rem', fontWeight: 900, color: '#0f172a',
        lineHeight: 1, letterSpacing: '-.03em', display: 'block',
      }}>
        {value}
      </strong>
      {sub && (
        <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, display: 'block' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AdminSurveysPage() {
  const { token } = useAuth()
  const [surveys, setSurveys] = useState([])
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [formStep, setFormStep] = useState(1)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingSurveyId, setDeletingSurveyId] = useState(null)

  useEffect(() => {
    let isMounted = true
    getAdminSurveys(token)
      .then((data) => { if (isMounted) { setSurveys(data.items ?? []); setErrorMessage('') } })
      .catch((error) => { if (isMounted) setErrorMessage(error.message) })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [token])

  const filteredSurveys = useMemo(() => {
    const q = query.trim().toLowerCase()
    return surveys.filter((s) => {
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && s.is_active) ||
        (filterStatus === 'inactive' && !s.is_active) ||
        (filterStatus === 'campaign' && s.active_campaigns > 0)
      const matchesQuery = !q || [s.name, s.code, s.category].filter(Boolean).some((v) => v.toLowerCase().includes(q))
      return matchesStatus && matchesQuery
    })
  }, [surveys, query, filterStatus])

  const stats = useMemo(() => ({
    total: surveys.length,
    active: surveys.filter((s) => s.is_active).length,
    withCampaign: surveys.filter((s) => s.active_campaigns > 0).length,
    totalQuestions: surveys.reduce((sum, s) => sum + (s.total_questions ?? 0), 0),
  }), [surveys])

  function handleFieldChange(e) {
    const { name, type, checked, value } = e.target
    setFormValues((cur) => ({ ...cur, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleCloseForm() {
    setFormValues(INITIAL_FORM)
    setFormStep(1)
    setIsFormOpen(false)
    setErrorMessage('')
  }

  async function handleCreateSurvey(e) {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)
    try {
      const created = await createAdminSurvey(token, {
        code: formValues.code.trim().toUpperCase(),
        name: formValues.name.trim(),
        description: formValues.description.trim() || null,
        category: formValues.category.trim(),
        is_active: formValues.isActive,
        version_title: formValues.versionTitle.trim(),
        version_description: formValues.versionDescription.trim() || null,
        dimension_names: formValues.dimensions.split('\n').map((s) => s.trim()).filter(Boolean),
      })
      setSurveys((cur) => [created, ...cur])
      handleCloseForm()
      setSuccessMessage(`Pesquisa "${created.name}" criada com sucesso.`)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteConfirm(survey) {
    setDeletingSurveyId(survey.id)
    setErrorMessage('')
    try {
      const result = await deleteAdminSurvey(token, survey.id)
      setSurveys((cur) => cur.filter((item) => item.id !== survey.id))
      setSuccessMessage(result.message ?? `Pesquisa "${survey.name}" excluída.`)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setDeletingSurveyId(null)
      setConfirmDeleteId(null)
    }
  }

  const step1Valid =
    formValues.code.trim().length >= 3 &&
    formValues.category.trim().length >= 2 &&
    formValues.name.trim().length >= 3 &&
    formValues.versionTitle.trim().length >= 3

  const dimensionTags = formValues.dimensions.split('\n').map((s) => s.trim()).filter(Boolean)

  const filterOptions = [
    { key: 'all', label: 'Todas', count: surveys.length },
    { key: 'active', label: 'Ativas', count: stats.active },
    { key: 'inactive', label: 'Inativas', count: surveys.length - stats.active },
    { key: 'campaign', label: 'Com campanha', count: stats.withCampaign },
  ]

  return (
    <div className="admin-view">

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <span className="eyebrow">Gestão de Pesquisas</span>
          <h2 style={{ margin: '4px 0 8px', fontSize: 'clamp(1.4rem, 2.2vw, 1.85rem)' }}>
            Pesquisas
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Crie, configure e publique pesquisas para os colaboradores.
          </p>
        </div>
        <button
          type="button"
          onClick={() => isFormOpen ? handleCloseForm() : setIsFormOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '11px 20px',
            borderRadius: 12,
            background: isFormOpen ? '#f8fafc' : '#0f172a',
            border: isFormOpen ? '1.5px solid #e2e8f0' : '1.5px solid #0f172a',
            color: isFormOpen ? '#64748b' : '#fff',
            fontSize: 14, fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 160ms',
            flexShrink: 0,
          }}
        >
          {isFormOpen ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
              </svg>
              Cancelar
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
              </svg>
              Nova pesquisa
            </>
          )}
        </button>
      </div>

      {/* ── Stats ── */}
      {!isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          <StatCard label="Total de pesquisas" value={stats.total} color="linear-gradient(90deg, #64748b, #94a3b8)" />
          <StatCard label="Ativas" value={stats.active} color="linear-gradient(90deg, #22c55e, #4ade80)" sub={`${surveys.length - stats.active} inativas`} />
          <StatCard label="Com campanha aberta" value={stats.withCampaign} color="linear-gradient(90deg, #3b82f6, #60a5fa)" />
          <StatCard label="Total de perguntas" value={stats.totalQuestions} color="linear-gradient(90deg, #8b5cf6, #a78bfa)" />
        </div>
      )}

      {/* ── Feedback ── */}
      {successMessage && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 10,
          background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d',
          fontSize: 14, fontWeight: 500,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 16px', borderRadius: 10,
          background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
          fontSize: 14, fontWeight: 500,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {errorMessage}
        </div>
      )}

      {/* ── New survey form (wizard) ── */}
      {isFormOpen && (
        <div style={{
          borderRadius: 20,
          background: '#fff',
          border: '1.5px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(15,23,42,.08)',
          animation: 'fadeUp .2s ease both',
        }}>
          {/* Form header */}
          <div style={{
            padding: '24px 28px 20px',
            background: '#fafafa',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-display)', color: '#0f172a' }}>
                Nova pesquisa
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                Preencha os dados em dois passos para criar a pesquisa.
              </p>
            </div>
            <button type="button" onClick={handleCloseForm} style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1.5px solid #e2e8f0', background: '#fff',
              color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div style={{ padding: '28px' }}>
            <WizardSteps currentStep={formStep} step1Valid={step1Valid} onGoTo={setFormStep} />

            <form onSubmit={formStep === 2 ? handleCreateSurvey : (e) => { e.preventDefault(); setFormStep(2) }}>

              {/* Step 1 */}
              {formStep === 1 && (
                <div style={{ display: 'grid', gap: 18 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                    <label className="field-group">
                      <span>Código único <span className="field-optional">· ex: CLIMA-2026</span></span>
                      <input
                        name="code"
                        minLength={3}
                        placeholder="CLIMA-2026"
                        required
                        value={formValues.code}
                        onChange={handleFieldChange}
                        style={{ fontFamily: 'Courier New, monospace', fontWeight: 700, textTransform: 'uppercase' }}
                        autoFocus
                      />
                    </label>
                    <label className="field-group">
                      <span>Tipo de pesquisa</span>
                      <input name="category" minLength={2} placeholder="Great Place to Work, Clima, Onboarding…" required value={formValues.category} onChange={handleFieldChange} />
                    </label>
                  </div>
                  <label className="field-group">
                    <span>Nome da pesquisa</span>
                    <input name="name" minLength={3} placeholder="Ex: Pesquisa de Clima Organizacional 2026" required value={formValues.name} onChange={handleFieldChange} />
                  </label>
                  <label className="field-group">
                    <span>Descrição <span className="field-optional">· opcional</span></span>
                    <textarea name="description" placeholder="Descreva o objetivo desta pesquisa" rows={3} value={formValues.description} onChange={handleFieldChange} style={{ resize: 'vertical' }} />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'end' }}>
                    <label className="field-group">
                      <span>Título da versão inicial</span>
                      <input name="versionTitle" required value={formValues.versionTitle} onChange={handleFieldChange} />
                    </label>
                    <label className="flag-toggle" style={{ marginBottom: 2 }}>
                      <input checked={formValues.isActive} name="isActive" type="checkbox" onChange={handleFieldChange} />
                      <span>Pesquisa ativa ao criar</span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                    <button className="secondary-button" type="button" onClick={handleCloseForm}>Cancelar</button>
                    <button
                      type="submit"
                      disabled={!step1Valid}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '11px 20px', borderRadius: 10,
                        background: step1Valid ? '#0f172a' : '#e2e8f0',
                        border: 'none',
                        color: step1Valid ? '#fff' : '#94a3b8',
                        fontSize: 14, fontWeight: 700,
                        cursor: step1Valid ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Continuar
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {formStep === 2 && (
                <div style={{ display: 'grid', gap: 18 }}>
                  <label className="field-group">
                    <span>Descrição da versão <span className="field-optional">· opcional</span></span>
                    <textarea name="versionDescription" placeholder="Observações sobre esta versão" rows={2} value={formValues.versionDescription} onChange={handleFieldChange} style={{ resize: 'vertical' }} />
                  </label>
                  <label className="field-group">
                    <span>Dimensões <span className="field-optional">· uma por linha</span></span>
                    <textarea name="dimensions" placeholder={'Confiança\nLiderança\nPride\nRespeito'} rows={5} value={formValues.dimensions} onChange={handleFieldChange} style={{ resize: 'vertical' }} />
                    <span className="field-hint">Dimensões agrupam perguntas por tema. Você pode adicionar ou editar depois também.</span>
                  </label>
                  {dimensionTags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {dimensionTags.map((d, i) => (
                        <span key={i} style={{
                          padding: '4px 12px', borderRadius: 999,
                          background: '#f0f4ff', color: '#3730a3',
                          fontSize: 12, fontWeight: 600, border: '1px solid #c7d2fe',
                        }}>{d}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                    <button className="secondary-button" type="button" onClick={() => setFormStep(1)}>← Voltar</button>
                    <button className="secondary-button" type="button" onClick={handleCloseForm}>Cancelar</button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '11px 22px', borderRadius: 10,
                        background: '#0f172a', border: 'none',
                        color: '#fff', fontSize: 14, fontWeight: 700,
                        cursor: isSubmitting ? 'wait' : 'pointer',
                        opacity: isSubmitting ? 0.7 : 1,
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <svg width="14" height="14" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                          </svg>
                          Criando…
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Criar pesquisa
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '16px 20px',
        borderRadius: 14,
        background: '#fff',
        border: '1.5px solid #e2e8f0',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <svg
            style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" />
          </svg>
          <input
            placeholder="Buscar por nome, código ou categoria…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 36px',
              border: '1.5px solid #e2e8f0',
              borderRadius: 10,
              background: '#f8fafc',
              fontSize: 14, color: '#0f172a',
              outline: 'none',
              transition: 'border-color 160ms',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#94a3b8'; e.target.style.background = '#fff' }}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: '#e2e8f0', border: 'none', borderRadius: '50%',
                width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#64748b',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filterOptions.map(({ key, label, count }) => {
            const isActive = filterStatus === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilterStatus(key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '8px 13px',
                  borderRadius: 9,
                  border: `1.5px solid ${isActive ? '#0f172a' : '#e2e8f0'}`,
                  background: isActive ? '#0f172a' : '#fff',
                  color: isActive ? '#fff' : '#64748b',
                  fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 160ms',
                }}
              >
                {label}
                <span style={{
                  minWidth: 20, height: 20, padding: '0 6px',
                  borderRadius: 6,
                  background: isActive ? 'rgba(255,255,255,.2)' : '#f1f5f9',
                  color: isActive ? '#fff' : '#64748b',
                  fontSize: 11, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Survey grid ── */}
      {isLoading ? (
        <div style={{
          padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          background: '#fff', borderRadius: 16, border: '1.5px solid #e2e8f0',
        }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid #e2e8f0', borderTopColor: '#0f172a',
            borderRadius: '50%', animation: 'spin .7s linear infinite',
          }} />
          <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Carregando pesquisas…</span>
        </div>
      ) : filteredSurveys.length === 0 ? (
        <div style={{
          padding: '80px 32px', textAlign: 'center',
          background: '#fff', borderRadius: 16, border: '1.5px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 4,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v16H4z" /><path d="M8 8h8" /><path d="M8 12h8" /><path d="M8 16h5" />
            </svg>
          </div>
          <strong style={{ fontSize: 16, color: '#334155', fontWeight: 700 }}>
            {query || filterStatus !== 'all' ? 'Nenhuma pesquisa encontrada' : 'Nenhuma pesquisa cadastrada'}
          </strong>
          <span style={{ fontSize: 14, color: '#94a3b8', maxWidth: 300, lineHeight: 1.65 }}>
            {query || filterStatus !== 'all'
              ? 'Tente ajustar os filtros de busca.'
              : 'Clique em "Nova pesquisa" para começar.'}
          </span>
          {(query || filterStatus !== 'all') && (
            <button
              className="secondary-button"
              style={{ marginTop: 8 }}
              type="button"
              onClick={() => { setQuery(''); setFilterStatus('all') }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Count line */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
              {filteredSurveys.length} de {surveys.length} pesquisa{surveys.length !== 1 ? 's' : ''}
              {(query || filterStatus !== 'all') ? ' · filtradas' : ''}
            </span>
            <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
              {stats.totalQuestions} pergunta{stats.totalQuestions !== 1 ? 's' : ''} no total
            </span>
          </div>

          {/* Cards grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}>
            {filteredSurveys.map((survey) => (
              <SurveyCard
                key={survey.id}
                survey={survey}
                onDelete={handleDeleteConfirm}
                confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
                deletingSurveyId={deletingSurveyId}
                isDeleting={deletingSurveyId === survey.id}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}