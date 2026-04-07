import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../auth/AuthProvider'
import { getAdminSurveys } from '../services/admin'

export function AdminSurveysPage() {
  const { token } = useAuth()
  const [surveys, setSurveys] = useState([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    getAdminSurveys(token)
      .then((data) => {
        if (isMounted) {
          setSurveys(data.items)
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

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Gestao de Pesquisas</span>
          <h2>Pesquisas cadastradas</h2>
          <p>
            Visao inicial para acompanhar pesquisas, versoes publicadas e campanhas
            ativas do portal.
          </p>
        </div>

        <button className="primary-button" type="button">
          Nova pesquisa
        </button>
      </div>

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
              <span>Ajuste a busca para encontrar uma pesquisa cadastrada.</span>
            </div>
          ) : (
            filteredSurveys.map((survey) => (
              <article className="survey-table" key={survey.id}>
                <div>
                  <strong>{survey.name}</strong>
                  <span>{survey.code} · {survey.category}</span>
                </div>
                <div>
                  <strong>{survey.current_version ?? 'Sem versao'}</strong>
                  <span>{survey.current_version_status ?? 'Nao publicada'}</span>
                </div>
                <div>
                  <strong>{survey.total_questions}</strong>
                  <span>{survey.total_dimensions} dimensoes</span>
                </div>
                <div>
                  <strong>{survey.active_campaigns} ativa(s)</strong>
                  <span>{survey.latest_campaign_name ?? 'Sem campanha'}</span>
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
