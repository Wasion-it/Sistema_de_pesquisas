import { useEffect, useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { getAdminCampaignResponses, getAdminSurveyDetail } from '../services/admin'

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtPct(value) {
  return `${Math.round(value)}%`
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
    ;(source?.questions ?? []).forEach((question) => {
      byId.set(question.id, question)
      if (question.code) byCode.set(String(question.code).toUpperCase(), question)
    })
  })
  return { byId, byCode }
}

function getDimensionMetaMap(pageData, surveyData) {
  const map = new Map()
  ;[pageData, surveyData].forEach((source) => {
    ;(source?.dimensions ?? []).forEach((dimension) => {
      map.set(dimension.id, dimension)
    })
  })
  return map
}

function resolveQuestionMeta(answer, questionMetaMaps) {
  return (
    questionMetaMaps.byId.get(answer.question_id) ??
    questionMetaMaps.byCode.get(String(answer.question_code ?? '').toUpperCase()) ??
    null
  )
}

function getEffectiveScaleScore(question, numericAnswer) {
  if (!question || numericAnswer == null) return null
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

  const adhesionRate = audience_count > 0 ? (submitted_responses / audience_count) * 100 : 0
  const completionRate = total_responses > 0 ? (submitted_responses / total_responses) * 100 : 0
  const abandonmentRate = total_responses > 0 ? (draft_responses / total_responses) * 100 : 0

  const allItems = submitted.flatMap((r) => r.answers)

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
    .filter((a) => a.effectiveScore != null)

  const totalScaleWeight = scaleItems.reduce((sum, item) => sum + item.scoreWeight, 0)
  const avgScore =
    totalScaleWeight > 0
      ? scaleItems.reduce((sum, item) => sum + item.weightedScore, 0) / totalScaleWeight
      : null
  const avgScoreReference =
    totalScaleWeight > 0
      ? scaleItems.reduce((sum, item) => sum + item.scaleMax * item.scoreWeight, 0) / totalScaleWeight
      : null

  // Favorabilidade geral (4 e 5)
  const likertDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  scaleItems.forEach((a) => {
    likertDist[a.effectiveScore] = (likertDist[a.effectiveScore] ?? 0) + 1
  })
  const likertTotal = scaleItems.length
  const favorabilityRate =
    likertTotal > 0 ? ((likertDist[4] + likertDist[5]) / likertTotal) * 100 : 0
  const criticalRate =
    likertTotal > 0 ? ((likertDist[1] + likertDist[2]) / likertTotal) * 100 : 0
  const neutralRate = likertTotal > 0 ? (likertDist[3] / likertTotal) * 100 : 0

  // eNPS
  const npsItems = allItems.filter((a) => {
    const code = (a.question_code ?? '').toUpperCase()
    return (
      a.question_type === 'SINGLE_CHOICE' &&
      (code.includes('RECOMMEND') || code.includes('NPS') || code.includes('INDICAR'))
    )
  })

  let enps = null
  let promoters = 0,
    passives = 0,
    detractors = 0
  if (npsItems.length > 0) {
    npsItems.forEach((a) => {
      const opt = (a.selected_option_label ?? '').toUpperCase()
      if (
        opt.includes('YES') ||
        opt.includes('SIM') ||
        opt.includes('TOTAL') ||
        opt.includes('CONCORDO')
      )
        promoters++
      else if (
        opt.includes('MAYBE') ||
        opt.includes('TALVEZ') ||
        opt.includes('NEUTRO') ||
        opt.includes('PARCIAL')
      )
        passives++
      else detractors++
    })
    const total = npsItems.length
    enps = Math.round(((promoters - detractors) / total) * 100)
  }

  // Question scores + variância
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
        dimensionId: resolveQuestionMeta(a, questionMetaMaps)?.dimension_id ?? null,
      }
    }
    questionMap[key].scores.push(a.effectiveScore)
    questionMap[key].weightedScores.push(a.weightedScore)
  })

  const questionScores = Object.values(questionMap)
    .map((q) => {
      const avg = q.scores.reduce((s, v) => s + v, 0) / q.scores.length
      const variance =
        q.scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / q.scores.length
      const normalizedAvg = (avg / q.scaleMax) * 100
      return {
        code: q.code,
        text: q.text,
        avg,
        normalizedAvg,
        variance,
        count: q.scores.length,
        scoreWeight: q.scoreWeight,
        isNegative: q.isNegative,
        maxScore: q.scoreWeight,
        scaleMax: q.scaleMax,
        dimensionId: q.dimensionId,
      }
    })
    .sort((a, b) => b.normalizedAvg - a.normalizedAvg)

  // Top strengths & risks
  const strengths = questionScores.filter((q) => q.normalizedAvg >= 70).slice(0, 3)
  const risks = [...questionScores].sort((a, b) => a.normalizedAvg - b.normalizedAvg).slice(0, 3)

  // Dimensions
  const dimensionMap = {}
  scaleItems.forEach((answer) => {
    const question = resolveQuestionMeta(answer, questionMetaMaps)
    const dimension =
      question?.dimension_id != null ? dimensionMetaMap.get(question.dimension_id) : null
    const key = dimension?.id ?? 'unassigned'
    const normalizedScore =
      question?.scale_max > 0 ? answer.effectiveScore / question.scale_max : null
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

    if (question) dimensionMap[key].questionIds.add(question.id)
  })

  const dimensionScores = Object.values(dimensionMap)
    .map((dimension) => ({
      code: dimension.code,
      name: dimension.name,
      avg: dimension.weightedNormalizedScores.reduce((sum, value) => sum + value, 0),
      maxScore: dimension.scoreWeightTotal,
      count: dimension.scores.length,
      questionCount: dimension.questionIds.size,
      ratio:
        dimension.scoreWeightTotal > 0
          ? dimension.weightedNormalizedScores.reduce((sum, value) => sum + value, 0) /
            dimension.scoreWeightTotal
          : 0,
    }))
    .sort((a, b) => b.ratio - a.ratio)

  // Score por departamento
  const deptMap = {}
  submitted.forEach((r) => {
    const dept = r.department_name ?? 'Não informado'
    if (!deptMap[dept]) deptMap[dept] = { scores: [], count: 0 }
    const deptScaleItems = r.answers
      .filter((a) => a.question_type === 'SCALE_1_5' && a.numeric_answer != null)
      .map((a) => {
        const question = resolveQuestionMeta(a, questionMetaMaps)
        return getEffectiveScaleScore(question, a.numeric_answer)
      })
      .filter((s) => s != null)
    deptScaleItems.forEach((s) => deptMap[dept].scores.push(s))
    deptMap[dept].count++
  })

  const departmentScores = Object.entries(deptMap)
    .map(([name, d]) => ({
      name,
      avg: d.scores.length > 0 ? d.scores.reduce((s, v) => s + v, 0) / d.scores.length : 0,
      count: d.count,
      scaleMax: 5,
    }))
    .sort((a, b) => b.avg - a.avg)

  return {
    adhesionRate,
    completionRate,
    abandonmentRate,
    avgScore,
    avgScoreReference,
    favorabilityRate,
    criticalRate,
    neutralRate,
    likertDist,
    likertTotal,
    enps,
    promoters,
    passives,
    detractors,
    npsTotal: npsItems.length,
    questionScores,
    strengths,
    risks,
    submittedCount: submitted_responses,
    audienceCount: audience_count,
    draftCount: draft_responses,
    totalStarted: total_responses,
    dimensionScores,
    departmentScores,
  }
}

