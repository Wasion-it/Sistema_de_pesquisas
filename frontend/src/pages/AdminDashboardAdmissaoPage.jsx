import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { getAdminAdmissionRequests } from '../services/admin'

const DAY_MS = 24 * 60 * 60 * 1000

const POSITION_META = {
  PUBLIC_OPERATIONAL: { label: 'Operacional', targetDays: 15, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', dot: '#60a5fa' },
  PUBLIC_ADMINISTRATIVE: { label: 'Administrativo', targetDays: 30, color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#fbbf24' },
  PUBLIC_LEADERSHIP: { label: 'Liderança', targetDays: 45, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#4ade80' },
}

const STATUS_META = {
  PENDING: { label: 'Pendente', color: '#b45309', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  UNDER_REVIEW: { label: 'Em análise', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
  APPROVED: { label: 'Aprovada', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  FINALIZED: { label: 'Finalizada', color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4', dot: '#14b8a6' },
  REJECTED: { label: 'Rejeitada', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
}

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function fmtNum(v, d = 0) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
}

function fmtDate(v) {
  if (!v) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v))
}

function getClosureDays(req) {
  if (req.status !== 'FINALIZED') return null
  const start = new Date(req.sla_started_at ?? req.submitted_at ?? req.created_at)
  const end = new Date(req.finalized_at ?? req.updated_at)
  const diff = (end - start) / DAY_MS
  return Number.isFinite(diff) && diff >= 0 ? diff : null
}

function computeMetrics(requests) {
  const finalized = requests.filter(r => r.status === 'FINALIZED')
  const withDays = finalized.map(r => ({ r, days: getClosureDays(r) })).filter(x => x.days != null)
  const avgDays = withDays.length > 0 ? withDays.reduce((s, x) => s + x.days, 0) / withDays.length : null
  const onTime = withDays.filter(({ r, days }) => days <= (POSITION_META[r.posicao_vaga]?.targetDays ?? 999)).length
  const byStatus = {}
  requests.forEach(r => { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1 })
  return {
    total: requests.length,
    finalized: finalized.length,
    inProgress: requests.length - finalized.length,
    avgDays,
    onTime,
    overdue: Math.max(withDays.length - onTime, 0),
    onTimeRate: withDays.length > 0 ? (onTime / withDays.length) * 100 : null,
    byStatus,
  }
}

function computePositionMetrics(requests) {
  return Object.entries(POSITION_META).map(([key, meta]) => {
    const group = requests.filter(r => r.posicao_vaga === key)
    const withDays = group.filter(r => r.status === 'FINALIZED').map(r => getClosureDays(r)).filter(d => d != null)
    const avg = withDays.length > 0 ? withDays.reduce((s, d) => s + d, 0) / withDays.length : null
    const onTime = withDays.filter(d => d <= meta.targetDays).length
    const rate = withDays.length > 0 ? (onTime / withDays.length) * 100 : null
    return { ...meta, key, total: group.length, finalized: withDays.length, avg, onTime, rate, variance: avg != null ? avg - meta.targetDays : null }
  })
}

function computeAnalystMetrics(requests) {
  const map = new Map()
  requests.forEach(r => {
    const id = r.recruiter_user_id ?? 'unassigned'
    if (!map.has(id)) map.set(id, { id, name: r.recruiter_user_name ?? 'Não atribuído', email: r.recruiter_user_email ?? '', total: 0, done: 0, open: 0 })
    const m = map.get(id)
    m.total++
    r.status === 'FINALIZED' ? m.done++ : m.open++
  })
  return [...map.values()].sort((a, b) => b.total - a.total)
}

function computeTrend(requests) {
  const months = {}
  requests.forEach(r => {
    const d = new Date(r.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months[key] = (months[key] ?? 0) + 1
  })
  return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
}

// ── Mini bar chart ──
function MiniBarChart({ data, color }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d[1]), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40 }}>
      {data.map(([label, val]) => {
        const h = Math.max(4, (val / max) * 40)
        return (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ width: '100%', height: h, borderRadius: 3, background: color ?? '#3b82f6', opacity: 0.85 }} />
          </div>
        )
      })}
    </div>
  )
}

// ── Radial progress ──
function RadialProgress({ pct, color, size = 64, stroke = 5 }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = ((pct ?? 0) / 100) * circ
  const c = color ?? '#3b82f6'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .6s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  )
}

