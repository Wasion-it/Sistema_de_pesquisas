import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../auth/AuthProvider'
import { createAdminJobTitle, getAdminJobTitles, updateAdminJobTitle } from '../services/admin'

const INITIAL_FORM = {
  id: null,
  code: '',
  name: '',
  description: '',
  isActive: true,
}

function buildForm(jobTitle) {
  if (!jobTitle) return INITIAL_FORM
  return {
    id: jobTitle.id,
    code: jobTitle.code,
    name: jobTitle.name,
    description: jobTitle.description ?? '',
    isActive: jobTitle.is_active,
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
  { bg: '#ede9fe', text: '#5b21b6', dot: '#7c3aed' },
  { bg: '#dbeafe', text: '#1e40af', dot: '#2563eb' },
  { bg: '#dcfce7', text: '#14532d', dot: '#16a34a' },
  { bg: '#fef3c7', text: '#78350f', dot: '#d97706' },
  { bg: '#fce7f3', text: '#831843', dot: '#db2777' },
  { bg: '#e0f2fe', text: '#0c4a6e', dot: '#0284c7' },
  { bg: '#f0fdf4', text: '#052e16', dot: '#059669' },
  { bg: '#fff7ed', text: '#7c2d12', dot: '#ea580c' },
]

function getAccent(str) {
  if (!str) return ACCENT_PALETTE[0]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return ACCENT_PALETTE[Math.abs(hash) % ACCENT_PALETTE.length]
}

export function AdminJobTitlesPage() {
  const { token } = useAuth()
  const [jobTitles, setJobTitles] = useState([])
  const [query, setQuery] = useState('')
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    let isMounted = true
    getAdminJobTitles(token)
      .then((data) => { if (isMounted) { setJobTitles(data.items ?? []); setErrorMessage('') } })
      .catch((error) => { if (isMounted) setErrorMessage(error.message) })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [token])

  const filteredJobTitles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return jobTitles.filter((jt) => {
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && jt.is_active) ||
        (filterStatus === 'inactive' && !jt.is_active)
      const matchesQuery = !q || [jt.code, jt.name, jt.description]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
      return matchesStatus && matchesQuery
    })
  }, [jobTitles, query, filterStatus])

  const stats = useMemo(() => ({
    total: jobTitles.length,
    active: jobTitles.filter((j) => j.is_active).length,
    inactive: jobTitles.filter((j) => !j.is_active).length,
  }), [jobTitles])

  function handleFieldChange(e) {
    const { name, value, type, checked } = e.target
    setFormValues((cur) => ({ ...cur, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleStartEdit(jt) {
    setFormValues(buildForm(jt))
    setShowForm(true)
    setErrorMessage('')
    setSuccessMessage('')
    setTimeout(() => document.getElementById('jt-name-input')?.focus(), 50)
  }

  function handleCancelEdit() {
    setFormValues(INITIAL_FORM)
    setShowForm(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  async function handleToggleActive(jt) {
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const saved = await updateAdminJobTitle(token, jt.id, {
        code: jt.code,
        name: jt.name,
        description: jt.description ?? null,
        is_active: !jt.is_active,
      })
      setJobTitles((cur) => cur.map((item) => (item.id === saved.id ? saved : item)))
      setSuccessMessage(saved.is_active ? 'Cargo ativado com sucesso.' : 'Cargo inativado com sucesso.')
    } catch (error) {
      setErrorMessage(error.message)
    }
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
      is_active: formValues.isActive,
    }
    try {
      const saved = formValues.id
        ? await updateAdminJobTitle(token, formValues.id, payload)
        : await createAdminJobTitle(token, payload)
      setJobTitles((cur) => {
        if (formValues.id) return cur.map((item) => (item.id === saved.id ? saved : item))
        return [...cur, saved].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      })
      setFormValues(INITIAL_FORM)
      setShowForm(false)
      setSuccessMessage(formValues.id ? 'Cargo atualizado com sucesso.' : 'Cargo cadastrado com sucesso.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formValues.code.trim().length >= 2 && formValues.name.trim().length >= 2

  return (
    <div className="admin-view">
      {/* ── Header ── */}
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Cadastros de Apoio</span>
          <h2>Cargos</h2>
          <p>Gerencie os cargos disponíveis para uso nos fluxos de admissão e demissão.</p>
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
              setTimeout(() => document.getElementById('jt-name-input')?.focus(), 50)
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
              Novo cargo
            </>
          )}
        </button>
      </div>

      {/* ── Stats ── */}
      {!isLoading && (
        <div className="dashboard-stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
          <article className="stat-card">
            <span>Total de cargos</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="stat-card" style={{ '--accent': 'var(--green-600)' }}>
            <span>Ativos</span>
            <strong style={{ color: 'var(--green-600)' }}>{stats.active}</strong>
          </article>
          <article className="stat-card">
            <span>Inativos</span>
            <strong style={{ color: 'var(--slate-400)' }}>{stats.inactive}</strong>
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

      {/* ── Form panel (slide in) ── */}
      {showForm && (
        <section className="admin-panel-card" style={{ borderTop: '3px solid var(--blue-600)', animation: 'fadeUp .25s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
                {formValues.id ? 'Editar cargo' : 'Novo cargo'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--slate-500)' }}>
                {formValues.id ? 'Atualize as informações do cargo selecionado.' : 'Preencha os dados para cadastrar um novo cargo.'}
              </p>
            </div>
            <button className="secondary-button" style={{ padding: '8px 12px', fontSize: 13 }} type="button" onClick={handleCancelEdit}>
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
              {/* Code */}
              <label className="field-group">
                <span>
                  Código
                  <span className="field-optional"> · ex: MANAGER</span>
                </span>
                <input
                  name="code"
                  placeholder="MANAGER"
                  value={formValues.code}
                  onChange={handleFieldChange}
                  style={{ fontFamily: 'Courier New, monospace', fontWeight: 600, textTransform: 'uppercase' }}
                  minLength={2}
                  required
                />
              </label>

              {/* Name */}
              <label className="field-group">
                <span>Nome do cargo</span>
                <input
                  id="jt-name-input"
                  name="name"
                  placeholder="Ex: Gerente de TI"
                  value={formValues.name}
                  onChange={handleFieldChange}
                  minLength={2}
                  required
                />
              </label>
            </div>

            {/* Description */}
            <label className="field-group" style={{ marginBottom: 16 }}>
              <span>
                Descrição
                <span className="field-optional"> · opcional</span>
              </span>
              <textarea
                name="description"
                rows="3"
                placeholder="Descreva as principais responsabilidades deste cargo"
                value={formValues.description}
                onChange={handleFieldChange}
                style={{ resize: 'vertical' }}
              />
            </label>

            {/* Active toggle + submit */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <label className="flag-toggle">
                <input checked={formValues.isActive} name="isActive" type="checkbox" onChange={handleFieldChange} />
                <span>Cargo ativo</span>
              </label>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="secondary-button" type="button" onClick={handleCancelEdit}>
                  Cancelar
                </button>
                <button
                  className="primary-button"
                  disabled={isSubmitting || !isFormValid}
                  type="submit"
                  style={{ minWidth: 160 }}
                >
                  {isSubmitting ? (
                    <>
                      <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" width="14">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Salvando...
                    </>
                  ) : formValues.id ? 'Salvar alterações' : 'Cadastrar cargo'}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* ── Filters & search ── */}
      <section className="admin-toolbar-card" style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        {/* Search */}
        <label className="field-group" style={{ flex: 1, minWidth: 200, margin: 0 }}>
          <span>Buscar cargo</span>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', pointerEvents: 'none' }} fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="15">
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
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'var(--slate-200)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--slate-500)' }}
                type="button"
              >
                <svg fill="none" height="11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="11">
                  <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </label>

        {/* Status filter */}
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
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
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
            <div style={{ width: 24, height: 24, border: '2.5px solid var(--blue-100)', borderTopColor: 'var(--blue-600)', borderRadius: '50%', animation: 'spin .7s linear infinite', marginBottom: 4 }} />
            <strong>Carregando cargos…</strong>
          </div>
        ) : filteredJobTitles.length === 0 ? (
          <div className="empty-state" style={{ padding: '56px 24px' }}>
            <svg fill="none" height="36" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="36" style={{ color: 'var(--slate-300)', marginBottom: 4 }}>
              <path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h10" />
            </svg>
            <strong>{query || filterStatus !== 'all' ? 'Nenhum cargo encontrado' : 'Nenhum cargo cadastrado'}</strong>
            <span>
              {query || filterStatus !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Clique em "Novo cargo" para começar.'}
            </span>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '52px 1fr 2fr auto auto',
              gap: 16,
              padding: '12px 20px',
              borderBottom: '1px solid var(--slate-100)',
              background: 'var(--slate-50)',
            }}>
              {['', 'Código / Nome', 'Descrição', 'Status', 'Ações'].map((h, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {filteredJobTitles.map((jt) => {
              const accent = getAccent(jt.code)
              const isEditing = formValues.id === jt.id

              return (
                <div
                  key={jt.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '52px 1fr 2fr auto auto',
                    gap: 16,
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--slate-100)',
                    alignItems: 'center',
                    background: isEditing ? 'var(--blue-50)' : jt.is_active ? 'transparent' : 'var(--slate-50)',
                    opacity: jt.is_active ? 1 : 0.65,
                    transition: 'background 160ms ease, opacity 160ms ease',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40,
                    borderRadius: 10,
                    background: accent.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800,
                    color: accent.text,
                    letterSpacing: '-.01em',
                    flexShrink: 0,
                  }}>
                    {getInitials(jt.name)}
                  </div>

                  {/* Code + name */}
                  <div>
                    <strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--slate-900)', marginBottom: 3 }}>
                      {jt.name}
                    </strong>
                    <span style={{ fontFamily: 'Courier New, monospace', fontSize: 11, fontWeight: 700, color: accent.text, background: accent.bg, padding: '2px 7px', borderRadius: 4 }}>
                      {jt.code}
                    </span>
                  </div>

                  {/* Description */}
                  <span style={{ fontSize: 13, color: 'var(--slate-500)', lineHeight: 1.55 }}>
                    {jt.description || <span style={{ color: 'var(--slate-300)', fontStyle: 'italic' }}>Sem descrição</span>}
                  </span>

                  {/* Status pill */}
                  <span className={`status-pill ${jt.is_active ? 'active' : 'inactive'}`}>
                    {jt.is_active ? 'Ativo' : 'Inativo'}
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="secondary-button"
                      style={{ padding: '7px 12px', fontSize: 12 }}
                      type="button"
                      onClick={() => handleStartEdit(jt)}
                    >
                      <svg fill="none" height="13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="13">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(jt)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 12px',
                        border: '1.5px solid',
                        borderColor: jt.is_active ? 'var(--slate-200)' : 'var(--green-200)',
                        borderRadius: 'var(--r-md)',
                        background: jt.is_active ? 'var(--color-surface)' : 'var(--green-50)',
                        color: jt.is_active ? 'var(--slate-600)' : 'var(--green-700)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 160ms ease',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {jt.is_active ? (
                        <>
                          <svg fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="12">
                            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                          </svg>
                          Inativar
                        </>
                      ) : (
                        <>
                          <svg fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="12">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Ativar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Footer count */}
            <div style={{
              padding: '12px 20px',
              background: 'var(--slate-50)',
              borderTop: '1px solid var(--slate-100)',
              fontSize: 12,
              color: 'var(--slate-400)',
              fontWeight: 600,
            }}>
              Exibindo {filteredJobTitles.length} de {jobTitles.length} cargo{jobTitles.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </section>
    </div>
  )
}