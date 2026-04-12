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

const VERSION_STATUS_LABELS = {
  DRAFT: { label: 'Rascunho', variant: 'inactive' },
  PUBLISHED: { label: 'Publicada', variant: 'active' },
  ARCHIVED: { label: 'Arquivada', variant: 'inactive' },
}

const WIZARD_STEPS = [
  { n: 1, label: 'Identificação' },
  { n: 2, label: 'Estrutura' },
]

function WizardStepIndicator({ currentStep, step1Valid, onGoTo }) {
  return (
    <div className="surveys-wizard-steps">
      {WIZARD_STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.n
        const isActive = currentStep === step.n
        const canClick = step.n < currentStep || (step.n === 2 && step1Valid)
        return (
          <div className="surveys-wizard-step-group" key={step.n}>
            <button
              className={`surveys-wizard-step ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-done' : ''}`}
              disabled={!canClick}
              type="button"
              onClick={() => canClick && onGoTo(step.n)}
            >
              <span className="surveys-wizard-step-dot">
                {isCompleted ? (
                  <svg fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" width="12">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : step.n}
              </span>
              <span className="surveys-wizard-step-label">{step.label}</span>
            </button>
            {idx < WIZARD_STEPS.length - 1 && (
              <div className={`surveys-wizard-connector ${isCompleted ? 'is-done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
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
  const [formStep, setFormStep] = useState(1)

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
    const confirmed = window.confirm(`Excluir a pesquisa "${survey.name}"?\n\nEsta ação remove versões, perguntas, campanhas e respostas vinculadas e não pode ser desfeita.`)
    if (!confirmed) return

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

  const dimensionTags = formValues.dimensions.split('\n').filter((s) => s.trim())

  return (
    <div className="admin-view">

      {/* ── Cabeçalho ── */}
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Gestão de Pesquisas</span>
          <h2>Pesquisas cadastradas</h2>
          <p>Crie, configure e publique pesquisas para os colaboradores do RH.</p>
        </div>
        <div className="admin-header-actions">
          <button
            className={isFormOpen ? 'secondary-button' : 'primary-button'}
            type="button"
            onClick={() => { if (isFormOpen) { handleCloseForm() } else { setIsFormOpen(true) } }}
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
      </div>

      {/* ── Stat cards ── */}
      {!isLoading && (
        <div className="dashboard-stats-grid">
          <article className="stat-card">
            <span>Total de pesquisas</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="stat-card">
            <span>Pesquisas ativas</span>
            <strong>{stats.active}</strong>
          </article>
          <article className="stat-card">
            <span>Com campanha aberta</span>
            <strong>{stats.withCampaign}</strong>
          </article>
          <article className="stat-card">
            <span>Total de perguntas</span>
            <strong>{stats.totalQuestions}</strong>
          </article>
        </div>
      )}

      {/* ── Alertas globais ── */}
      {successMessage && <div className="form-success">{successMessage}</div>}
      {errorMessage && !isFormOpen && <div className="form-error">{errorMessage}</div>}

      {/* ── Formulário wizard ── */}
      {isFormOpen && (
        <section className="admin-panel-card surveys-form-card">
          <WizardStepIndicator
            currentStep={formStep}
            step1Valid={step1Valid}
            onGoTo={setFormStep}
          />

          <form onSubmit={formStep === 2 ? handleCreateSurvey : (e) => { e.preventDefault(); setFormStep(2) }}>

            {/* ── Passo 1: Identificação ── */}
            {formStep === 1 && (
              <div className="survey-create-form">
                <div className="surveys-form-section-header">
                  <h3>Identifique a pesquisa</h3>
                  <p>Defina o nome, código único e a primeira versão.</p>
                </div>

                <div className="form-grid two-columns">
                  <label className="field-group" htmlFor="survey-code">
                    <span>
                      Código único
                      <span className="field-optional"> · ex: CLIMA-2026-Q1</span>
                    </span>
                    <input
                      className="surveys-code-input"
                      id="survey-code"
                      minLength={3}
                      name="code"
                      placeholder="CLIMA-2026-Q1"
                      required
                      value={formValues.code}
                      onChange={handleFieldChange}
                    />
                  </label>

                  <label className="field-group" htmlFor="survey-category">
                    <span>Tipo de pesquisa</span>
                    <input
                      id="survey-category"
                      minLength={2}
                      name="category"
                      placeholder="Great Place to Work, Clima, Onboarding…"
                      required
                      value={formValues.category}
                      onChange={handleFieldChange}
                    />
                  </label>
                </div>

                <label className="field-group" htmlFor="survey-name">
                  <span>Nome da pesquisa</span>
                  <input
                    id="survey-name"
                    minLength={3}
                    name="name"
                    placeholder="Ex: Pesquisa de Clima Organizacional 2026"
                    required
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
                  <label className="checkbox-field surveys-active-check" htmlFor="survey-active">
                    <input
                      checked={formValues.isActive}
                      id="survey-active"
                      name="isActive"
                      type="checkbox"
                      onChange={handleFieldChange}
                    />
                    <span>Pesquisa ativa ao criar</span>
                  </label>
                </div>

                <div className="form-actions-row">
                  <button className="primary-button" disabled={!step1Valid} type="submit">
                    Continuar
                    <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14">
                      <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button className="secondary-button" type="button" onClick={handleCloseForm}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* ── Passo 2: Estrutura ── */}
            {formStep === 2 && (
              <div className="survey-create-form">
                <div className="surveys-form-section-header">
                  <h3>Estrutura da pesquisa</h3>
                  <p>Adicione dimensões temáticas para organizar as perguntas depois.</p>
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

                {dimensionTags.length > 0 && (
                  <div className="surveys-dimension-preview">
                    {dimensionTags.map((d, i) => (
                      <span className="surveys-dimension-tag" key={i}>{d.trim()}</span>
                    ))}
                  </div>
                )}

                {errorMessage && <div className="form-error">{errorMessage}</div>}

                <div className="form-actions-row">
                  <button className="primary-button" disabled={isSubmitting} type="submit">
                    {isSubmitting ? (
                      <>
                        <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" width="14">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Criando pesquisa...
                      </>
                    ) : 'Criar pesquisa'}
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

      {/* ── Busca ── */}
      <section className="admin-toolbar-card">
        <label className="field-group surveys-search-label" htmlFor="survey-search">
          <span>Buscar pesquisa</span>
          <div className="surveys-search-wrap">
            <svg className="surveys-search-icon" fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="15">
              <circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" />
            </svg>
            <input
              className="surveys-search-input"
              id="survey-search"
              placeholder="Nome, código ou categoria…"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="surveys-search-clear" type="button" aria-label="Limpar busca" onClick={() => setQuery('')}>
                <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
                  <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </label>
      </section>

      {/* ── Tabela de pesquisas ── */}
      {isLoading ? (
        <section className="admin-panel-card">
          <div className="empty-state">
            <div className="surveys-spinner" />
            <strong>Carregando pesquisas…</strong>
          </div>
        </section>
      ) : (
        <section className="admin-table-card">
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
              <svg fill="none" height="32" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="32">
                <path d="M4 4h16v16H4z" /><path d="M8 8h8" /><path d="M8 12h8" /><path d="M8 16h5" />
              </svg>
              <strong>{query ? 'Nenhuma pesquisa encontrada' : 'Nenhuma pesquisa cadastrada'}</strong>
              <span>
                {query
                  ? `Nenhum resultado para "${query}". Tente outro termo.`
                  : 'Clique em "Nova pesquisa" acima para criar a primeira.'}
              </span>
              {query && (
                <button className="secondary-button" type="button" onClick={() => setQuery('')}>
                  Limpar busca
                </button>
              )}
            </div>
          ) : filteredSurveys.map((survey) => {
            const versionStatus = VERSION_STATUS_LABELS[survey.current_version_status] ?? VERSION_STATUS_LABELS.DRAFT
            return (
              <article className="survey-table" key={survey.id}>
                {/* Pesquisa */}
                <div>
                  <strong>{survey.name}</strong>
                  <span>{survey.code} · {survey.category}</span>
                </div>

                {/* Versão */}
                <div>
                  <strong>{survey.current_version ?? '—'}</strong>
                  <span className={`status-pill ${versionStatus.variant}`}>
                    {versionStatus.label}
                  </span>
                </div>

                {/* Perguntas */}
                <div>
                  <strong>{survey.total_questions}</strong>
                  <span>questões</span>
                </div>

                {/* Campanhas */}
                <div>
                  <strong>{survey.active_campaigns} ativa{survey.active_campaigns !== 1 ? 's' : ''}</strong>
                  <span className="surveys-campaign-name">
                    {survey.latest_campaign_name ?? 'Sem campanha'}
                  </span>
                  {survey.latest_campaign_id && (
                    <div className="surveys-campaign-links">
                      <Link className="inline-link" to={`/admin/campaigns/${survey.latest_campaign_id}/responses`}>
                        Respostas →
                      </Link>
                      <Link className="inline-link" to={`/admin/campaigns/${survey.latest_campaign_id}/kpis`}>
                        KPIs →
                      </Link>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span className={`status-pill ${survey.is_active ? 'active' : 'inactive'}`}>
                    {survey.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>

                {/* Ações */}
                <div>
                  <div className="surveys-row-actions">
                    <Link
                      className="secondary-link-button surveys-action-btn"
                      to={`/admin/surveys/${survey.id}`}
                    >
                      Gerenciar
                    </Link>
                    <button
                      className="danger-button surveys-action-btn"
                      disabled={deletingSurveyId === survey.id}
                      type="button"
                      onClick={() => handleDeleteSurvey(survey)}
                    >
                      {deletingSurveyId === survey.id ? 'Excluindo…' : 'Excluir'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}