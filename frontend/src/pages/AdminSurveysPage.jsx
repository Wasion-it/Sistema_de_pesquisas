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
  DRAFT: { label: 'Rascunho', variant: 'inactive' },
  PUBLISHED: { label: 'Publicada', variant: 'active' },
  ARCHIVED: { label: 'Arquivada', variant: 'inactive' },
}

const WIZARD_STEPS = [
  { n: 1, label: 'Identificação' },
  { n: 2, label: 'Estrutura' },
]

const ACCENT_PALETTE = [
  { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe', icon: '#2563eb' },
  { bg: '#ede9fe', text: '#4c1d95', border: '#ddd6fe', icon: '#7c3aed' },
  { bg: '#dcfce7', text: '#14532d', border: '#bbf7d0', icon: '#16a34a' },
  { bg: '#fef3c7', text: '#78350f', border: '#fde68a', icon: '#d97706' },
  { bg: '#fce7f3', text: '#831843', border: '#fbcfe8', icon: '#db2777' },
  { bg: '#e0f2fe', text: '#0c4a6e', border: '#bae6fd', icon: '#0284c7' },
  { bg: '#f0fdf4', text: '#052e16', border: '#a7f3d0', icon: '#059669' },
  { bg: '#fff7ed', text: '#7c2d12', border: '#fed7aa', icon: '#ea580c' },
]

function getAccent(str) {
  if (!str) return ACCENT_PALETTE[0]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return ACCENT_PALETTE[Math.abs(hash) % ACCENT_PALETTE.length]
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function WizardSteps({ currentStep, step1Valid, onGoTo }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
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
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', padding: 0,
                cursor: canClick ? 'pointer' : 'default',
                opacity: !canClick && !isActive ? 0.5 : 1,
              }}
            >
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                background: isCompleted || isActive ? 'var(--blue-600)' : 'var(--slate-200)',
                color: isCompleted || isActive ? '#fff' : 'var(--slate-500)',
                fontSize: 12, fontWeight: 700,
                transition: 'all 160ms ease',
              }}>
                {isCompleted ? (
                  <svg fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" width="12">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : step.n}
              </span>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: isActive || isCompleted ? 'var(--slate-800)' : 'var(--slate-400)',
                transition: 'color 160ms ease',
              }}>
                {step.label}
              </span>
            </button>
            {idx < WIZARD_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 14px',
                background: isCompleted ? 'var(--blue-600)' : 'var(--slate-200)',
                transition: 'background 160ms ease',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SurveyAvatar({ name, code, size = 44, radius = 12 }) {
  const accent = getAccent(code)
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: accent.bg, border: `1.5px solid ${accent.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size > 40 ? 15 : 13, fontWeight: 800,
      color: accent.text, letterSpacing: '-.01em', flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  )
}

function StatusBadge({ status }) {
  const meta = VERSION_STATUS_META[status] ?? VERSION_STATUS_META.DRAFT
  return <span className={`status-pill ${meta.variant}`}>{meta.label}</span>
}

function DeleteConfirmRow({ survey, onConfirm, onCancel, isDeleting }) {
  return (
    <div style={{
      padding: '12px 20px',
      background: 'var(--red-50)',
      borderTop: '1px solid var(--red-100)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      animation: 'fadeUp .15s ease both',
    }}>
      <span style={{ fontSize: 13, color: 'var(--red-700)', fontWeight: 500 }}>
        Excluir <strong>"{survey.name}"</strong>? Esta ação remove versões, perguntas, campanhas e respostas vinculadas e não pode ser desfeita.
      </span>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button className="secondary-button" style={{ fontSize: 12, padding: '7px 14px' }} type="button" onClick={onCancel}>
          Cancelar
        </button>
        <button
          className="danger-button"
          style={{ fontSize: 12, padding: '7px 14px' }}
          disabled={isDeleting}
          type="button"
          onClick={onConfirm}
        >
          {isDeleting ? 'Excluindo…' : 'Sim, excluir'}
        </button>
      </div>
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

  // Form
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [formStep, setFormStep] = useState(1)

  // Delete
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

  // Form handlers
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

  return (
    <div className="admin-view">

      {/* ── Header ── */}
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Gestão de Pesquisas</span>
          <h2>Pesquisas cadastradas</h2>
          <p>Crie, configure e publique pesquisas para os colaboradores do RH.</p>
        </div>
        <button
          className={isFormOpen ? 'secondary-button' : 'primary-button'}
          type="button"
          onClick={() => isFormOpen ? handleCloseForm() : setIsFormOpen(true)}
        >
          {isFormOpen ? (
            <>
              <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14">
                <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
              </svg>
              Cancelar
            </>
          ) : (
            <>
              <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14">
                <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
              </svg>
              Nova pesquisa
            </>
          )}
        </button>
      </div>

      {/* ── Stats ── */}
      {!isLoading && (
        <div className="dashboard-stats-grid">
          <article className="stat-card">
            <span>Total de pesquisas</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="stat-card">
            <span>Ativas</span>
            <strong style={{ color: 'var(--green-600)' }}>{stats.active}</strong>
          </article>
          <article className="stat-card">
            <span>Com campanha aberta</span>
            <strong style={{ color: 'var(--blue-600)' }}>{stats.withCampaign}</strong>
          </article>
          <article className="stat-card">
            <span>Total de perguntas</span>
            <strong>{stats.totalQuestions}</strong>
          </article>
        </div>
      )}

      {/* ── Feedback ── */}
      {successMessage && (
        <div className="form-success" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="16" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="form-error">
          <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="15" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {errorMessage}
        </div>
      )}

      {/* ── New survey form (wizard) ── */}
      {isFormOpen && (
        <section
          className="admin-panel-card"
          style={{ borderTop: '3px solid var(--blue-600)', animation: 'fadeUp .25s ease both' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Nova pesquisa</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--slate-500)' }}>
                Preencha os dados em dois passos para criar a pesquisa.
              </p>
            </div>
            <button
              className="secondary-button"
              style={{ padding: '8px 12px', fontSize: 13, flexShrink: 0 }}
              type="button"
              onClick={handleCloseForm}
            >
              Cancelar
            </button>
          </div>

          <WizardSteps currentStep={formStep} step1Valid={step1Valid} onGoTo={setFormStep} />

          <form onSubmit={formStep === 2 ? handleCreateSurvey : (e) => { e.preventDefault(); setFormStep(2) }}>

            {/* Step 1 */}
            {formStep === 1 && (
              <div style={{ display: 'grid', gap: 18 }}>
                <div style={{ marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--slate-700)' }}>
                    Identificação da pesquisa
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--slate-500)' }}>
                    Defina o nome, código único e a primeira versão.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                  <label className="field-group">
                    <span>
                      Código único
                      <span className="field-optional"> · ex: CLIMA-2026-Q1</span>
                    </span>
                    <input
                      name="code"
                      minLength={3}
                      placeholder="CLIMA-2026-Q1"
                      required
                      value={formValues.code}
                      onChange={handleFieldChange}
                      style={{ fontFamily: 'Courier New, monospace', fontWeight: 600, textTransform: 'uppercase' }}
                      autoFocus
                    />
                  </label>
                  <label className="field-group">
                    <span>Tipo de pesquisa</span>
                    <input
                      name="category"
                      minLength={2}
                      placeholder="Great Place to Work, Clima, Onboarding…"
                      required
                      value={formValues.category}
                      onChange={handleFieldChange}
                    />
                  </label>
                </div>

                <label className="field-group">
                  <span>Nome da pesquisa</span>
                  <input
                    name="name"
                    minLength={3}
                    placeholder="Ex: Pesquisa de Clima Organizacional 2026"
                    required
                    value={formValues.name}
                    onChange={handleFieldChange}
                  />
                </label>

                <label className="field-group">
                  <span>
                    Descrição
                    <span className="field-optional"> · opcional</span>
                  </span>
                  <textarea
                    name="description"
                    placeholder="Descreva o objetivo desta pesquisa"
                    rows={3}
                    value={formValues.description}
                    onChange={handleFieldChange}
                    style={{ resize: 'vertical' }}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'end' }}>
                  <label className="field-group">
                    <span>Título da versão inicial</span>
                    <input
                      name="versionTitle"
                      required
                      value={formValues.versionTitle}
                      onChange={handleFieldChange}
                    />
                  </label>
                  <label className="checkbox-field" style={{ marginBottom: 2 }}>
                    <input
                      checked={formValues.isActive}
                      name="isActive"
                      type="checkbox"
                      onChange={handleFieldChange}
                    />
                    <span>Pesquisa ativa ao criar</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--slate-100)' }}>
                  <button className="secondary-button" type="button" onClick={handleCloseForm}>
                    Cancelar
                  </button>
                  <button className="primary-button" disabled={!step1Valid} type="submit">
                    Continuar
                    <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14">
                      <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {formStep === 2 && (
              <div style={{ display: 'grid', gap: 18 }}>
                <div style={{ marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--slate-700)' }}>
                    Estrutura da pesquisa
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--slate-500)' }}>
                    Adicione dimensões temáticas para organizar as perguntas depois.
                  </p>
                </div>

                <label className="field-group">
                  <span>
                    Descrição da versão
                    <span className="field-optional"> · opcional</span>
                  </span>
                  <textarea
                    name="versionDescription"
                    placeholder="Observações sobre esta versão"
                    rows={2}
                    value={formValues.versionDescription}
                    onChange={handleFieldChange}
                    style={{ resize: 'vertical' }}
                  />
                </label>

                <label className="field-group">
                  <span>
                    Dimensões
                    <span className="field-optional"> · uma por linha</span>
                  </span>
                  <textarea
                    name="dimensions"
                    placeholder={'Confiança\nLiderança\nPride\nRespeito'}
                    rows={5}
                    value={formValues.dimensions}
                    onChange={handleFieldChange}
                    style={{ resize: 'vertical' }}
                  />
                  <span className="field-hint">
                    Dimensões agrupam perguntas por tema. Você pode adicionar ou editar depois também.
                  </span>
                </label>

                {dimensionTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {dimensionTags.map((d, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 999,
                          background: 'var(--blue-100)',
                          color: 'var(--blue-800)',
                          fontSize: 12, fontWeight: 600,
                        }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--slate-100)' }}>
                  <button className="secondary-button" type="button" onClick={() => setFormStep(1)}>
                    ← Voltar
                  </button>
                  <button className="secondary-button" type="button" onClick={handleCloseForm}>
                    Cancelar
                  </button>
                  <button className="primary-button" disabled={isSubmitting} type="submit" style={{ minWidth: 160 }}>
                    {isSubmitting ? (
                      <>
                        <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" width="14">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Criando…
                      </>
                    ) : 'Criar pesquisa'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </section>
      )}

      {/* ── Search + filters ── */}
      <section className="admin-toolbar-card" style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <label className="field-group" style={{ flex: 1, minWidth: 220, margin: 0 }}>
          <span>Buscar pesquisa</span>
          <div style={{ position: 'relative' }}>
            <svg
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', pointerEvents: 'none' }}
              fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="15"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" />
            </svg>
            <input
              placeholder="Nome, código ou categoria…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: 36, paddingRight: query ? 36 : 14 }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'var(--slate-200)', border: 'none', borderRadius: '50%',
                  width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--slate-500)',
                }}
                type="button"
              >
                <svg fill="none" height="11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="11">
                  <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </label>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'Todas' },
            { key: 'active', label: 'Ativas' },
            { key: 'inactive', label: 'Inativas' },
            { key: 'campaign', label: 'Com campanha' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterStatus(key)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--r-md)',
                border: filterStatus === key ? '1.5px solid var(--blue-400)' : '1.5px solid var(--slate-200)',
                background: filterStatus === key ? 'var(--blue-50)' : 'var(--color-surface)',
                color: filterStatus === key ? 'var(--blue-700)' : 'var(--slate-600)',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                transition: 'all 160ms ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Survey list ── */}
      <section className="admin-panel-card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state" style={{ padding: '64px 24px' }}>
            <div style={{
              width: 24, height: 24,
              border: '2.5px solid var(--blue-100)',
              borderTopColor: 'var(--blue-600)',
              borderRadius: '50%',
              animation: 'spin .7s linear infinite',
              marginBottom: 4,
            }} />
            <strong>Carregando pesquisas…</strong>
          </div>
        ) : filteredSurveys.length === 0 ? (
          <div className="empty-state" style={{ padding: '64px 24px' }}>
            <svg fill="none" height="36" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="36" style={{ color: 'var(--slate-300)', marginBottom: 4 }}>
              <path d="M4 4h16v16H4z" /><path d="M8 8h8" /><path d="M8 12h8" /><path d="M8 16h5" />
            </svg>
            <strong>{query || filterStatus !== 'all' ? 'Nenhuma pesquisa encontrada' : 'Nenhuma pesquisa cadastrada'}</strong>
            <span>
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
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '56px 1fr 120px 80px 100px 100px auto',
              gap: 14,
              padding: '12px 20px',
              borderBottom: '1px solid var(--slate-100)',
              background: 'var(--slate-50)',
              alignItems: 'center',
            }}>
              {['', 'Pesquisa', 'Versão', 'Perguntas', 'Campanhas', 'Status', 'Ações'].map((h, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {filteredSurveys.map((survey) => {
              const accent = getAccent(survey.code)
              const versionMeta = VERSION_STATUS_META[survey.current_version_status] ?? VERSION_STATUS_META.DRAFT
              const isConfirmingDelete = confirmDeleteId === survey.id
              const isThisDeleting = deletingSurveyId === survey.id

              return (
                <div key={survey.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                  {/* Main row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '56px 1fr 120px 80px 100px 100px auto',
                    gap: 14,
                    padding: '14px 20px',
                    alignItems: 'center',
                    background: isConfirmingDelete ? 'var(--red-50)' : survey.is_active ? 'transparent' : 'var(--slate-50)',
                    opacity: survey.is_active ? 1 : 0.7,
                    transition: 'background 160ms ease',
                  }}>

                    {/* Avatar */}
                    <SurveyAvatar name={survey.name} code={survey.code} />

                    {/* Name + code + category */}
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--slate-900)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {survey.name}
                      </strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'Courier New, monospace', fontSize: 11, fontWeight: 700,
                          color: accent.text, background: accent.bg, padding: '2px 7px', borderRadius: 4,
                        }}>
                          {survey.code}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>·</span>
                        <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>{survey.category}</span>
                      </div>
                    </div>

                    {/* Version */}
                    <div>
                      <strong style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--slate-700)', marginBottom: 4 }}>
                        {survey.current_version ?? '—'}
                      </strong>
                      <span className={`status-pill ${versionMeta.variant}`} style={{ fontSize: 11, padding: '3px 9px' }}>
                        {versionMeta.label}
                      </span>
                    </div>

                    {/* Questions count */}
                    <div style={{ textAlign: 'center' }}>
                      <strong style={{ display: 'block', fontSize: 18, fontWeight: 800, color: 'var(--slate-800)', lineHeight: 1, fontFamily: 'var(--font-display)' }}>
                        {survey.total_questions}
                      </strong>
                      <span style={{ fontSize: 11, color: 'var(--slate-400)', fontWeight: 600 }}>questões</span>
                    </div>

                    {/* Campaigns */}
                    <div>
                      {survey.latest_campaign_id ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link
                            className="inline-link"
                            style={{ fontSize: 11 }}
                            to={`/admin/campaigns/${survey.latest_campaign_id}/responses`}
                          >
                            Respostas →
                          </Link>
                          <Link
                            className="inline-link"
                            style={{ fontSize: 11 }}
                            to={`/admin/campaigns/${survey.latest_campaign_id}/kpis`}
                          >
                            KPIs →
                          </Link>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--slate-400)', fontStyle: 'italic' }}>Sem campanha</span>
                      )}
                    </div>

                    {/* Active status */}
                    <span className={`status-pill ${survey.is_active ? 'active' : 'inactive'}`}>
                      {survey.is_active ? 'Ativa' : 'Inativa'}
                    </span>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Link
                        className="secondary-link-button"
                        style={{ padding: '7px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                        to={`/admin/surveys/${survey.id}`}
                      >
                        <svg fill="none" height="13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="13">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Gerenciar
                      </Link>
                      <button
                        className="danger-button"
                        style={{ padding: '7px 12px', fontSize: 12 }}
                        disabled={isThisDeleting}
                        type="button"
                        onClick={() => setConfirmDeleteId(isConfirmingDelete ? null : survey.id)}
                      >
                        <svg fill="none" height="13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="13">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" /><path d="M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                        {isThisDeleting ? 'Excluindo…' : 'Excluir'}
                      </button>
                    </div>
                  </div>

                  {/* Inline delete confirmation */}
                  {isConfirmingDelete && (
                    <DeleteConfirmRow
                      survey={survey}
                      isDeleting={isThisDeleting}
                      onConfirm={() => handleDeleteConfirm(survey)}
                      onCancel={() => setConfirmDeleteId(null)}
                    />
                  )}
                </div>
              )
            })}

            {/* Footer */}
            <div style={{
              padding: '12px 20px',
              background: 'var(--slate-50)',
              borderTop: '1px solid var(--slate-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: 'var(--slate-400)', fontWeight: 600 }}>
                Exibindo {filteredSurveys.length} de {surveys.length} pesquisa{surveys.length !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 12, color: 'var(--slate-400)', fontWeight: 600 }}>
                {stats.totalQuestions} pergunta{stats.totalQuestions !== 1 ? 's' : ''} no total
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  )
}