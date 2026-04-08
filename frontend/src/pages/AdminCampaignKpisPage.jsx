import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { getAdminCampaignResponses } from '../services/admin'

export function AdminCampaignKpisPage() {
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

  const kpis = useMemo(() => {
    const audienceCount = summary?.audience_count ?? 0
    const totalResponses = summary?.total_responses ?? 0
    const submittedResponses = summary?.submitted_responses ?? 0
    const draftResponses = summary?.draft_responses ?? 0
    const adhesionRate = audienceCount > 0 ? Math.round((submittedResponses / audienceCount) * 100) : 0
    const engagementRate = audienceCount > 0 ? Math.round((totalResponses / audienceCount) * 100) : 0

    return {
      audienceCount,
      totalResponses,
      submittedResponses,
      draftResponses,
      adhesionRate,
      engagementRate,
    }
  }, [summary])

  const statusLabel = campaign?.status === 'ACTIVE' ? 'Ativa' : campaign?.status === 'CLOSED' ? 'Encerrada' : 'Inativa'

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">KPIs da Campanha</span>
          <h2>{campaign?.name ?? `Campanha #${campaignId}`}</h2>
          <p>Visão consolidada inicial da campanha com os indicadores principais de participação.</p>
        </div>

        <div className="admin-header-actions">
          <Link className="secondary-link-button" to={`/admin/campaigns/${campaignId}/responses`}>
            Ver respostas
          </Link>
        </div>
      </div>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

      {isLoading ? (
        <section className="admin-panel-card">
          <p>Carregando KPIs da campanha...</p>
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
                {statusLabel}
              </span>
            </div>

            <div className="mini-metrics-grid">
              <div className="mini-metric-card">
                <strong>{pageData.total_questions}</strong>
                <span>Perguntas</span>
              </div>
              <div className="mini-metric-card">
                <strong>{kpis.engagementRate}%</strong>
                <span>Engajamento bruto</span>
              </div>
            </div>
          </section>

          <section className="dashboard-stats-grid">
            <article className="stat-card">
              <span>Público previsto</span>
              <strong>{kpis.audienceCount}</strong>
            </article>
            <article className="stat-card">
              <span>Respostas criadas</span>
              <strong>{kpis.totalResponses}</strong>
            </article>
            <article className="stat-card">
              <span>Respostas enviadas</span>
              <strong>{kpis.submittedResponses}</strong>
            </article>
            <article className="stat-card">
              <span>Taxa de adesão</span>
              <strong>{kpis.adhesionRate}%</strong>
            </article>
          </section>

          <section className="admin-panel-card">
            <div className="panel-header-row">
              <div>
                <h3>Leitura rápida</h3>
                <p>Resumo textual para apoiar a leitura inicial da performance da campanha.</p>
              </div>
            </div>

            <div className="stack-list compact-list">
              <article className="stack-item-card">
                <div>
                  <strong>Participação confirmada</strong>
                  <span>{kpis.submittedResponses} colaborador(es) concluíram a pesquisa.</span>
                </div>
              </article>
              <article className="stack-item-card">
                <div>
                  <strong>Alcance atual</strong>
                  <span>{kpis.adhesionRate}% do público previsto já respondeu.</span>
                </div>
              </article>
              <article className="stack-item-card">
                <div>
                  <strong>Rascunhos remanescentes</strong>
                  <span>{kpis.draftResponses} registro(s) em rascunho ainda constam para esta campanha.</span>
                </div>
              </article>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}