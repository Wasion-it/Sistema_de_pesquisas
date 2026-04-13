import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../auth/AuthProvider'
import { createAdminDepartment, getAdminDepartments, updateAdminDepartment } from '../services/admin'

const INITIAL_FORM = {
  id: null,
  code: '',
  name: '',
  description: '',
  totalPeople: '0',
  isActive: true,
}

function buildForm(department) {
  if (!department) return INITIAL_FORM
  return {
    id: department.id,
    code: department.code,
    name: department.name,
    description: department.description ?? '',
    totalPeople: String(department.total_people ?? 0),
    isActive: department.is_active,
  }
}

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

const ACCENT_PALETTE = [
  { bg: '#dbeafe', text: '#1e40af', dot: '#2563eb', border: '#bfdbfe' },
  { bg: '#e0f2fe', text: '#0c4a6e', dot: '#0284c7', border: '#bae6fd' },
  { bg: '#dcfce7', text: '#14532d', dot: '#16a34a', border: '#bbf7d0' },
  { bg: '#fef3c7', text: '#78350f', dot: '#d97706', border: '#fde68a' },
  { bg: '#ede9fe', text: '#4c1d95', dot: '#7c3aed', border: '#ddd6fe' },
  { bg: '#fce7f3', text: '#831843', dot: '#db2777', border: '#fbcfe8' },
  { bg: '#f0fdf4', text: '#052e16', dot: '#059669', border: '#a7f3d0' },
  { bg: '#fff7ed', text: '#7c2d12', dot: '#ea580c', border: '#fed7aa' },
]

function getAccent(str) {
  if (!str) return ACCENT_PALETTE[0]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return ACCENT_PALETTE[Math.abs(hash) % ACCENT_PALETTE.length]
}

function OccupancyBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const color = pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#16a34a'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'var(--slate-100)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .4s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

