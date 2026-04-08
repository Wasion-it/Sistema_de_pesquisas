import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { getAdminCampaignResponses } from '../services/admin'

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getAnswerValue(answer) {
  if (answer.selected_option_label) {
    return answer.selected_option_label
  }

  if (typeof answer.numeric_answer === 'number') {
    return String(answer.numeric_answer)
  }

  if (answer.text_answer) {
    return answer.text_answer
  }

  return 'Sem resposta registrada'
}

export function AdminCampaignResponsesPage() {
  const { campaignId } = useParams()
  const { token } = useAuth()
  const [pageData, setPageData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setErrorMessage('')

    getAdminCampaignResponses(token, campaignId)
      .then((data) => {
        if (isMounted) {
          setPageData(data)
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
  }, [campaignId, token])

  const campaign = pageData?.campaign
  const summary = pageData?.summary
  const responses = pageData?.responses ?? []

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Campanha</span>
          <h2>Respostas da campanha</h2>
          <p>
            Acompanhe a adesao da campanha, o volume de envios e o detalhamento
            das respostas recebidas.
          </p>
        </div>

        <div className="admin-header-actions">
          {pageData?.survey_id ? (
            <Link className="secondary-link-button" to={`/admin/surveys/${pageData.survey_id}`}>
              Voltar para pesquisa
            </Link>
          ) : null}
          <Link className="back-link" to="/admin/surveys">
            Ver pesquisas
          </Link>
        </div>
      </div>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

      {isLoading ? (
        <section className="admin-panel-card">
          <p>Carregando respostas da campanha...</p>
        </section>
      ) : pageData ? (
        <>
          <section className="admin-panel-card">
            <div className="panel-header-row">
              <div>
                <h3>{campaign?.name}</h3>
                <p>{campaign?.code} · {campaign?.status}</p>
              </div>
              <div className="admin-highlight-card">
                <strong>{pageData.survey_name}</strong>
                <span>{pageData.survey_code}</span>
                <span>{pageData.version_title}</span>
              </div>
            </div>

            <div className="mini-metrics-grid">
              <div className="mini-metric-card">
                <strong>{formatDateTime(campaign?.start_at)}</strong>
                <span>Inicio da campanha</span>
              </div>
              <div className="mini-metric-card">
                <strong>{formatDateTime(campaign?.end_at)}</strong>
                <span>Fim da campanha</span>
              </div>
            </div>
          </section>

          <section className="admin-summary-grid">
            <article className="stat-card">
              <span>Publico previsto</span>
              <strong>{summary?.audience_count ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Respostas criadas</span>
              <strong>{summary?.total_responses ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Respostas enviadas</span>
              <strong>{summary?.submitted_responses ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Rascunhos</span>
              <strong>{summary?.draft_responses ?? 0}</strong>
            </article>
          </section>

          <section className="admin-panel-card">
            <div className="panel-header-row">
              <div>
                <h3>Detalhamento das respostas</h3>
                <p>
                  {responses.length} resposta(s) registrada(s) para {pageData.total_questions} pergunta(s) da versao.
                </p>
              </div>
            </div>

            {responses.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhuma resposta encontrada</strong>
                <span>A campanha ainda nao recebeu participacoes.</span>
              </div>
            ) : (
              <div className="admin-response-list">
                {responses.map((response) => (
                  <article className="admin-response-card" key={response.response_id}>
                    <div className="admin-response-card-header">
                      <div>
                        <h4>Resposta #{response.response_id}</h4>
                        <p>
                          Iniciada em {formatDateTime(response.started_at)}
                          {response.submitted_at ? ` · Enviada em ${formatDateTime(response.submitted_at)}` : ''}
                        </p>
                      </div>
                      <span className={`status-pill ${response.status === 'SUBMITTED' ? 'active' : 'inactive'}`}>
                        {response.status}
                      </span>
                    </div>

                    <div className="admin-answer-list">
                      {response.answers.map((answer) => (
                        <div className="admin-answer-item" key={`${response.response_id}-${answer.question_id}`}>
                          <strong>{answer.question_text}</strong>
                          <div className="admin-answer-meta">
                            <span>{answer.question_code}</span>
                            <span>{answer.question_type}</span>
                          </div>
                          <div className="admin-answer-value">{getAnswerValue(answer)}</div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}