// ─── Score health color ───────────────────────────────────────────────────

function healthColor(pct) {
  if (pct >= 75) return '#10b981'
  if (pct >= 55) return '#f59e0b'
  return '#ef4444'
}

function healthLabel(pct) {
  if (pct >= 75) return 'Saudável'
  if (pct >= 55) return 'Atenção'
  return 'Crítico'
}

// ─── Inline styles ────────────────────────────────────────────────────────

const S = {
  page: {
    display: 'grid',
    gap: 28,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    animation: 'kpiFadeIn .4s ease both',
  },
  // Header
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
    padding: '28px 32px',
    borderRadius: 20,
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(96,165,250,.25), transparent 70%)',
    pointerEvents: 'none',
  },
  headerEyebrow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: 'rgba(148,163,184,.9)',
    marginBottom: 8,
  },
  headerTitle: {
    margin: 0,
    fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '-.02em',
    lineHeight: 1.2,
  },
  headerSub: {
    margin: '6px 0 0',
    fontSize: 13,
    color: 'rgba(203,213,225,.85)',
  },
  headerActions: {
    display: 'flex',
    gap: 10,
    flexShrink: 0,
    zIndex: 1,
  },
  headerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,.18)',
    background: 'rgba(255,255,255,.1)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    backdropFilter: 'blur(8px)',
    transition: 'background .15s',
    cursor: 'pointer',
  },
  // Section label
  sectionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    color: '#64748b',
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
    background: '#e2e8f0',
  },
  // Stat grid
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
  },
  statCard: (color) => ({
    position: 'relative',
    padding: '22px 20px',
    borderRadius: 16,
    background: '#fff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 4px rgba(15,23,42,.05)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  }),
  statAccent: (color) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: color || 'linear-gradient(90deg, #3b82f6, #60a5fa)',
  }),
  statLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    color: '#94a3b8',
  },
  statValue: (color) => ({
    fontSize: '2rem',
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: '-.03em',
    color: color || '#0f172a',
    fontVariantNumeric: 'tabular-nums',
  }),
  statSub: {
    fontSize: 12,
    fontWeight: 500,
    color: '#94a3b8',
    marginTop: -6,
  },
  statBadge: (color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 9px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    background: color ? color + '18' : '#f1f5f9',
    color: color || '#64748b',
    alignSelf: 'flex-start',
  }),
  // Panel
  panel: {
    padding: '24px',
    borderRadius: 16,
    background: '#fff',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(15,23,42,.05)',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  panelTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  panelSub: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#64748b',
  },
  // Two col grid
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 1fr',
    gap: 18,
  },
  // Likert bar row
  likertRow: {
    display: 'grid',
    gridTemplateColumns: '12px 150px 1fr 60px',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  // Progress bar
  barTrack: (h) => ({
    height: h || 8,
    borderRadius: 999,
    background: '#f1f5f9',
    overflow: 'hidden',
  }),
  barFill: (pct, color) => ({
    height: '100%',
    width: `${Math.max(0, Math.min(100, pct))}%`,
    background: color,
    borderRadius: 999,
    transition: 'width .6s cubic-bezier(.4,0,.2,1)',
  }),
  // Question item
  questionItem: (highlight) => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '14px 16px',
    borderRadius: 12,
    background: highlight ? '#fffbeb' : '#f8fafc',
    border: `1px solid ${highlight ? '#fde68a' : '#e2e8f0'}`,
    marginBottom: 10,
  }),
  questionIndex: (color) => ({
    flexShrink: 0,
    width: 28,
    height: 28,
    borderRadius: 8,
    background: color + '18',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 800,
    color: color,
  }),
  // Dimension row
  dimRow: {
    display: 'grid',
    gap: 8,
    padding: '14px 16px',
    borderRadius: 12,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    marginBottom: 10,
  },
  dimRowHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  // eNPS gauge
  gaugeWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  gaugeScore: (color) => ({
    fontSize: '3.2rem',
    fontWeight: 900,
    color: color,
    lineHeight: 1,
    letterSpacing: '-.04em',
    fontVariantNumeric: 'tabular-nums',
  }),
  gaugeTrack: {
    position: 'relative',
    height: 12,
    borderRadius: 6,
    background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 45%, #10b981 100%)',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,.1)',
  },
  gaugeThumb: (pct, color) => ({
    position: 'absolute',
    top: '50%',
    left: `${pct}%`,
    transform: 'translate(-50%, -50%)',
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#fff',
    border: `3px solid ${color}`,
    boxShadow: '0 2px 8px rgba(0,0,0,.18)',
  }),
  npsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginTop: 6,
  },
  npsCard: (bg, color) => ({
    padding: '14px 16px',
    borderRadius: 12,
    background: bg,
    border: `1px solid ${color}22`,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  }),
  // Highlights
  highlightGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },
  strengthCard: {
    padding: '14px 16px',
    borderRadius: 12,
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  riskCard: {
    padding: '14px 16px',
    borderRadius: 12,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  // Dept row
  deptRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 100px',
    alignItems: 'center',
    gap: 14,
    padding: '12px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  // Participation ring
  ringWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  // Summary cards row (bottom)
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
  },
  summaryCard: {
    padding: '18px 20px',
    borderRadius: 14,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    alignItems: 'center',
    textAlign: 'center',
  },
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ text }) {
  return (
    <div style={S.sectionLabel}>
      <span style={S.sectionLabelText}>{text}</span>
      <div style={S.sectionLabelLine} />
    </div>
  )
}

