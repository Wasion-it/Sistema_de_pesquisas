import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { getAdminCampaignResponses } from '../services/admin'

function formatPercent(value) {
  return `${Math.round(value)}%`
}

function getBarColor(percentage) {
  if (percentage >= 75) {
    return 'linear-gradient(90deg, var(--green-600), #4ade80)'
  }

  if (percentage >= 50) {
    return 'linear-gradient(90deg, var(--blue-600), var(--blue-400))'
  }

  if (percentage >= 25) {
    return 'linear-gradient(90deg, var(--amber-500), var(--amber-400))'
  }

  return 'linear-gradient(90deg, var(--red-600), #f87171)'
}

function buildQuestionMetrics(pageData) {
  const submittedResponses = (pageData?.responses ?? []).filter((response) => response.status === 'SUBMITTED')
  const submittedCount = submittedResponses.length

  return (pageData?.questions ?? []).map((question) => {
    const answers = submittedResponses
      .map((response) => response.answers.find((answer) => answer.question_id === question.id))
      .filter(Boolean)

    const responseRate = submittedCount > 0 ? (answers.length / submittedCount) * 100 : 0

    if (question.question_type === 'SCALE_1_5') {
      const numericAnswers = answers
        .map((answer) => answer.numeric_answer)
        .filter((value) => typeof value === 'number')
      const average = numericAnswers.length > 0
        ? numericAnswers.reduce((sum, value) => sum + value, 0) / numericAnswers.length
        : null
      const distribution = Array.from(
        { length: question.scale_max - question.scale_min + 1 },
        (_, index) => question.scale_min + index,
      ).map((value) => {
        const count = numericAnswers.filter((answer) => answer === value).length
        const percentage = numericAnswers.length > 0 ? (count / numericAnswers.length) * 100 : 0
        return { label: String(value), count, percentage }
      })

      return {
        ...question,
        answeredCount: numericAnswers.length,
        responseRate,
        average,
        distribution,
        mode: 'scale',
      }
    }

    if (question.question_type === 'SINGLE_CHOICE') {
      const selectedLabels = answers
        .map((answer) => answer.selected_option_label)
        .filter(Boolean)
      const distribution = (question.options ?? []).map((option) => {
        const count = selectedLabels.filter((label) => label === option.label).length
        const percentage = selectedLabels.length > 0 ? (count / selectedLabels.length) * 100 : 0
        return { label: option.label, count, percentage }
      })

      return {
        ...question,
        answeredCount: selectedLabels.length,
        responseRate,
        distribution,
        mode: 'choice',
      }
    }

    const textAnswers = answers
      .map((answer) => answer.text_answer?.trim())
      .filter(Boolean)
    const averageLength = textAnswers.length > 0
      ? Math.round(textAnswers.reduce((sum, value) => sum + value.length, 0) / textAnswers.length)
      : 0

    return {
      ...question,
      answeredCount: textAnswers.length,
      responseRate,
      averageLength,
      sampleAnswers: textAnswers.slice(0, 3),
      mode: 'text',
    }
  })
}

function renderDistributionBars(items) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: 'var(--slate-500)' }}>
            <span style={{ color: 'var(--slate-700)', fontWeight: 600 }}>{item.label}</span>
            <span>{item.count} · {formatPercent(item.percentage)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'var(--slate-100)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${item.percentage}%`,
                height: '100%',
                borderRadius: 999,
                background: getBarColor(item.percentage),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

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

  const questionMetrics = useMemo(() => buildQuestionMetrics(pageData), [pageData])

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

          <section className="admin-panel-card">
            <div className="panel-header-row">
              <div>
                <h3>KPIs por pergunta</h3>
                <p>Métricas básicas por questão conforme o tipo de resposta configurado.</p>
              </div>
            </div>

            {questionMetrics.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhuma pergunta disponível</strong>
                <span>Publique uma campanha com perguntas para visualizar os indicadores por questão.</span>
              </div>
            ) : (
              <div className="stack-list">
                {questionMetrics.map((question) => (
                  <article className="stack-item-card" key={question.id} style={{ alignItems: 'stretch', flexDirection: 'column' }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <strong>{question.question_text}</strong>
                          <span>{question.code} · {question.question_type === 'SCALE_1_5' ? 'Escala' : question.question_type === 'TEXT' ? 'Texto' : 'Opções'}</span>
                        </div>
                        <span className="status-pill active">{formatPercent(question.responseRate)} de resposta</span>
                      </div>

                      <div className="mini-metrics-grid" style={{ marginTop: 0 }}>
                        <div className="mini-metric-card">
                          <strong>{question.answeredCount}</strong>
                          <span>Respostas válidas</span>
                        </div>
                        <div className="mini-metric-card">
                          <strong>
                            {question.mode === 'scale'
                              ? (question.average?.toFixed(1) ?? '-')
                              : question.mode === 'text'
                                ? `${question.averageLength}`
                                : `${question.distribution?.reduce((best, item) => item.count > best.count ? item : best, question.distribution?.[0] ?? { label: '-', count: 0 }).label}`}
                          </strong>
                          <span>
                            {question.mode === 'scale'
                              ? 'Média'
                              : question.mode === 'text'
                                ? 'Tamanho médio'
                                : 'Opção líder'}
                          </span>
                        </div>
                      </div>

                      {question.mode === 'scale' || question.mode === 'choice' ? (
                        renderDistributionBars(question.distribution)
                      ) : (
                        <div style={{ display: 'grid', gap: 8 }}>
                          {question.sampleAnswers.length > 0 ? question.sampleAnswers.map((answer, index) => (
                            <div key={`${question.id}-${index}`} style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', fontSize: 13, color: 'var(--slate-600)', lineHeight: 1.6 }}>
                              {answer}
                            </div>
                          )) : (
                            <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', fontSize: 13, color: 'var(--slate-500)' }}>
                              Nenhuma resposta textual enviada para esta pergunta.
                            </div>
                          )}
                        </div>
                      )}
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