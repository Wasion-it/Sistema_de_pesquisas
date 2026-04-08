import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { createAdminSurvey, getAdminSurveys } from '../services/admin'

const INITIAL_FORM = {
  code: '',
  name: '',
  description: '',
  category: 'CUSTOM',
  versionTitle: 'Version 1',
  versionDescription: '',
  dimensions: '',
  isActive: true,
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
  const [formValues, setFormValues] = useState(INITIAL_FORM)

  useEffect(() => {
    let isMounted = true

    getAdminSurveys(token)
      .then((data) => {
        if (isMounted) {
          setSurveys(data.items)
          setErrorMessage('')
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [token])

  const filteredSurveys = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return surveys
    }

    return surveys.filter((survey) => {
      return [survey.name, survey.code, survey.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [query, surveys])

  function handleFieldChange(event) {
    const { name, type, checked, value } = event.target

    setFormValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleCreateSurvey(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const createdSurvey = await createAdminSurvey(token, {
        code: formValues.code,
        name: formValues.name,
        description: formValues.description || null,
        category: formValues.category,
        is_active: formValues.isActive,
        version_title: formValues.versionTitle,
        version_description: formValues.versionDescription || null,
        dimension_names: formValues.dimensions
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      })

      setSurveys((current) => [createdSurvey, ...current])
      setFormValues(INITIAL_FORM)
      setIsFormOpen(false)
      setSuccessMessage('Pesquisa criada com sucesso.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Gestao de Pesquisas</span>
          <h2>Pesquisas cadastradas</h2>
          <p>
            Acompanhe pesquisas, versoes publicadas e campanhas ativas do portal.
          </p>
        </div>

        <button className="primary-button" onClick={() => setIsFormOpen((current) => !current)} type="button">
          {isFormOpen ? 'Fechar formulario' : '+ Nova pesquisa'}
        </button>
      </div>

      {isFormOpen ? (
        <section className="admin-panel-card">
          <div className="panel-header-row">
            <div>
              <h3>Criar nova pesquisa</h3>
              <p>
                Cadastre a estrutura base da pesquisa, a versao inicial e dimensoes
                opcionais para comecar a configuracao.
              </p>
            </div>
          </div>

          <form className="survey-create-form" onSubmit={handleCreateSurvey}>
            <div className="form-grid two-columns">
              <label className="field-group" htmlFor="survey-code">
                <span>Codigo da pesquisa</span>
                <input
                  id="survey-code"
                  name="code"
                  placeholder="EX: PULSE-2026-Q2"
                  required
                  value={formValues.code}
                  onChange={handleFieldChange}
                />
              </label>

              <label className="field-group" htmlFor="survey-category">
                <span>Categoria</span>
                <select
                  id="survey-category"
                  name="category"
                  value={formValues.category}
                  onChange={handleFieldChange}
                >
                  <option value="CUSTOM">Custom</option>
                  <option value="GPTW">GPTW</option>
                  <option value="PULSE">Pulse</option>
                </select>
              </label>
            </div>

            <label className="field-group" htmlFor="survey-name">
              <span>Nome da pesquisa</span>
              <input
                id="survey-name"
                name="name"
                placeholder="Ex: Pesquisa de clima do 2o trimestre"
                required
                value={formValues.name}
                onChange={handleFieldChange}
              />
            </label>

            <label className="field-group" htmlFor="survey-description">
              <span>Descricao</span>
              <textarea
                id="survey-description"
                name="description"
                placeholder="Descreva o objetivo da pesquisa"
                rows="4"
                value={formValues.description}
                onChange={handleFieldChange}
              />
            </label>

            <div className="form-grid two-columns">
              <label className="field-group" htmlFor="survey-version-title">
                <span>Titulo da versao inicial</span>
                <input
                  id="survey-version-title"
                  name="versionTitle"
                  required
                  value={formValues.versionTitle}
                  onChange={handleFieldChange}
                />
              </label>

              <label className="checkbox-field" htmlFor="survey-active">
                <input
                  checked={formValues.isActive}
                  id="survey-active"
                  name="isActive"
                  type="checkbox"
                  onChange={handleFieldChange}
                />
                <span>Pesquisa ativa para configuracao</span>
              </label>
            </div>

            <label className="field-group" htmlFor="survey-version-description">
              <span>Descricao da versao inicial</span>
              <textarea
                id="survey-version-description"
                name="versionDescription"
                placeholder="Informacoes adicionais sobre a versao inicial"
                rows="3"
                value={formValues.versionDescription}
                onChange={handleFieldChange}
              />
            </label>

            <label className="field-group" htmlFor="survey-dimensions">
              <span>Dimensoes iniciais</span>
              <textarea
                id="survey-dimensions"
                name="dimensions"
                placeholder={"Uma por linha\nEx: Confianca\nLideranca\nRespeito"}
                rows="5"
                value={formValues.dimensions}
                onChange={handleFieldChange}
              />
            </label>

            <div className="form-actions-row">
              <button className="primary-button" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Salvando...' : 'Criar pesquisa'}
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setFormValues(INITIAL_FORM)
                  setIsFormOpen(false)
                  setErrorMessage('')
                }}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="admin-toolbar-card">
        <label className="field-group" htmlFor="survey-search">
          <span>Buscar pesquisa</span>
          <input
            id="survey-search"
            type="text"
            placeholder="Buscar por nome, codigo ou categoria"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </section>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
      {successMessage ? <div className="form-success">{successMessage}</div> : null}

      {isLoading ? (
        <section className="admin-panel-card">
          <p>Carregando pesquisas...</p>
        </section>
      ) : (
        <section className="admin-table-card">
          <div className="survey-table survey-table-head">
            <span>Pesquisa</span>
            <span>Versao atual</span>
            <span>Perguntas</span>
            <span>Campanhas</span>
            <span>Status</span>
          </div>

          {filteredSurveys.length === 0 ? (
            <div className="empty-state">
              <strong>Nenhuma pesquisa encontrada</strong>
              <span>Ajuste a busca ou crie uma nova pesquisa para comecar.</span>
            </div>
          ) : (
            filteredSurveys.map((survey) => (
              <article className="survey-table" key={survey.id}>
                <div>
                  <strong>{survey.name}</strong>
                  <span>{survey.code} · {survey.category}</span>
                  <Link className="inline-link" to={`/admin/surveys/${survey.id}`}>
                    Abrir →
                  </Link>
                </div>
                <div>
                  <strong>{survey.current_version ?? '—'}</strong>
                  <span>{survey.current_version_status ?? 'Nao publicada'}</span>
                </div>
                <div>
                  <strong>{survey.total_questions}</strong>
                  <span>{survey.total_dimensions} dim.</span>
                </div>
                <div>
                  <strong>{survey.active_campaigns} ativa(s)</strong>
                  <span>{survey.latest_campaign_name ?? 'Sem campanha'}</span>
                  {survey.latest_campaign_id ? (
                    <Link className="inline-link" to={`/admin/campaigns/${survey.latest_campaign_id}/responses`}>
                      Ver respostas →
                    </Link>
                  ) : null}
                </div>
                <div>
                  <span className={`status-pill ${survey.is_active ? 'active' : 'inactive'}`}>
                    {survey.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </article>
            ))
          )}
        </section>
      )}
    </div>
  )
}
