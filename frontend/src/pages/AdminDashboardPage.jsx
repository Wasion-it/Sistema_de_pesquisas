import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { getAdminDashboard } from '../services/admin'

export function AdminDashboardPage() {
  const { token, user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    getAdminDashboard(token)
      .then((data) => {
        if (isMounted) {
          setDashboard(data)
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

  const summary = dashboard?.summary
  const recentSurveys = dashboard?.recent_surveys ?? []

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h2>Visao geral do portal RH</h2>
          <p>
            Painel inicial com leitura rapida do ambiente administrativo e das
            pesquisas ativas no sistema.
          </p>
        </div>

        <div className="admin-highlight-card">
          <strong>{user?.full_name}</strong>
          <span>{user?.role}</span>
          <span>{user?.email}</span>
        </div>
      </div>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

      {isLoading ? (
        <section className="admin-panel-card">
          <p>Carregando indicadores do portal...</p>
        </section>
      ) : (
        <>
          <section className="dashboard-stats-grid">
            <article className="stat-card">
              <span>Pesquisas</span>
              <strong>{summary?.total_surveys ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Versoes publicadas</span>
              <strong>{summary?.published_versions ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Campanhas ativas</span>
              <strong>{summary?.active_campaigns ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Respostas</span>
              <strong>{summary?.total_responses ?? 0}</strong>
            </article>
          </section>

          <section className="dashboard-detail-grid">
            <article className="admin-panel-card">
              <div className="panel-header-row">
                <div>
                  <h3>Fluxo de respostas</h3>
                  <p>Rascunhos e envios finais registrados no ambiente local.</p>
                </div>
              </div>

              <div className="mini-metrics-grid">
                <div className="mini-metric-card">
                  <strong>{summary?.draft_responses ?? 0}</strong>
                  <span>Rascunhos</span>
                </div>
                <div className="mini-metric-card">
                  <strong>{summary?.submitted_responses ?? 0}</strong>
                  <span>Enviadas</span>
                </div>
              </div>
            </article>

            <article className="admin-panel-card">
              <div className="panel-header-row">
                <div>
                  <h3>Atalhos</h3>
                  <p>Navegacao inicial para as principais operacoes do portal.</p>
                </div>
              </div>

              <div className="quick-actions-grid">
                <Link className="quick-action-card" to="/admin/surveys">
                  <strong>Gerenciar pesquisas</strong>
                  <span>Consultar pesquisas, versoes e campanhas ativas.</span>
                </Link>
              </div>
            </article>
          </section>

          <section className="admin-panel-card">
            <div className="panel-header-row">
              <div>
                <h3>Pesquisas recentes</h3>
                <p>Ultimas pesquisas atualizadas e sua situacao atual.</p>
              </div>
              <Link className="back-link" to="/admin/surveys">
                Ver todas
              </Link>
            </div>

            {recentSurveys.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhuma pesquisa cadastrada</strong>
                <span>Adicione a primeira pesquisa para iniciar a operacao do portal.</span>
              </div>
            ) : (
              <div className="recent-surveys-list">
                {recentSurveys.map((survey) => (
                  <article className="recent-survey-item" key={survey.id}>
                    <div>
                      <strong>{survey.name}</strong>
                      <span>{survey.code} · {survey.category}</span>
                    </div>
                    <div>
                      <strong>{survey.current_version ?? 'Sem versao'}</strong>
                      <span>{survey.active_campaigns} campanha(s) ativa(s)</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
