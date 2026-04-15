import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { CampaignResponseModal } from '../components/CampaignResponseModal'
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

function getResponseSummary(response) {
  return [response.department_name ?? 'Departamento não informado', response.position_name ?? 'Posição não informada']
    .filter(Boolean)
    .join(' · ')
}

export function AdminCampaignResponsesPage() {
  const { campaignId } = useParams()
  const { token } = useAuth()
  const [pageData, setPageData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedResponse, setSelectedResponse] = useState(null)
  const [selectedResponseNumber, setSelectedResponseNumber] = useState(null)

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
  const departmentProgress = pageData?.department_progress ?? []
  const responses = pageData?.responses ?? []

  function openResponseModal(response, responseNumber) {
    setSelectedResponse(response)
    setSelectedResponseNumber(responseNumber)
  }

  function closeResponseModal() {
    setSelectedResponse(null)
    setSelectedResponseNumber(null)
  }

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Respostas da Campanha</span>
          <h2>{campaign?.name ?? 'Campanha'}</h2>
          <p>
            Adesao, volume de envios e detalhamento das respostas recebidas.
          </p>
        </div>

        <div className="admin-header-actions">
          {pageData?.survey_id ? (
            <Link className="secondary-link-button" to={`/admin/surveys/${pageData.survey_id}`}>
              ← Voltar para pesquisa
            </Link>
          ) : null}
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
                <h3>{campaign?.code}</h3>
                <p>{pageData.survey_name} · {pageData.version_title}</p>
              </div>
              <span className={`status-pill ${campaign?.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                {campaign?.status}
              </span>
            </div>

            <div className="mini-metrics-grid">
              <div className="mini-metric-card">
                <strong>{formatDateTime(campaign?.start_at)}</strong>
                <span>Abertura</span>
              </div>
              <div className="mini-metric-card">
                <strong>{formatDateTime(campaign?.end_at)}</strong>
                <span>Encerramento</span>
              </div>
            </div>
          </section>

          <section className="dashboard-stats-grid">
            <article className="stat-card">
              <span>Publico previsto</span>
              <strong>{summary?.audience_count ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Respostas criadas</span>
              <strong>{summary?.total_responses ?? 0}</strong>
            </article>
            <article className="stat-card">
              <span>Enviadas</span>
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
                <h3>Adesão por departamento</h3>
                <p>Compara respostas enviadas com a base cadastrada em cada departamento.</p>
              </div>
            </div>

            {departmentProgress.length === 0 ? (
              <div className="empty-state">
                <strong>Sem dados por departamento</strong>
                <span>As participações ainda não geraram respostas com departamento identificado.</span>
              </div>
            ) : (
              <div className="stack-list">
                {departmentProgress.map((item) => (
                  <article className="stack-item-card" key={item.department_id}>
                    <div>
                      <strong>{item.department_name}</strong>
                      <span>{item.submitted_responses} enviada(s) de {item.total_people} pessoa(s)</span>
                      <span style={{ color: 'var(--slate-500)', fontSize: 13 }}>
                        Pendentes: {item.pending_people} · Adesão: {item.participation_rate.toFixed(1)}%
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-panel-card">
            <div className="panel-header-row">
              <div>
                <h3>Respostas recebidas</h3>
                <p>
                  {responses.length} resposta(s) · {pageData.total_questions} pergunta(s) na versao
                </p>
              </div>
            </div>

            {responses.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhuma resposta ainda</strong>
                <span>A campanha ainda nao recebeu participacoes.</span>
              </div>
            ) : (
              <div className="admin-response-list">
                {responses.map((response, index) => (
                  <article className="admin-response-card" key={response.response_id}>
                    <div className="admin-response-card-header">
                      <div>
                        <h4>Resposta #{index + 1}</h4>
                        <p>{getResponseSummary(response)}</p>
                      </div>
                      <span className={`status-pill ${response.status === 'SUBMITTED' ? 'active' : 'inactive'}`}>
                        {response.status === 'SUBMITTED' ? 'Enviada' : 'Rascunho'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '16px 20px 18px', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <span className="question-card-tag">ID {response.response_id}</span>
                        <span className="question-card-tag">{response.department_name ?? 'Sem departamento'}</span>
                        <span className="question-card-tag">{response.position_name ?? 'Sem posição'}</span>
                      </div>

                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => openResponseModal(response, index + 1)}
                      >
                        Ver perguntas e respostas
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <CampaignResponseModal
            response={selectedResponse}
            responseNumber={selectedResponseNumber}
            onClose={closeResponseModal}
          />
        </>
      ) : null}
    </div>
  )
}