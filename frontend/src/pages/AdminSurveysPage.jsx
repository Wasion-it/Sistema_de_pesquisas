import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { createAdminSurvey, deleteAdminSurvey, getAdminSurveys } from '../services/admin'

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

const STATUS_LABELS = {
  DRAFT: { label: 'Rascunho', variant: 'inactive' },
  PUBLISHED: { label: 'Publicada', variant: 'active' },
  ARCHIVED: { label: 'Arquivada', variant: 'inactive' },
}

export function AdminSurveysPage() {
  const { token } = useAuth()
  const [surveys, setSurveys] = useState([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingSurveyId, setDeletingSurveyId] = useState(null)
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [formStep, setFormStep] = useState(1) // wizard steps: 1, 2

  useEffect(() => {
    let isMounted = true
    getAdminSurveys(token)
      .then((data) => { if (isMounted) { setSurveys(data.items); setErrorMessage('') } })
      .catch((error) => { if (isMounted) setErrorMessage(error.message) })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [token])

  const filteredSurveys = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return surveys
    return surveys.filter((s) =>
      [s.name, s.code, s.category].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    )
  }, [query, surveys])

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
        code: formValues.code,
        name: formValues.name,
        description: formValues.description || null,
        category: formValues.category,
        is_active: formValues.isActive,
        version_title: formValues.versionTitle,
        version_description: formValues.versionDescription || null,
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

  async function handleDeleteSurvey(survey) {
    const confirmed = window.confirm(`Excluir a pesquisa "${survey.name}"? Esta acao remove versoes, perguntas, campanhas e respostas vinculadas.`)
    if (!confirmed) {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')
    setDeletingSurveyId(survey.id)

    try {
      const result = await deleteAdminSurvey(token, survey.id)
      setSurveys((current) => current.filter((item) => item.id !== survey.id))
      setSuccessMessage(result.message)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setDeletingSurveyId(null)
    }
  }

  const step1Valid = formValues.code.trim().length >= 3
    && formValues.category.trim().length >= 2
    && formValues.name.trim().length >= 3
    && formValues.versionTitle.trim().length >= 3

  return (
    <div className="admin-view">
      {/* Header */}
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Gestão de Pesquisas</span>
          <h2>Pesquisas cadastradas</h2>
          <p>Crie, configure e publique pesquisas para os colaboradores.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => setIsFormOpen((cur) => !cur)}
          type="button"
        >
          {isFormOpen ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Fechar
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nova pesquisa
            </>
          )}
        </button>
      </div>

      {/* Create form — wizard */}
      {isFormOpen && (
        <section className="admin-panel-card" style={{ borderTop: '3px solid var(--blue-600)' }}>
          {/* Steps indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
            {[
              { n: 1, label: 'Identificação' },
              { n: 2, label: 'Estrutura' },
            ].map((step, idx, arr) => (
              <div key={step.n} style={{ display: 'flex', alignItems: 'center', flex: idx < arr.length - 1 ? 1 : 'none' }}>
                <div
                  onClick={() => step.n < formStep || (step.n === 2 && step1Valid) ? setFormStep(step.n) : null}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    cursor: step.n <= formStep || step1Valid ? 'pointer' : 'default',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: formStep >= step.n ? 'var(--blue-600)' : 'var(--slate-200)',
                    color: formStep >= step.n ? '#fff' : 'var(--slate-500)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                    transition: 'all var(--dur) var(--ease)',
                  }}>
                    {formStep > step.n ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : step.n}
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: formStep >= step.n ? 'var(--slate-800)' : 'var(--slate-400)',
                  }}>{step.label}</span>
                </div>
                {idx < arr.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: '0 12px',
                    background: formStep > step.n ? 'var(--blue-600)' : 'var(--slate-200)',
                    transition: 'background var(--dur) var(--ease)',
                  }} />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={formStep === 2 ? handleCreateSurvey : (e) => { e.preventDefault(); setFormStep(2) }}>
            {formStep === 1 && (
              <div className="survey-create-form">
                <div style={{ marginBottom: 4 }}>
                  <h3 style={{ marginBottom: 4, fontSize: '1rem', fontFamily: 'var(--font-body)' }}>Identifique a pesquisa</h3>
                  <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>Defina o nome, código único e a primeira versão.</p>
                </div>

                <div className="form-grid two-columns">
                  <label className="field-group" htmlFor="survey-code">
                    <span>
                      Código único
                      <span className="field-optional">· ex: GPTW-2026-Q1</span>
                    </span>
                    <input
                      id="survey-code"
                      name="code"
                      placeholder="CLIMA-2026-Q1"
                      required
                      minLength={3}
                      value={formValues.code}
                      onChange={handleFieldChange}
                      style={{ fontFamily: "'Courier New', monospace", fontWeight: 600 }}
                    />
                  </label>

                  <label className="field-group" htmlFor="survey-category">
                    <span>Tipo de pesquisa</span>
                    <input
                      id="survey-category"
                      name="category"
                      placeholder="Ex: Great Place to Work, Clima, Onboarding"
                      required
                      minLength={2}
                      value={formValues.category}
                      onChange={handleFieldChange}
                    />
                  </label>
                </div>

                <label className="field-group" htmlFor="survey-name">
                  <span>Nome da pesquisa</span>
                  <input
                    id="survey-name"
                    name="name"
                    placeholder="Ex: Pesquisa de Clima Organizacional 2026"
                    required
                    minLength={3}
                    value={formValues.name}
                    onChange={handleFieldChange}
                  />
                </label>

                <label className="field-group" htmlFor="survey-description">
                  <span>Descrição <span className="field-optional">(opcional)</span></span>
                  <textarea
                    id="survey-description"
                    name="description"
                    placeholder="Descreva o objetivo desta pesquisa"
                    rows={3}
                    value={formValues.description}
                    onChange={handleFieldChange}
                  />
                </label>

                <div className="form-grid two-columns">
                  <label className="field-group" htmlFor="survey-version-title">
                    <span>Título da versão inicial</span>
                    <input
                      id="survey-version-title"
                      name="versionTitle"
                      required
                      value={formValues.versionTitle}
                      onChange={handleFieldChange}
                    />
                  </label>
                  <label className="checkbox-field" htmlFor="survey-active" style={{ alignSelf: 'end' }}>
                    <input
                      checked={formValues.isActive}
                      id="survey-active"
                      name="isActive"
                      type="checkbox"
                      onChange={handleFieldChange}
                    />
                    <span>Pesquisa ativa para configuração</span>
                  </label>
                </div>

                <div className="form-actions-row">
                  <button className="primary-button" type="submit" disabled={!step1Valid}>
                    Continuar
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                  <button className="secondary-button" type="button" onClick={handleCloseForm}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {formStep === 2 && (
              <div className="survey-create-form">
                <div style={{ marginBottom: 4 }}>
                  <h3 style={{ marginBottom: 4, fontSize: '1rem', fontFamily: 'var(--font-body)' }}>Estrutura da pesquisa</h3>
                  <p style={{ fontSize: 13, color: 'var(--slate-500)' }}>
                    Adicione dimensões temáticas opcionais para organizar as perguntas depois.
                  </p>
                </div>

                <label className="field-group" htmlFor="survey-version-description">
                  <span>Descrição da versão <span className="field-optional">(opcional)</span></span>
                  <textarea
                    id="survey-version-description"
                    name="versionDescription"
                    placeholder="Observações sobre esta versão"
                    rows={2}
                    value={formValues.versionDescription}
                    onChange={handleFieldChange}
                  />
                </label>

                <label className="field-group" htmlFor="survey-dimensions">
                  <span>
                    Dimensões
                    <span className="field-optional"> · uma por linha</span>
                  </span>
                  <textarea
                    id="survey-dimensions"
                    name="dimensions"
                    placeholder={'Confiança\nLiderança\nPride\nRespeito'}
                    rows={5}
                    value={formValues.dimensions}
                    onChange={handleFieldChange}
                  />
                  <span className="field-hint">
                    Dimensões agrupam perguntas por tema. Você pode adicionar ou editar depois também.
                  </span>
                </label>

                {/* Preview of entered dimensions */}
                {formValues.dimensions.trim() && (
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6,
                    padding: '12px 14px', borderRadius: 'var(--r-md)',
                    background: 'var(--slate-50)', border: '1px solid var(--slate-200)',
                  }}>
                    {formValues.dimensions.split('\n').filter((s) => s.trim()).map((d, i) => (
                      <span key={i} style={{
                        padding: '4px 10px', borderRadius: 999,
                        background: 'var(--blue-100)', color: 'var(--blue-800)',
                        fontSize: 12, fontWeight: 600,
                      }}>
                        {d.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {errorMessage && <div className="form-error">{errorMessage}</div>}

                <div className="form-actions-row">
                  <button className="primary-button" disabled={isSubmitting} type="submit">
                    {isSubmitting ? 'Criando pesquisa...' : 'Criar pesquisa'}
                  </button>
                  <button className="secondary-button" type="button" onClick={() => setFormStep(1)}>
                    ← Voltar
                  </button>
                  <button className="secondary-button" type="button" onClick={handleCloseForm}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </form>
        </section>
      )}

      {/* Search */}
      <section className="admin-toolbar-card">
        <label className="field-group" htmlFor="survey-search">
          <div style={{ position: 'relative' }}>
            <svg
              width="15" height="15"
              viewBox="0 0 24 24" fill="none" stroke="var(--slate-400)"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              id="survey-search"
              type="text"
              placeholder="Buscar por nome, código ou categoria..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>
        </label>
      </section>

      {successMessage && <div className="form-success">{successMessage}</div>}
      {errorMessage && !isFormOpen && <div className="form-error">{errorMessage}</div>}

      {isLoading ? (
        <section className="admin-panel-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--slate-400)', fontSize: 14 }}>
            <div style={{ width: 16, height: 16, border: '2px solid var(--slate-200)', borderTopColor: 'var(--blue-500)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            Carregando pesquisas...
          </div>
        </section>
      ) : (
        <section className="admin-table-card">
          {/* Table head */}
          <div className="survey-table survey-table-head">
            <span>Pesquisa</span>
            <span>Versão atual</span>
            <span>Perguntas</span>
            <span>Campanhas</span>
            <span>Status</span>
            <span>Ações</span>
          </div>

          {filteredSurveys.length === 0 ? (
            <div className="empty-state">
              <strong>{query ? 'Nenhuma pesquisa encontrada' : 'Nenhuma pesquisa cadastrada'}</strong>
              <span>{query ? 'Tente ajustar o termo de busca.' : 'Crie a primeira pesquisa para começar.'}</span>
            </div>
          ) : (
            filteredSurveys.map((survey) => {
              const versionStatus = STATUS_LABELS[survey.current_version_status] || STATUS_LABELS.DRAFT
              return (
                <article className="survey-table" key={survey.id}>
                  <div>
                    <strong>{survey.name}</strong>
                    <span>{survey.code} · {survey.category}</span>
                    <Link className="inline-link" to={`/admin/surveys/${survey.id}`} style={{ marginTop: 4, display: 'inline-block', fontSize: 12 }}>
                      Gerenciar →
                    </Link>
                  </div>
                  <div>
                    <strong style={{ fontSize: 13 }}>{survey.current_version ?? '—'}</strong>
                    <span className={`status-pill ${versionStatus.variant}`} style={{ marginTop: 4, fontSize: 11 }}>
                      {versionStatus.label}
                    </span>
                  </div>
                  <div>
                    <strong>{survey.total_questions}</strong>
                  </div>
                  <div>
                    <strong>{survey.active_campaigns} ativa{survey.active_campaigns !== 1 ? 's' : ''}</strong>
                    <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {survey.latest_campaign_name ?? 'Sem campanha'}
                    </span>
                    {survey.latest_campaign_id && (
                      <Link className="inline-link" to={`/admin/campaigns/${survey.latest_campaign_id}/responses`} style={{ marginTop: 3, display: 'inline-block', fontSize: 12 }}>
                        Ver respostas →
                      </Link>
                    )}
                  </div>
                  <div>
                    <span className={`status-pill ${survey.is_active ? 'active' : 'inactive'}`}>
                      {survey.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => handleDeleteSurvey(survey)}
                      disabled={deletingSurveyId === survey.id}
                      style={{ padding: '8px 12px', fontSize: 12 }}
                    >
                      {deletingSurveyId === survey.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </section>
      )}
    </div>
  )
}