import { useEffect, useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { getAdminCampaignResponses, getAdminSurveyDetail } from '../services/admin'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtPct(value) {
  return `${Math.round(value)}%`
}

function getRiskLevel(pct) {
  if (pct <= 33) {
    return { label: 'Alto risco', color: '#dc2626' }
  }

  if (pct <= 66) {
    return { label: 'Risco moderado', color: '#d97706' }
  }

  return { label: 'Baixo risco', color: '#16a34a' }
}

function fmtScore(value) {
  return value.toFixed(2)
}

function fmtDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function getQuestionMetaMaps(pageData, surveyData) {
  const byId = new Map()
  const byCode = new Map()

  ;[pageData, surveyData?.current_version].forEach((source) => {
    (source?.questions ?? []).forEach((question) => {
      byId.set(question.id, question)
      if (question.code) {
        byCode.set(String(question.code).toUpperCase(), question)
      }
    })
  })

  return { byId, byCode }
}

function getDimensionMetaMap(pageData, surveyData) {
  const map = new Map()

  ;[pageData, surveyData].forEach((source) => {
    (source?.dimensions ?? []).forEach((dimension) => {
      map.set(dimension.id, dimension)
    })
  })

  return map
}

function resolveQuestionMeta(answer, questionMetaMaps) {
  return questionMetaMaps.byId.get(answer.question_id) ?? questionMetaMaps.byCode.get(String(answer.question_code ?? '').toUpperCase()) ?? null
}

function getEffectiveScaleScore(question, numericAnswer) {
  if (!question || numericAnswer == null) {
    return null
  }

  const min = question.scale_min ?? 1
  const max = question.scale_max ?? 5
  return question.is_negative ? max + min - numericAnswer : numericAnswer
}

// ─── KPI computation ────────────────────────────────────────────────────────

function computeKpis(pageData, surveyData) {
  const questionMetaMaps = getQuestionMetaMaps(pageData, surveyData)
  const dimensionMetaMap = getDimensionMetaMap(pageData, surveyData)
  const submitted = (pageData.responses ?? []).filter((r) => r.status === 'SUBMITTED')
  const { audience_count, submitted_responses, draft_responses, total_responses } = pageData.summary

  // Taxa de adesão
  const adhesionRate = audience_count > 0 ? (submitted_responses / audience_count) * 100 : 0

  // Taxa de conclusão (dos que iniciaram, quantos finalizaram)
  const completionRate = total_responses > 0 ? (submitted_responses / total_responses) * 100 : 0

  // Todos os itens de resposta de respondentes finalizados
  const allItems = submitted.flatMap((r) => r.answers)

  // Score médio geral (escala 1-5)
  const scaleItems = allItems
    .filter((a) => a.question_type === 'SCALE_1_5' && a.numeric_answer != null)
    .map((answer) => {
      const question = resolveQuestionMeta(answer, questionMetaMaps)
      const effectiveScore = getEffectiveScaleScore(question, answer.numeric_answer)
      const scoreWeight = question?.score_weight ?? 1
      const weightedScore = effectiveScore != null ? effectiveScore * scoreWeight : null

      return {
        ...answer,
        effectiveScore,
        scoreWeight,
        weightedScore,
        scaleMax: question?.scale_max ?? 5,
      }
    })
    .filter((answer) => answer.effectiveScore != null)

  const totalScaleWeight = scaleItems.reduce((sum, item) => sum + item.scoreWeight, 0)
  const avgScore = totalScaleWeight > 0
    ? scaleItems.reduce((sum, item) => sum + item.weightedScore, 0) / totalScaleWeight
    : null
  const avgScoreReference = totalScaleWeight > 0
    ? scaleItems.reduce((sum, item) => sum + (item.scaleMax * item.scoreWeight), 0) / totalScaleWeight
    : null

  // Distribuição Likert (1 a 5)
  const likertDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  scaleItems.forEach((a) => { likertDist[a.effectiveScore] = (likertDist[a.effectiveScore] ?? 0) + 1 })
  const likertTotal = scaleItems.length

  // eNPS a partir de perguntas SINGLE_CHOICE com "RECOMMEND" no código
  // Mapeamento: opções YES/AGREE_FULL = Promotor, MAYBE/NEUTRAL = Neutro, NO/DISAGREE = Detrator
  const npsItems = allItems.filter((a) => {
    const code = (a.question_code ?? '').toUpperCase()
    return a.question_type === 'SINGLE_CHOICE' && (code.includes('RECOMMEND') || code.includes('NPS') || code.includes('INDICAR'))
  })

  let enps = null
  let promoters = 0, passives = 0, detractors = 0
  if (npsItems.length > 0) {
    npsItems.forEach((a) => {
      const opt = (a.selected_option_label ?? '').toUpperCase()
      if (opt.includes('YES') || opt.includes('SIM') || opt.includes('TOTAL') || opt.includes('CONCORDO')) {
        promoters++
      } else if (opt.includes('MAYBE') || opt.includes('TALVEZ') || opt.includes('NEUTRO') || opt.includes('PARCIAL')) {
        passives++
      } else {
        detractors++
      }
    })
    const total = npsItems.length
    enps = Math.round(((promoters - detractors) / total) * 100)
  }

  // Risco por pergunta
  const questionMap = {}
  scaleItems.forEach((a) => {
    const key = a.question_code
    if (!questionMap[key]) {
      questionMap[key] = {
        text: a.question_text,
        code: key,
        scores: [],
        weightedScores: [],
        scoreWeight: a.scoreWeight,
        isNegative: resolveQuestionMeta(a, questionMetaMaps)?.is_negative ?? false,
        scaleMax: resolveQuestionMeta(a, questionMetaMaps)?.scale_max ?? 5,
      }
    }
    questionMap[key].scores.push(a.effectiveScore)
    questionMap[key].weightedScores.push(a.weightedScore)
  })

  const questionScores = Object.values(questionMap)
    .map((q) => ({
      code: q.code,
      text: q.text,
      avg: ((q.scores.reduce((sum, value) => sum + value, 0) / q.scores.length) / q.scaleMax) * q.scoreWeight,
      count: q.scores.length,
      scoreWeight: q.scoreWeight,
      isNegative: q.isNegative,
      maxScore: q.scoreWeight,
    }))
    .sort((a, b) => b.avg - a.avg)

  const dimensionMap = {}
  scaleItems.forEach((answer) => {
    const question = resolveQuestionMeta(answer, questionMetaMaps)
    const dimension = question?.dimension_id != null ? dimensionMetaMap.get(question.dimension_id) : null
    const key = dimension?.id ?? 'unassigned'
    const normalizedScore = question?.scale_max > 0 ? answer.effectiveScore / question.scale_max : null
    const scoreWeight = question?.score_weight ?? 1

    if (!dimensionMap[key]) {
      dimensionMap[key] = {
        code: dimension?.code ?? 'UNASSIGNED',
        name: dimension?.name ?? 'Sem dimensão',
        scores: [],
        weightedNormalizedScores: [],
        scoreWeightTotal: 0,
        questionIds: new Set(),
      }
    }

    if (normalizedScore != null) {
      dimensionMap[key].scores.push(normalizedScore)
      dimensionMap[key].weightedNormalizedScores.push(normalizedScore * scoreWeight)
      dimensionMap[key].scoreWeightTotal += scoreWeight
    }

    if (question) {
      dimensionMap[key].questionIds.add(question.id)
    }
  })

  const dimensionScores = Object.values(dimensionMap)
    .map((dimension) => ({
      code: dimension.code,
      name: dimension.name,
      avg: dimension.weightedNormalizedScores.reduce((sum, value) => sum + value, 0),
      maxScore: dimension.scoreWeightTotal,
      count: dimension.scores.length,
      questionCount: dimension.questionIds.size,
      ratio: dimension.scoreWeightTotal > 0
        ? dimension.weightedNormalizedScores.reduce((sum, value) => sum + value, 0) / dimension.scoreWeightTotal
        : 0,
    }))
    .sort((a, b) => b.ratio - a.ratio)

  return {
    adhesionRate,
    completionRate,
    avgScore,
    avgScoreReference,
    likertDist,
    likertTotal,
    enps,
    promoters,
    passives,
    detractors,
    npsTotal: npsItems.length,
    questionScores,
    submittedCount: submitted_responses,
    audienceCount: audience_count,
    draftCount: draft_responses,
    totalStarted: total_responses,
    dimensionScores,
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color }) {
  return (
    <article
      className="stat-card"
      style={color ? { '--accent': color, borderTop: `3px solid ${color}` } : {}}
    >
      <span>{label}</span>
      <strong style={color ? { color } : {}}>{value}</strong>
      {sub && <span style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: -8 }}>{sub}</span>}
    </article>
  )
}