// ── Status distribution bar ──
function StatusBar({ byStatus, total }) {
  const order = ['FINALIZED', 'APPROVED', 'UNDER_REVIEW', 'PENDING', 'REJECTED']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', gap: 1 }}>
        {order.map(s => {
          const count = byStatus[s] ?? 0
          if (!count) return null
          const pct = (count / total) * 100
          return <div key={s} title={`${STATUS_META[s]?.label}: ${count}`} style={{ width: `${pct}%`, background: STATUS_META[s]?.dot ?? '#94a3b8', minWidth: 4 }} />
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        {order.filter(s => byStatus[s]).map(s => {
          const m = STATUS_META[s]
          const count = byStatus[s]
          return (
            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: m?.color ?? '#64748b' }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: m?.dot, flexShrink: 0 }} />
              {m?.label} · {count}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── KPI card ──
function KpiCard({ label, value, sub, badge, trend, color, radial, radialColor, mini }) {
  const c = color ?? '#3b82f6'
  return (
    <article style={{
      borderRadius: 18, background: '#fff', border: '1px solid #e2e8f0',
      boxShadow: '0 1px 4px rgba(15,23,42,.04)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 0,
      transition: 'box-shadow 140ms, border-color 140ms',
    }}>
      <div style={{ height: 3, background: c }} />
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</span>
            <strong style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </strong>
            {sub && <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{sub}</span>}
          </div>
          {radial != null && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <RadialProgress pct={radial} color={radialColor ?? c} />
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: radialColor ?? c }}>
                {Math.round(radial)}%
              </span>
            </div>
          )}
        </div>
        {badge && (
          <span style={{ alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: `${c}18`, color: c }}>
            {badge}
          </span>
        )}
        {mini && <MiniBarChart data={mini} color={c} />}
      </div>
    </article>
  )
}

// ── Position card ──
function PositionCard({ metric }) {
  const isGood = metric.variance != null && metric.variance <= 0
  const isWarn = metric.variance != null && metric.variance > 0 && metric.variance <= 5
  const isBad = metric.variance != null && metric.variance > 5
  const varColor = isGood ? '#16a34a' : isWarn ? '#d97706' : isBad ? '#dc2626' : '#64748b'
  const ratePct = metric.rate ?? 0
  return (
    <article style={{
      borderRadius: 18, background: '#fff',
      border: `1.5px solid ${metric.border}`,
      padding: 0, overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(15,23,42,.05)',
    }}>
      <div style={{ height: 3, background: metric.color }} />
      <div style={{ padding: '20px 20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: metric.color, textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>
              Meta {metric.targetDays} dias
            </span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{metric.label}</h3>
          </div>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <RadialProgress pct={ratePct} color={metric.color} size={56} stroke={4} />
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: metric.color }}>
              {metric.finalized > 0 ? `${Math.round(ratePct)}%` : '—'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 3 }}>Média atual</span>
            <strong style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-.02em' }}>
              {metric.avg != null ? `${fmtNum(metric.avg, 1)}d` : '—'}
            </strong>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: metric.variance == null ? '#f8fafc' : isGood ? '#f0fdf4' : isBad ? '#fef2f2' : '#fffbeb', border: `1px solid ${metric.variance == null ? '#f1f5f9' : isGood ? '#bbf7d0' : isBad ? '#fecaca' : '#fde68a'}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 3 }}>Variação</span>
            <strong style={{ fontSize: '1.2rem', fontWeight: 800, color: varColor, letterSpacing: '-.02em' }}>
              {metric.variance == null ? '—' : metric.variance <= 0 ? `−${fmtNum(Math.abs(metric.variance), 1)}d` : `+${fmtNum(metric.variance, 1)}d`}
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, ratePct)}%`, height: '100%', background: metric.color, borderRadius: 999, transition: 'width .6s ease' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: metric.color, flexShrink: 0 }}>
            {metric.onTime}/{metric.finalized} no prazo
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: metric.bg, color: metric.color, border: `1px solid ${metric.border}` }}>
            {metric.total} solicitações
          </span>
          {metric.finalized > 0 && (
            <span style={{ padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
              {metric.finalized} fechadas
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

// ── Analyst row ──
function AnalystRow({ metric, index, max }) {
  const rate = metric.total > 0 ? (metric.done / metric.total) * 100 : 0
  const barW = max > 0 ? (metric.total / max) * 100 : 0
  const initials = metric.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const colors = ['linear-gradient(135deg,#3b82f6,#1d4ed8)', 'linear-gradient(135deg,#8b5cf6,#6d28d9)', 'linear-gradient(135deg,#10b981,#059669)', 'linear-gradient(135deg,#f59e0b,#d97706)', 'linear-gradient(135deg,#ef4444,#dc2626)']
  const grad = colors[index % colors.length]
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '42px 1fr auto', gap: 14, alignItems: 'center',
      padding: '14px 18px', borderBottom: '1px solid #f8fafc',
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
        {initials}
      </div>
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>{metric.name}</strong>
        {metric.email && <span style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 7 }}>{metric.email}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden', maxWidth: 160 }}>
            <div style={{ width: `${barW}%`, height: '100%', background: '#3b82f6', borderRadius: 999 }} />
          </div>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {metric.done} fin. · {metric.open} aberto
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <strong style={{ display: 'block', fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-.02em' }}>{metric.total}</strong>
        <span style={{ fontSize: 11, fontWeight: 700, color: rate >= 70 ? '#16a34a' : rate >= 40 ? '#d97706' : '#94a3b8' }}>
          {metric.total > 0 ? `${Math.round(rate)}% conc.` : '—'}
        </span>
      </div>
    </div>
  )
}

// ── Section heading ──
function SectionHeading({ title, sub, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-.01em' }}>{title}</h3>
        {sub && <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function AdminDashboardAdmissaoPage() {
  const { token, user } = useAuth()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    getAdminAdmissionRequests(token)
      .then(data => { if (mounted) setRequests(data.items ?? []) })
      .catch(err => { if (mounted) setErrorMessage(err.message) })
      .finally(() => { if (mounted) setIsLoading(false) })
    return () => { mounted = false }
  }, [token])

  const visible = useMemo(() => {
    if (user?.role === 'RH_ADMIN') return requests
    if (user?.role === 'RH_ANALISTA') return requests.filter(r => r.recruiter_user_id === user.id)
    return []
  }, [requests, user])

  const metrics = useMemo(() => computeMetrics(visible), [visible])
  const posMetrics = useMemo(() => computePositionMetrics(visible), [visible])
  const analystMetrics = useMemo(() => computeAnalystMetrics(visible), [visible])
  const trend = useMemo(() => computeTrend(visible), [visible])
  const greeting = useMemo(() => getGreeting(), [])
  const firstName = user?.full_name?.split(' ')[0] ?? 'Administrador'
  const maxAnalystTotal = analystMetrics.reduce((m, a) => Math.max(m, a.total), 0)

  const lastFinalized = useMemo(() => {
    return visible.filter(r => r.finalized_at).sort((a, b) => new Date(b.finalized_at) - new Date(a.finalized_at))[0]
  }, [visible])

  return (
    <div className="admin-view admin-home-view" style={{ gap: 28 }}>

      {/* Hero header */}
      <section style={{
        borderRadius: 22, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 65%, #1d4ed8 100%)',
        boxShadow: '0 8px 32px rgba(15,23,42,.18)',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,.22), transparent 68%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: 180, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,.14), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ padding: '30px 36px', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(148,163,184,.9)' }}>Dashboard</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(148,163,184,.5)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(148,163,184,.9)' }}>Admissão</span>
            </div>
            <h2 style={{ margin: '0 0 8px', color: '#fff', fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
              {greeting}, {firstName}
            </h2>
            <p style={{ margin: 0, color: 'rgba(203,213,225,.85)', fontSize: 14, maxWidth: '52ch', lineHeight: 1.7 }}>
              Indicadores de fechamento de vagas por perfil. SLA contado a partir da aprovação do gerente de RH.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(255,255,255,.09)', border: '1px solid rgba(255,255,255,.12)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(148,163,184,.8)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Taxa no prazo</span>
              <strong style={{ fontSize: '1.8rem', fontWeight: 900, color: metrics.onTimeRate != null ? (metrics.onTimeRate >= 70 ? '#4ade80' : metrics.onTimeRate >= 40 ? '#fbbf24' : '#f87171') : '#94a3b8', lineHeight: 1, letterSpacing: '-.03em' }}>
                {metrics.onTimeRate != null ? `${fmtNum(metrics.onTimeRate, 0)}%` : '—'}
              </strong>
              <span style={{ fontSize: 11, color: 'rgba(148,163,184,.7)' }}>{metrics.onTime} de {metrics.finalized} fechamentos</span>
            </div>
          </div>
        </div>
        {/* Bottom ticker */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '10px 36px', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: metrics.total },
            { label: 'Em andamento', value: metrics.inProgress },
            { label: 'Finalizadas', value: metrics.finalized },
            { label: 'Média geral', value: metrics.avgDays != null ? `${fmtNum(metrics.avgDays, 1)}d` : '—' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'rgba(148,163,184,.7)', fontWeight: 500 }}>{item.label}</span>
              <strong style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      {errorMessage && <div className="form-error">{errorMessage}</div>}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '60px 0' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #dbeafe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          <span style={{ fontSize: 14, color: '#64748b' }}>Carregando indicadores...</span>
        </div>
      ) : (
        <>
          {/* Status distribution */}
          <section style={{ borderRadius: 18, background: '#fff', border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,.04)' }}>
            <SectionHeading title="Distribuição por status" sub="Composição atual do portfólio de solicitações" />
            {metrics.total > 0
              ? <StatusBar byStatus={metrics.byStatus} total={metrics.total} />
              : <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>Nenhuma solicitação no período.</p>
            }
          </section>

          {/* KPI cards row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14 }}>
            <KpiCard
              label="Solicitações"
              value={metrics.total}
              sub={`${metrics.inProgress} em andamento`}
              color="linear-gradient(90deg,#64748b,#94a3b8)"
              mini={trend}
            />
            <KpiCard
              label="Finalizadas"
              value={metrics.finalized}
              sub={`${metrics.overdue} fora do prazo`}
              badge={metrics.finalized > 0 ? `${Math.round((metrics.finalized / metrics.total) * 100)}% do total` : undefined}
              color="#0f766e"
              radial={metrics.finalized > 0 ? (metrics.finalized / metrics.total) * 100 : 0}
              radialColor="#14b8a6"
            />
            <KpiCard
              label="Média de fechamento"
              value={metrics.avgDays != null ? `${fmtNum(metrics.avgDays, 1)}d` : '—'}
              sub="Dias desde aprovação do RH"
              badge={metrics.avgDays != null ? (metrics.avgDays <= 20 ? 'Dentro da meta' : metrics.avgDays <= 35 ? 'Atenção' : 'Acima da meta') : undefined}
              color={metrics.avgDays != null ? (metrics.avgDays <= 20 ? '#16a34a' : metrics.avgDays <= 35 ? '#d97706' : '#dc2626') : '#94a3b8'}
            />
            <KpiCard
              label="No prazo"
              value={metrics.onTime}
              sub={`${metrics.overdue} fora do prazo`}
              badge={metrics.onTimeRate != null ? `${fmtNum(metrics.onTimeRate, 0)}% de eficiência` : undefined}
              color={metrics.onTimeRate != null ? (metrics.onTimeRate >= 70 ? '#16a34a' : metrics.onTimeRate >= 40 ? '#d97706' : '#dc2626') : '#94a3b8'}
              radial={metrics.onTimeRate ?? 0}
              radialColor={metrics.onTimeRate != null ? (metrics.onTimeRate >= 70 ? '#16a34a' : metrics.onTimeRate >= 40 ? '#d97706' : '#dc2626') : '#94a3b8'}
            />
          </div>

          {/* Position KPIs */}
          <section>
            <SectionHeading
              title="SLA por perfil de vaga"
              sub="Meta de fechamento contada a partir da aprovação do gerente de RH"
              action={<Link className="back-link" to="/admin/admission-requests">Ver solicitações →</Link>}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 }}>
              {posMetrics.map(m => <PositionCard key={m.key} metric={m} />)}
            </div>
          </section>

          {/* Analysts */}
          <section style={{ borderRadius: 18, background: '#fff', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,.04)' }}>
            <div style={{ padding: '22px 24px 14px', borderBottom: '1px solid #f1f5f9' }}>
              <SectionHeading
                title="Analistas designados"
                sub="Ranking por volume de solicitações atribuídas"
                action={<span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>{analystMetrics.reduce((s, a) => s + a.total, 0)} no total</span>}
              />
            </div>
            {analystMetrics.length === 0
              ? <div style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Nenhuma solicitação atribuída ainda.</div>
              : analystMetrics.map((m, i) => <AnalystRow key={String(m.id)} metric={m} index={i} max={maxAnalystTotal} />)
            }
          </section>

          {/* Bottom readout */}
          <section style={{ borderRadius: 18, background: '#fff', border: '1px solid #e2e8f0', padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,.04)' }}>
            <SectionHeading title="Leitura do SLA" sub="Referência consolidada dos indicadores de prazo" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
              {[
                { label: 'Média geral', value: metrics.avgDays != null ? `${fmtNum(metrics.avgDays, 1)}d` : '—', sub: 'Todos os perfis' },
                { label: 'No prazo', value: metrics.onTime, sub: 'Fechamentos dentro da meta' },
                { label: 'Fora do prazo', value: metrics.overdue, sub: 'Acima da meta por perfil' },
                { label: 'Última finalização', value: lastFinalized ? fmtDate(lastFinalized.finalized_at).split(' ')[0] : '—', sub: lastFinalized?.cargo ?? 'Nenhuma ainda' },
              ].map(item => (
                <div key={item.label} style={{ padding: '14px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{item.label}</span>
                  <strong style={{ display: 'block', fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-.02em', marginBottom: 4 }}>{item.value}</strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{item.sub}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