function StatCard({ label, value, sub, badge, color, accent }) {
  const c = color || '#3b82f6'
  const accentStyle = accent || `linear-gradient(90deg, ${c}, ${c}88)`
  return (
    <div style={S.statCard(c)}>
      <div style={S.statAccent(accentStyle)} />
      <span style={S.statLabel}>{label}</span>
      <strong style={S.statValue(c)}>{value}</strong>
      {sub && <span style={S.statSub}>{sub}</span>}
      {badge && <span style={S.statBadge(c)}>{badge}</span>}
    </div>
  )
}

function LikertBar({ dist, total }) {
  const ROWS = [
    { v: 5, label: 'Concordo totalmente', color: '#10b981' },
    { v: 4, label: 'Concordo', color: '#34d399' },
    { v: 3, label: 'Neutro', color: '#f59e0b' },
    { v: 2, label: 'Discordo', color: '#f87171' },
    { v: 1, label: 'Discordo totalmente', color: '#ef4444' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ROWS.map(({ v, label, color }) => {
        const count = dist[v] ?? 0
        const pct = total > 0 ? (count / total) * 100 : 0
        return (
          <div key={v} style={S.likertRow}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{label}</span>
            <div style={S.barTrack(8)}>
              <div style={S.barFill(pct, color)} />
            </div>
            <span
              style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textAlign: 'right' }}
            >
              {count}
              <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>
                ({Math.round(pct)}%)
              </span>
            </span>
          </div>
        )
      })}

      {total > 0 && (
        <div
          style={{
            marginTop: 6,
            padding: '12px 16px',
            borderRadius: 10,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              Favorabilidade (4–5)
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              Respostas positivas
            </div>
          </div>
          <strong
            style={{
              fontSize: '1.8rem',
              fontWeight: 900,
              color: (() => {
                const fav = ((dist[4] + dist[5]) / total) * 100
                return fav >= 70 ? '#10b981' : fav >= 50 ? '#f59e0b' : '#ef4444'
              })(),
              letterSpacing: '-.03em',
            }}
          >
            {fmtPct(((dist[4] + dist[5]) / total) * 100)}
          </strong>
        </div>
      )}
    </div>
  )
}