function LikertBar({ dist, total }) {
  const LABELS = { 1: 'Discordo totalmente', 2: 'Discordo', 3: 'Neutro', 4: 'Concordo', 5: 'Concordo totalmente' }
  const COLORS = {
    1: '#dc2626',
    2: '#ea580c',
    3: '#d97706',
    4: '#16a34a',
    5: '#2563eb',
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {[1, 2, 3, 4, 5].map((v) => {
        const count = dist[v] ?? 0
        const pct = total > 0 ? (count / total) * 100 : 0
        return (
          <div key={v} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 48px', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--slate-600)', fontWeight: 500 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: COLORS[v], marginRight: 6, verticalAlign: 'middle' }} />
              {v} — {LABELS[v]}
            </span>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--slate-100)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: COLORS[v], borderRadius: 4, transition: 'width .5s ease' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-700)', textAlign: 'right' }}>
              {count} <span style={{ fontWeight: 400, color: 'var(--slate-400)', fontSize: 11 }}>({Math.round(pct)}%)</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function ENPSGauge({ enps, promoters, passives, detractors, total }) {
  const score = Math.max(-100, Math.min(100, enps))
  const pct = (score + 100) / 200 // 0..1
  const color = score >= 50 ? '#16a34a' : score >= 0 ? '#d97706' : '#dc2626'
  const label = score >= 75 ? 'Excelente' : score >= 50 ? 'Ótimo' : score >= 0 ? 'Regular' : 'Crítico'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <span style={{ fontSize: '3rem', fontWeight: 800, color, lineHeight: 1, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
          {score > 0 ? '+' : ''}{score}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color, paddingBottom: 6, background: color + '18', padding: '4px 10px', borderRadius: 999 }}>
          {label}
        </span>
      </div>

      {/* Track */}
      <div style={{ position: 'relative', height: 10, borderRadius: 5, background: 'linear-gradient(90deg, #dc2626 0%, #d97706 45%, #16a34a 100%)' }}>
        <div style={{
          position: 'absolute',
          top: '50%', left: `${pct * 100}%`,
          transform: 'translate(-50%, -50%)',
          width: 18, height: 18,
          borderRadius: '50%',
          background: '#fff',
          border: `3px solid ${color}`,
          boxShadow: '0 2px 6px rgba(0,0,0,.15)',
        }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
        {[
          { label: 'Promotores', count: promoters, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Neutros', count: passives, color: '#d97706', bg: '#fffbeb' },
          { label: 'Detratores', count: detractors, color: '#dc2626', bg: '#fef2f2' },
        ].map((item) => (
          <div key={item.label} style={{ padding: '12px 14px', borderRadius: 10, background: item.bg, border: `1px solid ${item.color}22` }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.count}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: item.color, marginTop: 4, opacity: .8 }}>{item.label}</div>
            <div style={{ fontSize: 11, color: 'var(--slate-400)', marginTop: 2 }}>
              {total > 0 ? Math.round((item.count / total) * 100) : 0}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuestionRanking({ questions }) {
  if (questions.length === 0) {
    return <div className="empty-state"><strong>Sem perguntas de escala</strong></div>
  }
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {questions.map((q, i) => {
        const ratio = q.maxScore > 0 ? q.avg / q.maxScore : 0
        const pct = ratio * 100
        const risk = getRiskLevel(pct)
        return (
          <div key={q.code} style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--slate-700)', fontWeight: 500, lineHeight: 1.4, flex: 1 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--slate-400)', marginRight: 6 }}>{i + 1}.</span>
                {q.text}
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: risk.color, whiteSpace: 'nowrap' }}>
                {fmtPct(pct)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--slate-500)', background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 999 }}>Peso {q.scoreWeight ?? 1}x</span>
              {q.isNegative ? <span style={{ fontSize: 11, color: '#9a3412', background: '#ffedd5', padding: '2px 8px', borderRadius: 999 }}>Pontuação invertida</span> : null}
              <span style={{ fontSize: 11, color: risk.color, background: `${risk.color}14`, padding: '2px 8px', borderRadius: 999 }}>{risk.label}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--slate-100)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: risk.color, borderRadius: 3, transition: 'width .5s ease' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--slate-400)' }}>{q.count} resposta{q.count !== 1 ? 's' : ''}</span>
          </div>
        )
      })}
    </div>
  )
}