export function AdminDepartmentsPage() {
  const { token } = useAuth()
  const [departments, setDepartments] = useState([])
  const [query, setQuery] = useState('')
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    let isMounted = true
    getAdminDepartments(token)
      .then((data) => { if (isMounted) { setDepartments(data.items ?? []); setErrorMessage('') } })
      .catch((error) => { if (isMounted) setErrorMessage(error.message) })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [token])

  const filteredDepartments = useMemo(() => {
    const q = query.trim().toLowerCase()
    return departments.filter((d) => {
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && d.is_active) ||
        (filterStatus === 'inactive' && !d.is_active)
      const matchesQuery = !q || [d.code, d.name, d.description]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
      return matchesStatus && matchesQuery
    })
  }, [departments, query, filterStatus])

  const stats = useMemo(() => ({
    total: departments.length,
    active: departments.filter((d) => d.is_active).length,
    inactive: departments.filter((d) => !d.is_active).length,
    totalPeople: departments.reduce((sum, d) => sum + (d.total_people ?? 0), 0),
  }), [departments])

  function handleFieldChange(e) {
    const { name, value, type, checked } = e.target
    setFormValues((cur) => ({ ...cur, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleStartEdit(dept) {
    setFormValues(buildForm(dept))
    setShowForm(true)
    setErrorMessage('')
    setSuccessMessage('')
    setTimeout(() => document.getElementById('dept-name-input')?.focus(), 50)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setFormValues(INITIAL_FORM)
    setShowForm(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    const payload = {
      code: formValues.code.trim().toUpperCase(),
      name: formValues.name.trim(),
      description: formValues.description.trim() || null,
      total_people: Number(formValues.totalPeople || 0),
      is_active: formValues.isActive,
    }

    try {
      const saved = formValues.id
        ? await updateAdminDepartment(token, formValues.id, payload)
        : await createAdminDepartment(token, payload)

      setDepartments((cur) => {
        if (formValues.id) return cur.map((item) => (item.id === saved.id ? saved : item))
        return [...cur, saved].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      })

      setFormValues(INITIAL_FORM)
      setShowForm(false)
      setSuccessMessage(formValues.id ? 'Departamento atualizado com sucesso.' : 'Departamento cadastrado com sucesso.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid =
    formValues.code.trim().length >= 2 &&
    formValues.name.trim().length >= 2 &&
    Number(formValues.totalPeople) >= 0

  return (
    <div className="admin-view">

      {/* ── Header ── */}
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Cadastros de Apoio</span>
          <h2>Departamentos</h2>
          <p>Gerencie os departamentos para segmentação de pesquisas e fluxos do RH.</p>
        </div>
        <button
          className={showForm && !formValues.id ? 'secondary-button' : 'primary-button'}
          type="button"
          onClick={() => {
            if (showForm && !formValues.id) {
              handleCancelEdit()
            } else {
              setFormValues(INITIAL_FORM)
              setShowForm(true)
              setErrorMessage('')
              setSuccessMessage('')
              setTimeout(() => document.getElementById('dept-name-input')?.focus(), 50)
            }
          }}
        >
          {showForm && !formValues.id ? (
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
              Novo departamento
            </>
          )}
        </button>
      </div>

      {/* ── Stats ── */}
      {!isLoading && (
        <div className="dashboard-stats-grid">
          <article className="stat-card">
            <span>Total</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="stat-card">
            <span>Ativos</span>
            <strong style={{ color: 'var(--green-600)' }}>{stats.active}</strong>
          </article>
          <article className="stat-card">
            <span>Inativos</span>
            <strong style={{ color: 'var(--slate-400)' }}>{stats.inactive}</strong>
          </article>
          <article className="stat-card">
            <span>Total de pessoas</span>
            <strong>{stats.totalPeople.toLocaleString('pt-BR')}</strong>
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

      {/* ── Form panel ── */}
      {showForm && (
        <section
          className="admin-panel-card"
          style={{ borderTop: '3px solid var(--blue-600)', animation: 'fadeUp .25s ease both' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
                {formValues.id ? 'Editar departamento' : 'Novo departamento'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--slate-500)' }}>
                {formValues.id
                  ? 'Atualize as informações do departamento selecionado.'
                  : 'Preencha os dados para cadastrar um novo departamento.'}
              </p>
            </div>
            <button
              className="secondary-button"
              style={{ padding: '8px 12px', fontSize: 13, flexShrink: 0 }}
              type="button"
              onClick={handleCancelEdit}
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Row 1: code + name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
              <label className="field-group">
                <span>
                  Código
                  <span className="field-optional"> · ex: RH</span>
                </span>
                <input
                  name="code"
                  placeholder="RH"
                  value={formValues.code}
                  onChange={handleFieldChange}
                  style={{ fontFamily: 'Courier New, monospace', fontWeight: 600, textTransform: 'uppercase' }}
                  minLength={2}
                  required
                />
              </label>

              <label className="field-group">
                <span>Nome do departamento</span>
                <input
                  id="dept-name-input"
                  name="name"
                  placeholder="Ex: Recursos Humanos"
                  value={formValues.name}
                  onChange={handleFieldChange}
                  minLength={2}
                  required
                />
              </label>
            </div>

            {/* Row 2: description + people */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
              <label className="field-group">
                <span>
                  Descrição
                  <span className="field-optional"> · opcional</span>
                </span>
                <textarea
                  name="description"
                  rows="3"
                  placeholder="Descreva a área de atuação deste departamento"
                  value={formValues.description}
                  onChange={handleFieldChange}
                  style={{ resize: 'vertical' }}
                />
              </label>

              <label className="field-group">
                <span>
                  Pessoas no departamento
                </span>
                <input
                  min="0"
                  name="totalPeople"
                  placeholder="0"
                  type="number"
                  value={formValues.totalPeople}
                  onChange={handleFieldChange}
                />
                <span className="field-hint">
                  Usado para calcular taxa de adesão nas pesquisas.
                </span>
              </label>
            </div>

            {/* Row 3: active + actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <label className="flag-toggle">
                <input
                  checked={formValues.isActive}
                  name="isActive"
                  type="checkbox"
                  onChange={handleFieldChange}
                />
                <span>Departamento ativo</span>
              </label>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="secondary-button" type="button" onClick={handleCancelEdit}>
                  Cancelar
                </button>
                <button
                  className="primary-button"
                  disabled={isSubmitting || !isFormValid}
                  type="submit"
                  style={{ minWidth: 180 }}
                >
                  {isSubmitting ? (
                    <>
                      <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" width="14">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Salvando...
                    </>
                  ) : formValues.id ? 'Salvar alterações' : 'Cadastrar departamento'}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* ── Search + filters ── */}
      <section className="admin-toolbar-card" style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <label className="field-group" style={{ flex: 1, minWidth: 220, margin: 0 }}>
          <span>Buscar departamento</span>
          <div style={{ position: 'relative' }}>
            <svg
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', pointerEvents: 'none' }}
              fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="15"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" />
            </svg>
            <input
              placeholder="Código, nome ou descrição…"
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

        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'active', label: 'Ativos' },
            { key: 'inactive', label: 'Inativos' },
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

      {/* ── List ── */}
      <section className="admin-panel-card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div className="empty-state" style={{ padding: '56px 24px' }}>
            <div style={{
              width: 24, height: 24,
              border: '2.5px solid var(--blue-100)',
              borderTopColor: 'var(--blue-600)',
              borderRadius: '50%',
              animation: 'spin .7s linear infinite',
              marginBottom: 4,
            }} />
            <strong>Carregando departamentos…</strong>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="empty-state" style={{ padding: '56px 24px' }}>
            <svg fill="none" height="36" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="36" style={{ color: 'var(--slate-300)', marginBottom: 4 }}>
              <path d="M4 21h16" /><path d="M6 21V7l6-4 6 4v14" />
              <path d="M9 10h.01" /><path d="M15 10h.01" /><path d="M9 14h.01" /><path d="M15 14h.01" />
            </svg>
            <strong>{query || filterStatus !== 'all' ? 'Nenhum departamento encontrado' : 'Nenhum departamento cadastrado'}</strong>
            <span>
              {query || filterStatus !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Clique em "Novo departamento" para começar.'}
            </span>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '56px 1fr 1fr 140px auto auto',
              gap: 16,
              padding: '12px 20px',
              borderBottom: '1px solid var(--slate-100)',
              background: 'var(--slate-50)',
              alignItems: 'center',
            }}>
              {['', 'Código / Nome', 'Descrição', 'Pessoas', 'Status', 'Ações'].map((h, i) => (
                <span
                  key={i}
                  style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.06em' }}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {filteredDepartments.map((dept) => {
              const accent = getAccent(dept.code)
              const isEditing = formValues.id === dept.id
              const isExpanded = expandedId === dept.id
              const totalPeople = dept.total_people ?? 0

              return (
                <div key={dept.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                  {/* Main row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '56px 1fr 1fr 140px auto auto',
                      gap: 16,
                      padding: '14px 20px',
                      alignItems: 'center',
                      background: isEditing ? 'var(--blue-50)' : dept.is_active ? 'transparent' : 'var(--slate-50)',
                      opacity: dept.is_active ? 1 : 0.65,
                      transition: 'background 160ms ease, opacity 160ms ease',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 44, height: 44,
                        borderRadius: 12,
                        background: accent.bg,
                        border: `1.5px solid ${accent.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800,
                        color: accent.text,
                        letterSpacing: '-.01em',
                        flexShrink: 0,
                        cursor: dept.description ? 'pointer' : 'default',
                      }}
                      title={dept.description ? 'Clique para ver descrição' : undefined}
                      onClick={() => dept.description && setExpandedId(isExpanded ? null : dept.id)}
                    >
                      {getInitials(dept.name)}
                    </div>

                    {/* Code + name */}
                    <div>
                      <strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--slate-900)', marginBottom: 4 }}>
                        {dept.name}
                      </strong>
                      <span style={{
                        fontFamily: 'Courier New, monospace',
                        fontSize: 11, fontWeight: 700,
                        color: accent.text,
                        background: accent.bg,
                        padding: '2px 7px',
                        borderRadius: 4,
                      }}>
                        {dept.code}
                      </span>
                    </div>

                    {/* Description (truncated) */}
                    <span
                      style={{
                        fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.55,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}
                      title={dept.description || undefined}
                    >
                      {dept.description || (
                        <span style={{ color: 'var(--slate-300)', fontStyle: 'italic' }}>Sem descrição</span>
                      )}
                    </span>

                    {/* People + bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <strong style={{ fontSize: 15, fontWeight: 700, color: 'var(--slate-800)' }}>
                          {totalPeople.toLocaleString('pt-BR')}
                        </strong>
                        <span style={{ fontSize: 12, color: 'var(--slate-400)' }}>pessoas</span>
                      </div>
                      {totalPeople > 0 && (
                        <OccupancyBar value={totalPeople} max={stats.totalPeople} />
                      )}
                    </div>

                    {/* Status */}
                    <span className={`status-pill ${dept.is_active ? 'active' : 'inactive'}`}>
                      {dept.is_active ? 'Ativo' : 'Inativo'}
                    </span>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        className="secondary-button"
                        style={{ padding: '7px 12px', fontSize: 12, whiteSpace: 'nowrap' }}
                        type="button"
                        onClick={() => handleStartEdit(dept)}
                      >
                        <svg fill="none" height="13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="13">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Editar
                      </button>
                    </div>
                  </div>

                  {/* Expanded description row */}
                  {isExpanded && dept.description && (
                    <div style={{
                      padding: '12px 20px 14px calc(56px + 20px + 16px)',
                      background: 'var(--slate-50)',
                      borderTop: '1px solid var(--slate-100)',
                      fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.7,
                      animation: 'fadeUp .2s ease both',
                    }}>
                      <span style={{
                        display: 'inline-block', marginBottom: 6,
                        fontSize: 11, fontWeight: 700, color: 'var(--slate-400)',
                        textTransform: 'uppercase', letterSpacing: '.06em',
                      }}>
                        Descrição
                      </span>
                      <p style={{ margin: 0 }}>{dept.description}</p>
                    </div>
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
                Exibindo {filteredDepartments.length} de {departments.length} departamento{departments.length !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 12, color: 'var(--slate-400)', fontWeight: 600 }}>
                {stats.totalPeople.toLocaleString('pt-BR')} pessoas no total
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  )
}