function ENPSWidget({ enps, promoters, passives, detractors, total }) {
  const score = Math.max(-100, Math.min(100, enps))
  const pct = (score + 100) / 200
  const color = score >= 50 ? '#10b981' : score >= 0 ? '#f59e0b' : '#ef4444'
  const label = score >= 75 ? 'Excelente' : score >= 50 ? 'Ótimo' : score >= 0 ? 'Regular' : 'Crítico'

  return (
    <div style={S.gaugeWrap}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
        <span style={S.gaugeScore(color)}>
          {score > 0 ? '+' : ''}
          {score}
        </span>
        <span
          style={{
            padding: '5px 12px',
            borderRadius: 999,
            background: color + '15',
            color: color,
            fontSize: 13,
            fontWeight: 800,
            marginBottom: 6,
            border: `1px solid ${color}30`,
          }}
        >
          {label}
        </span>
      </div>

      <div style={S.gaugeTrack}>
        <div style={S.gaugeThumb(pct * 100, color)} />
      </div>

      <div style={S.npsGrid}>
        {[
          { label: 'Promotores', count: promoters, color: '#10b981', bg: '#f0fdf4' },
          { label: 'Neutros', count: passives, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Detratores', count: detractors, color: '#ef4444', bg: '#fef2f2' },
        ].map((item) => (
          <div key={item.label} style={S.npsCard(item.bg, item.color)}>
            <strong
              style={{
                fontSize: '1.6rem',
                fontWeight: 900,
                color: item.color,
                lineHeight: 1,
              }}
            >
              {item.count}
            </strong>
            <span style={{ fontSize: 11, fontWeight: 700, color: item.color }}>
              {item.label}
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {total > 0 ? Math.round((item.count / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuestionRow({ q, index, showRank }) {
  const pct = Math.min(100, q.normalizedAvg)
  const color = healthColor(pct)
  const isRisk = pct < 55

  return (
    <div style={S.questionItem(isRisk)}>
      <div style={S.questionIndex(color)}>{index + 1}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: '0 0 8px',
            fontSize: 13,
            fontWeight: 500,
            color: '#334155',
            lineHeight: 1.5,
          }}
        >
          {q.text}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              background: '#f1f5f9',
              color: '#64748b',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          >
            {q.code}
          </span>
          {q.scoreWeight > 1 && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                background: '#ede9fe',
                color: '#7c3aed',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Peso {q.scoreWeight}×
            </span>
          )}
          {q.isNegative && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                background: '#ffedd5',
                color: '#9a3412',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Invertida
            </span>
          )}
          {q.variance != null && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                background: q.variance > 1.5 ? '#fef3c7' : '#f0fdf4',
                color: q.variance > 1.5 ? '#92400e' : '#166534',
                fontSize: 11,
                fontWeight: 700,
              }}
              title="Variância das respostas — valores altos indicam opiniões polarizadas"
            >
              σ² {q.variance.toFixed(2)} {q.variance > 1.5 ? '⚠ Polarizada' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ ...S.barTrack(6), flex: 1 }}>
            <div style={S.barFill(pct, color)} />
          </div>
          <strong style={{ fontSize: 14, fontWeight: 800, color, minWidth: 38, textAlign: 'right' }}>
            {Math.round(pct)}%
          </strong>
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>
          {q.count} resposta{q.count !== 1 ? 's' : ''} · média {q.avg.toFixed(2)}/{q.scaleMax}
        </span>
      </div>
    </div>
  )
}

function DimensionRow({ dimension, index }) {
  const pct = Math.max(0, Math.min(100, dimension.ratio * 100))
  const color = healthColor(pct)

  return (
    <div style={S.dimRow}>
      <div style={S.dimRowHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `hsl(${(index * 51) % 360}, 55%, 92%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              color: `hsl(${(index * 51) % 360}, 45%, 35%)`,
            }}
          >
            {index + 1}
          </div>
          <div>
            <strong style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
              {dimension.name}
            </strong>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {dimension.questionCount} pergunta{dimension.questionCount !== 1 ? 's' : ''} ·{' '}
              {dimension.count} respostas
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: '-.02em' }}>
            {Math.round(pct)}%
          </strong>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color,
              background: color + '15',
              padding: '2px 8px',
              borderRadius: 999,
              marginTop: 4,
              display: 'inline-block',
            }}
          >
            {healthLabel(pct)}
          </div>
        </div>
      </div>
      <div style={S.barTrack(8)}>
        <div style={S.barFill(pct, color)} />
      </div>
    </div>
  )
}

function HighlightSection({ strengths, risks }) {
  if (!strengths.length && !risks.length) return null

  return (
    <div style={S.highlightGrid}>
      <div style={S.panel}>
        <div style={S.panelHeader}>
          <div>
            <h3 style={{ ...S.panelTitle, color: '#166534' }}>
              <span style={{ marginRight: 6 }}>✦</span>Pontos fortes
            </h3>
            <p style={S.panelSub}>Perguntas com maior score (≥70%)</p>
          </div>
        </div>
        {strengths.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Nenhum ponto forte identificado ainda.</p>
        ) : (
          strengths.map((q, i) => (
            <div key={q.code} style={{ ...S.strengthCard, marginBottom: i < strengths.length - 1 ? 10 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#166534', flex: 1 }}>
                  {q.text}
                </span>
                <strong style={{ fontSize: 16, fontWeight: 900, color: '#10b981', marginLeft: 12, flexShrink: 0 }}>
                  {Math.round(q.normalizedAvg)}%
                </strong>
              </div>
              <span style={{ fontSize: 11, color: '#4ade80', fontFamily: 'monospace' }}>
                {q.code}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={S.panel}>
        <div style={S.panelHeader}>
          <div>
            <h3 style={{ ...S.panelTitle, color: '#991b1b' }}>
              <span style={{ marginRight: 6 }}>⚠</span>Pontos críticos
            </h3>
            <p style={S.panelSub}>Perguntas com menor score — priorize ação</p>
          </div>
        </div>
        {risks.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Sem riscos identificados.</p>
        ) : (
          risks.map((q, i) => (
            <div key={q.code} style={{ ...S.riskCard, marginBottom: i < risks.length - 1 ? 10 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', flex: 1 }}>
                  {q.text}
                </span>
                <strong style={{ fontSize: 16, fontWeight: 900, color: '#ef4444', marginLeft: 12, flexShrink: 0 }}>
                  {Math.round(q.normalizedAvg)}%
                </strong>
              </div>
              <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'monospace' }}>
                {q.code}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function DepartmentSection({ departmentScores }) {
  if (!departmentScores.length) return null

  const max = Math.max(...departmentScores.map((d) => d.avg))

  return (
    <div>
      {departmentScores.map((dept, i) => {
        const pct = dept.avg > 0 ? (dept.avg / (dept.scaleMax || 5)) * 100 : 0
        const color = healthColor(pct)
        const relPct = max > 0 ? (dept.avg / max) * 100 : 0

        return (
          <div key={dept.name} style={S.deptRow}>
            <div>
              <strong style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                {dept.name}
              </strong>
              <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>
                {dept.count} respondente{dept.count !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ ...S.barTrack(6) }}>
              <div style={S.barFill(relPct, color)} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong style={{ fontSize: 14, fontWeight: 700, color }}>{dept.avg.toFixed(2)}</strong>
              <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>/ 5</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ParticipationRing({ submitted, total }) {
  const pct = total > 0 ? submitted / total : 0
  const r = 42
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  const color = pct >= 0.7 ? '#10b981' : pct >= 0.4 ? '#f59e0b' : '#ef4444'

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="7" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="46"
        textAnchor="middle"
        fontSize="16"
        fontWeight="900"
        fill={color}
        fontFamily="DM Sans, sans-serif"
      >
        {Math.round(pct * 100)}%
      </text>
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fontSize="9"
        fontWeight="600"
        fill="#94a3b8"
        fontFamily="DM Sans, sans-serif"
      >
        adesão
      </text>
    </svg>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function AdminCampaignKpisPage() {
  const { campaignId } = useParams()
  const { token } = useAuth()

  const [pageData, setPageData] = useState(null)
  const [surveyData, setSurveyData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
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
    if (!pageData?.survey_id) return
    let mounted = true
    getAdminSurveyDetail(token, pageData.survey_id)
      .then((data) => { if (mounted) setSurveyData(data) })
      .catch(() => { if (mounted) setSurveyData(null) })
    return () => { mounted = false }
  }, [pageData?.survey_id, token])

  const kpis = useMemo(() => {
    if (!pageData) return null
    return computeKpis(pageData, surveyData)
  }, [pageData, surveyData])

  const campaign = pageData?.campaign
  const hasData = kpis && kpis.submittedCount > 0

  return (
    <>
      <style>{`
        @keyframes kpiFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barSlide {
          from { width: 0; }
        }
      `}</style>

      <div style={S.page}>
        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.headerGlow} />
          <div style={{ zIndex: 1 }}>
            <div style={S.headerEyebrow}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13l4-4 4 4 6-6 4 4" />
              </svg>
              KPIs da Campanha
            </div>
            <h2 style={S.headerTitle}>
              {campaign?.name ?? `Campanha #${campaignId}`}
            </h2>
            <p style={S.headerSub}>
              {campaign
                ? `${campaign.code} · ${fmtDate(campaign.start_at)} → ${fmtDate(campaign.end_at)}`
                : 'Indicadores consolidados desta campanha'}
            </p>
          </div>
          <div style={S.headerActions}>
            <Link
              to={`/admin/campaigns/${campaignId}/responses`}
              style={S.headerBtn}
            >
              Respostas individuais
            </Link>
            {pageData?.survey_id && (
              <Link
                to={`/admin/surveys/${pageData.survey_id}`}
                style={S.headerBtn}
              >
                ← Pesquisa
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div style={{ padding: '14px 18px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 14 }}>
            {error}
          </div>
        )}

        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '60px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #dbeafe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <span style={{ color: '#64748b', fontSize: 14 }}>Calculando indicadores...</span>
          </div>
        )}

        {!isLoading && !error && kpis && (
          <>
            {/* ── Participação ── */}
            <SectionLabel text="Participação" />

            <div style={S.statGrid}>
              <StatCard
                label="Taxa de adesão"
                value={fmtPct(kpis.adhesionRate)}
                sub={`${kpis.submittedCount} de ${kpis.audienceCount} esperados`}
                badge={kpis.adhesionRate >= 70 ? 'Meta atingida' : kpis.adhesionRate >= 40 ? 'Abaixo da meta' : 'Crítica'}
                color={healthColor(kpis.adhesionRate)}
                accent={`linear-gradient(90deg, ${healthColor(kpis.adhesionRate)}, ${healthColor(kpis.adhesionRate)}88)`}
              />
              <StatCard
                label="Taxa de conclusão"
                value={fmtPct(kpis.completionRate)}
                sub="Dos que iniciaram a pesquisa"
                badge={kpis.completionRate >= 85 ? 'Excelente' : 'Regular'}
                color={kpis.completionRate >= 85 ? '#10b981' : '#f59e0b'}
              />
              <StatCard
                label="Taxa de abandono"
                value={fmtPct(kpis.abandonmentRate)}
                sub={`${kpis.draftCount} rascunhos não enviados`}
                badge={kpis.abandonmentRate < 15 ? 'Normal' : 'Atenção'}
                color={kpis.abandonmentRate < 15 ? '#10b981' : '#ef4444'}
                accent={kpis.abandonmentRate < 15 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)'}
              />
              <StatCard
                label="Respostas finalizadas"
                value={kpis.submittedCount}
                sub={`Total iniciado: ${kpis.totalStarted}`}
                color="#6366f1"
                accent="linear-gradient(90deg, #6366f1, #818cf8)"
              />
            </div>

            {hasData && (
              <>
                {/* ── Scores gerais ── */}
                <SectionLabel text="Índices de satisfação" />

                <div style={S.statGrid}>
                  <StatCard
                    label="Score médio geral"
                    value={kpis.avgScore != null ? fmtScore(kpis.avgScore) : '—'}
                    sub={kpis.avgScoreReference ? `Máx. ${fmtScore(kpis.avgScoreReference)} · ponderado` : ''}
                    badge={kpis.avgScore != null && kpis.avgScoreReference ? healthLabel((kpis.avgScore / kpis.avgScoreReference) * 100) : undefined}
                    color={kpis.avgScore != null && kpis.avgScoreReference ? healthColor((kpis.avgScore / kpis.avgScoreReference) * 100) : '#94a3b8'}
                  />
                  <StatCard
                    label="Favorabilidade"
                    value={fmtPct(kpis.favorabilityRate)}
                    sub="Respostas 4 ou 5 (positivas)"
                    badge={kpis.favorabilityRate >= 70 ? 'Alta' : kpis.favorabilityRate >= 50 ? 'Média' : 'Baixa'}
                    color={healthColor(kpis.favorabilityRate)}
                    accent={`linear-gradient(90deg, ${healthColor(kpis.favorabilityRate)}, ${healthColor(kpis.favorabilityRate)}77)`}
                  />
                  <StatCard
                    label="Respostas críticas"
                    value={fmtPct(kpis.criticalRate)}
                    sub="Respostas 1 ou 2 (negativas)"
                    badge={kpis.criticalRate < 15 ? 'Baixo risco' : kpis.criticalRate < 30 ? 'Moderado' : 'Alto risco'}
                    color={kpis.criticalRate < 15 ? '#10b981' : kpis.criticalRate < 30 ? '#f59e0b' : '#ef4444'}
                    accent={`linear-gradient(90deg, ${kpis.criticalRate < 15 ? '#10b981' : kpis.criticalRate < 30 ? '#f59e0b' : '#ef4444'}, transparent)`}
                  />
                  <StatCard
                    label="eNPS"
                    value={kpis.enps != null ? `${kpis.enps > 0 ? '+' : ''}${kpis.enps}` : '—'}
                    sub={kpis.enps != null ? `${kpis.promoters} promotores · ${kpis.detractors} detratores` : 'Sem pergunta NPS'}
                    badge={kpis.enps != null ? (kpis.enps >= 50 ? 'Excelente' : kpis.enps >= 0 ? 'Regular' : 'Crítico') : undefined}
                    color={kpis.enps != null ? (kpis.enps >= 50 ? '#10b981' : kpis.enps >= 0 ? '#f59e0b' : '#ef4444') : '#94a3b8'}
                  />
                </div>

                {/* ── Distribuição + eNPS ── */}
                <div style={S.twoCol}>
                  <div style={S.panel}>
                    <div style={S.panelHeader}>
                      <div>
                        <h3 style={S.panelTitle}>Distribuição por escala</h3>
                        <p style={S.panelSub}>
                          {kpis.likertTotal} respostas em perguntas de escala 1–5
                        </p>
                      </div>
                    </div>
                    <LikertBar dist={kpis.likertDist} total={kpis.likertTotal} />
                  </div>

                  <div style={S.panel}>
                    <div style={S.panelHeader}>
                      <div>
                        <h3 style={S.panelTitle}>eNPS — Employee Net Promoter Score</h3>
                        <p style={S.panelSub}>
                          {kpis.enps != null
                            ? `Baseado em ${kpis.npsTotal} resposta${kpis.npsTotal !== 1 ? 's' : ''}`
                            : 'Adicione pergunta RECOMMEND para calcular'}
                        </p>
                      </div>
                    </div>
                    {kpis.enps != null ? (
                      <ENPSWidget
                        enps={kpis.enps}
                        promoters={kpis.promoters}
                        passives={kpis.passives}
                        detractors={kpis.detractors}
                        total={kpis.npsTotal}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>—</div>
                        <p style={{ fontSize: 13, margin: 0 }}>
                          Inclua uma pergunta SINGLE_CHOICE com código "RECOMMEND" para calcular o eNPS.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Pontos fortes e críticos ── */}
                <SectionLabel text="Destaques" />
                <HighlightSection strengths={kpis.strengths} risks={kpis.risks} />

                {/* ── Dimensões ── */}
                {kpis.dimensionScores.length > 0 && (
                  <>
                    <SectionLabel text="Análise por dimensão" />
                    <div style={S.panel}>
                      <div style={S.panelHeader}>
                        <div>
                          <h3 style={S.panelTitle}>Score por dimensão</h3>
                          <p style={S.panelSub}>
                            Consolida respostas de escala por tema da pesquisa
                          </p>
                        </div>
                      </div>
                      {kpis.dimensionScores.map((dim, i) => (
                        <DimensionRow key={dim.code} dimension={dim} index={i} />
                      ))}
                    </div>
                  </>
                )}

                {/* ── Score por pergunta ── */}
                <SectionLabel text="Score por pergunta" />
                <div style={S.panel}>
                  <div style={S.panelHeader}>
                    <div>
                      <h3 style={S.panelTitle}>Ranking de perguntas</h3>
                      <p style={S.panelSub}>
                        Ordenado por score normalizado · variância alta (σ²&gt;1.5) indica polarização de opiniões
                      </p>
                    </div>
                  </div>
                  {kpis.questionScores.map((q, i) => (
                    <QuestionRow key={q.code} q={q} index={i} />
                  ))}
                </div>

                {/* ── Score por departamento ── */}
                {kpis.departmentScores.length > 0 && (
                  <>
                    <SectionLabel text="Segmentação por departamento" />
                    <div style={S.panel}>
                      <div style={S.panelHeader}>
                        <div>
                          <h3 style={S.panelTitle}>Score médio por departamento</h3>
                          <p style={S.panelSub}>
                            Média das respostas de escala agrupadas por departamento informado
                          </p>
                        </div>
                      </div>
                      <DepartmentSection departmentScores={kpis.departmentScores} />
                    </div>
                  </>
                )}

                {/* ── Resumo de participação ── */}
                <SectionLabel text="Resumo executivo" />
                <div style={S.summaryRow}>
                  <div style={{ ...S.panel, display: 'flex', alignItems: 'center', gap: 20 }}>
                    <ParticipationRing submitted={kpis.submittedCount} total={kpis.audienceCount} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>
                        Adesão
                      </div>
                      <strong style={{ fontSize: 24, fontWeight: 900, color: healthColor(kpis.adhesionRate), letterSpacing: '-.02em' }}>
                        {kpis.submittedCount}
                      </strong>
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>/{kpis.audienceCount}</span>
                    </div>
                  </div>
                  {[
                    { label: 'Perguntas na versão', value: pageData.total_questions ?? '—' },
                    { label: 'Dimensões analisadas', value: kpis.dimensionScores.length || '—' },
                    { label: 'Depts. respondentes', value: kpis.departmentScores.length || '—' },
                  ].map((item) => (
                    <div key={item.label} style={S.summaryCard}>
                      <strong style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-.03em' }}>
                        {item.value}
                      </strong>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8' }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!hasData && (
              <div style={{ ...S.panel, textAlign: 'center', padding: '56px 32px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
                <strong style={{ fontSize: 16, color: '#334155', display: 'block', marginBottom: 8 }}>
                  Nenhuma resposta finalizada ainda
                </strong>
                <p style={{ fontSize: 14, color: '#94a3b8', maxWidth: 360, margin: '0 auto' }}>
                  Os indicadores de score, distribuição e eNPS aparecerão aqui conforme os colaboradores enviarem suas respostas.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}