function DimensionRanking({ dimensions }) {
  if (dimensions.length === 0) {
    return <div className="empty-state"><strong>Sem dimensões de risco</strong></div>
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {dimensions.map((dimension, index) => {
        const pct = Math.max(0, Math.min(100, dimension.ratio * 100))
        const risk = getRiskLevel(pct)

        return (
          <div key={dimension.code} style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--slate-700)', fontWeight: 500, lineHeight: 1.4, flex: 1 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--slate-400)', marginRight: 6 }}>{index + 1}.</span>
                {dimension.name}
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: risk.color, whiteSpace: 'nowrap' }}>{fmtPct(pct)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--slate-500)', background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 999 }}>{dimension.questionCount} pergunta(s)</span>
              <span style={{ fontSize: 11, color: 'var(--slate-500)', background: 'var(--slate-100)', padding: '2px 8px', borderRadius: 999 }}>{dimension.count} resposta(s)</span>
              <span style={{ fontSize: 11, color: risk.color, background: `${risk.color}14`, padding: '2px 8px', borderRadius: 999 }}>{risk.label}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--slate-100)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: risk.color, borderRadius: 3, transition: 'width .5s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function AdminCampaignKpisPage() {
  const { campaignId } = useParams()
  const { token } = useAuth()

  const [pageData, setPageData] = useState(null)
  const [surveyData, setSurveyData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSurveyLoading, setIsSurveyLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    setError('')

    getAdminCampaignResponses(token, campaignId)
      .then((data) => { if (mounted) setPageData(data) })
      .catch((err) => { if (mounted) setError(err.message) })
      .finally(() => { if (mounted) setIsLoading(false) })

    return () => { mounted = false }
  }, [campaignId, token])

  useEffect(() => {
    if (!pageData?.survey_id) {
      return
    }

    let mounted = true
    setIsSurveyLoading(true)

    getAdminSurveyDetail(token, pageData.survey_id)
      .then((data) => { if (mounted) setSurveyData(data) })
      .catch(() => { if (mounted) setSurveyData(null) })
      .finally(() => { if (mounted) setIsSurveyLoading(false) })

    return () => { mounted = false }
  }, [pageData?.survey_id, token])

  const kpis = useMemo(() => {
    if (!pageData) return null
    return computeKpis(pageData, surveyData)
  }, [pageData, surveyData])

  const campaign = pageData?.campaign
  const hasData = kpis && kpis.submittedCount > 0

  return (
    <div className="admin-view">
      {/* Header */}
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">KPIs da Campanha</span>
          <h2>{campaign?.name ?? `Campanha #${campaignId}`}</h2>
          <p>
            {campaign
              ? `${campaign.code} · ${fmtDate(campaign.start_at)} até ${fmtDate(campaign.end_at)}`
              : 'Visão consolidada dos indicadores desta campanha.'}
          </p>
        </div>

        <div className="admin-header-actions">
          <Link className="secondary-link-button" to={`/admin/campaigns/${campaignId}/responses`}>
            Ver respostas individuais
          </Link>
          {pageData?.survey_id && (
            <Link className="secondary-link-button" to={`/admin/surveys/${pageData.survey_id}`}>
              ← Pesquisa
            </Link>
          )}
        </div>
      </div>

      {/* Error */}
      {error && <div className="form-error">{error}</div>}

      {/* Loading */}
      {isLoading && (
        <section className="admin-panel-card">
          <p style={{ color: 'var(--slate-400)' }}>Calculando indicadores...</p>
        </section>
      )}

      {/* Empty — sem dados ainda */}
      {!isLoading && !error && kpis && !hasData && (
        <>
          {/* Métricas de participação mesmo sem respostas submetidas */}
          <section className="dashboard-stats-grid">
            <MetricCard label="Público previsto" value={kpis.audienceCount} />
            <MetricCard label="Iniciaram" value={kpis.totalStarted} sub={`${kpis.draftCount} rascunho(s)`} />
            <MetricCard label="Finalizaram" value={kpis.submittedCount} color="#2563eb" />
            <MetricCard
              label="Taxa de adesão"
              value={fmtPct(kpis.adhesionRate)}
              color={kpis.adhesionRate >= 70 ? '#16a34a' : kpis.adhesionRate >= 40 ? '#d97706' : '#dc2626'}
            />
          </section>

          <section className="admin-panel-card">
            <div className="empty-state" style={{ minHeight: 200 }}>
              <strong>Nenhuma resposta finalizada ainda</strong>
              <span>Os indicadores de score, distribuição e eNPS aparecerão aqui conforme os colaboradores enviarem suas respostas.</span>
            </div>
          </section>
        </>
      )}

      {/* Dashboard completo */}
      {!isLoading && !error && hasData && (
        <>
          {/* ── Métricas de participação ── */}
          <section className="dashboard-stats-grid">
            <MetricCard
              label="Taxa de adesão"
              value={fmtPct(kpis.adhesionRate)}
              sub={`${kpis.submittedCount} de ${kpis.audienceCount}`}
              color={kpis.adhesionRate >= 70 ? '#16a34a' : kpis.adhesionRate >= 40 ? '#d97706' : '#dc2626'}
            />
            <MetricCard
              label="Taxa de conclusão"
              value={fmtPct(kpis.completionRate)}
              sub={`dos que iniciaram`}
              color={kpis.completionRate >= 85 ? '#16a34a' : '#d97706'}
            />
            <MetricCard
              label="Risco médio geral"
              value={kpis.avgScore != null ? fmtScore(kpis.avgScore) : '—'}
              sub={kpis.avgScoreReference != null ? `média ponderada pelo peso · máximo ${fmtScore(kpis.avgScoreReference)}` : 'classificação de risco'}
              color={
                kpis.avgScore == null ? undefined
                  : (kpis.avgScoreReference ? kpis.avgScore / kpis.avgScoreReference : 0) >= 0.8 ? '#16a34a'
                  : (kpis.avgScoreReference ? kpis.avgScore / kpis.avgScoreReference : 0) >= 0.6 ? '#d97706'
                  : '#dc2626'
              }
            />
            <MetricCard
              label="eNPS"
              value={kpis.enps != null ? (kpis.enps > 0 ? `+${kpis.enps}` : String(kpis.enps)) : '—'}
              sub={kpis.enps != null
                ? kpis.enps >= 75 ? 'Excelente' : kpis.enps >= 50 ? 'Ótimo' : kpis.enps >= 0 ? 'Regular' : 'Crítico'
                : 'sem pergunta NPS'}
              color={
                kpis.enps == null ? undefined
                  : kpis.enps >= 50 ? '#16a34a'
                  : kpis.enps >= 0 ? '#d97706'
                  : '#dc2626'
              }
            />
          </section>

          {/* ── Distribuição Likert + eNPS ── */}
          <section className="dashboard-detail-grid">
            {/* Distribuição de respostas por escala */}
            <article className="admin-panel-card">
              <div className="panel-header-row" style={{ marginBottom: 20 }}>
                <div>
                  <h3>Distribuição por escala</h3>
                  <p>{kpis.likertTotal} resposta(s) em perguntas de escala 1–5</p>
                </div>
              </div>
              <LikertBar dist={kpis.likertDist} total={kpis.likertTotal} />

              {/* % de favorabilidade */}
              {kpis.likertTotal > 0 && (
                <div style={{
                  marginTop: 20,
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: 'var(--slate-50)',
                  border: '1px solid var(--slate-200)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Favorabilidade
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--slate-500)', marginTop: 2 }}>
                      Respostas 4 ou 5 (Concordo / Concordo totalmente)
                    </div>
                  </div>
                  <div style={{
                    fontSize: '1.8rem', fontWeight: 800,
                    color: (() => {
                      const fav = ((kpis.likertDist[4] + kpis.likertDist[5]) / kpis.likertTotal) * 100
                      return fav >= 70 ? '#16a34a' : fav >= 50 ? '#d97706' : '#dc2626'
                    })(),
                    fontFamily: 'var(--font-display)',
                  }}>
                    {fmtPct(((kpis.likertDist[4] + kpis.likertDist[5]) / kpis.likertTotal) * 100)}
                  </div>
                </div>
              )}
            </article>

            {/* eNPS */}
            <article className="admin-panel-card">
              <div className="panel-header-row" style={{ marginBottom: 20 }}>
                <div>
                  <h3>eNPS — Employee Net Promoter Score</h3>
                  <p>
                    {kpis.enps != null
                      ? `Baseado em ${kpis.npsTotal} resposta(s) à pergunta de recomendação`
                      : 'Adicione uma pergunta SINGLE_CHOICE com "RECOMMEND" no código para calcular o eNPS'}
                  </p>
                </div>
              </div>
              {kpis.enps != null ? (
                <ENPSGauge
                  enps={kpis.enps}
                  promoters={kpis.promoters}
                  passives={kpis.passives}
                  detractors={kpis.detractors}
                  total={kpis.npsTotal}
                />
              ) : (
                <div className="empty-state" style={{ minHeight: 160 }}>
                  <strong>eNPS não disponível</strong>
                  <span>Crie uma pergunta de escala única com código contendo "RECOMMEND" ou "NPS" na sua pesquisa.</span>
                </div>
              )}
            </article>
          </section>

          {/* ── Risco por dimensão ── */}
          <article className="admin-panel-card">
            <div className="panel-header-row" style={{ marginBottom: 20 }}>
              <div>
                <h3>Risco por dimensão</h3>
                <p>0–33 alto risco · 34–66 risco moderado · 67–100 baixo risco</p>
              </div>
            </div>
            <DimensionRanking dimensions={kpis.dimensionScores} />
          </article>

          {/* ── Ranking por pergunta ── */}
          <article className="admin-panel-card">
            <div className="panel-header-row" style={{ marginBottom: 20 }}>
              <div>
                <h3>Risco por pergunta</h3>
                <p>0–33 alto risco · 34–66 risco moderado · 67–100 baixo risco</p>
              </div>
            </div>
            <QuestionRanking questions={kpis.questionScores} />
          </article>

          {/* ── Contexto da campanha ── */}
          <article className="admin-panel-card">
            <div className="panel-header-row" style={{ marginBottom: 16 }}>
              <div>
                <h3>Participação detalhada</h3>
              </div>
            </div>
            <div className="mini-metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="mini-metric-card">
                <strong>{kpis.audienceCount}</strong>
                <span>Público total</span>
              </div>
              <div className="mini-metric-card">
                <strong>{kpis.totalStarted}</strong>
                <span>Iniciaram</span>
              </div>
              <div className="mini-metric-card">
                <strong>{kpis.draftCount}</strong>
                <span>Rascunhos</span>
              </div>
              <div className="mini-metric-card">
                <strong>{kpis.submittedCount}</strong>
                <span>Finalizados</span>
              </div>
            </div>
          </article>
        </>
      )}
    </div>
  )
}