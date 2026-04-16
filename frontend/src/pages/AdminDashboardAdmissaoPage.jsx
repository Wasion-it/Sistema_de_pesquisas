import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { getAdminAdmissionRequests } from '../services/admin'

const DAY_MS = 24 * 60 * 60 * 1000

const POSITION_META = {
  PUBLIC_OPERATIONAL: {
    label: 'Operacional',
    targetDays: 15,
    accent: 'blue',
  },
  PUBLIC_ADMINISTRATIVE: {
    label: 'Administrativo',
    targetDays: 30,
    accent: 'amber',
  },
  PUBLIC_LEADERSHIP: {
    label: 'Liderança',
    targetDays: 45,
    accent: 'green',
  },
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatNumber(value, fractionDigits = 0) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

function formatDateTime(value) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getBaseDate(request) {
  return request.submitted_at ?? request.created_at
}

function getClosureDays(request) {
  if (request.status !== 'FINALIZED') {
    return null
  }

  const startDate = new Date(getBaseDate(request))
  const endDate = new Date(request.finalized_at ?? request.updated_at)
  const diff = (endDate.getTime() - startDate.getTime()) / DAY_MS

  return Number.isFinite(diff) && diff >= 0 ? diff : null
}

function computeOverallMetrics(requests) {
  const finalizedRequests = requests.filter((request) => request.status === 'FINALIZED')
  const finalizedWithDuration = finalizedRequests
    .map((request) => ({ request, closureDays: getClosureDays(request) }))
    .filter(({ closureDays }) => closureDays != null)

  const averageClosureDays = finalizedWithDuration.length > 0
    ? finalizedWithDuration.reduce((sum, item) => sum + item.closureDays, 0) / finalizedWithDuration.length
    : null

  const onTimeCount = finalizedWithDuration.filter(({ request, closureDays }) => {
    const targetDays = POSITION_META[request.posicao_vaga]?.targetDays ?? 0
    return closureDays <= targetDays
  }).length

  return {
    total: requests.length,
    finalizedCount: finalizedRequests.length,
    inProgressCount: requests.length - finalizedRequests.length,
    averageClosureDays,
    onTimeCount,
    overdueCount: Math.max(finalizedWithDuration.length - onTimeCount, 0),
  }
}

function computePositionMetrics(requests, positionKey) {
  const meta = POSITION_META[positionKey]
  const positionRequests = requests.filter((request) => request.posicao_vaga === positionKey)
  const finalizedWithDuration = positionRequests
    .filter((request) => request.status === 'FINALIZED')
    .map((request) => ({ request, closureDays: getClosureDays(request) }))
    .filter(({ closureDays }) => closureDays != null)

  const averageClosureDays = finalizedWithDuration.length > 0
    ? finalizedWithDuration.reduce((sum, item) => sum + item.closureDays, 0) / finalizedWithDuration.length
    : null

  const onTimeCount = finalizedWithDuration.filter(({ closureDays }) => closureDays <= meta.targetDays).length
  const finalizedCount = finalizedWithDuration.length
  const onTimeRate = finalizedCount > 0 ? (onTimeCount / finalizedCount) * 100 : null
  const variance = averageClosureDays != null ? averageClosureDays - meta.targetDays : null

  return {
    ...meta,
    totalCount: positionRequests.length,
    finalizedCount,
    averageClosureDays,
    onTimeCount,
    onTimeRate,
    variance,
  }
}

function SummaryCard({ label, value, sub }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <span style={{ fontSize: 12, color: 'var(--slate-400)', marginTop: -8 }}>{sub}</span> : null}
    </article>
  )
}

function PositionCard({ metric }) {
  const accent = metric.accent
  const averageLabel = metric.averageClosureDays == null
    ? 'Sem fechamentos'
    : `${formatNumber(metric.averageClosureDays, 1)} dias`
  const varianceLabel = metric.variance == null
    ? 'Aguardando encerramentos'
    : metric.variance <= 0
      ? `${formatNumber(Math.abs(metric.variance), 1)} dia(s) abaixo da meta`
      : `${formatNumber(metric.variance, 1)} dia(s) acima da meta`
  const rateLabel = metric.onTimeRate == null
    ? 'Sem base suficiente'
    : `${formatNumber(metric.onTimeRate, 0)}% no prazo`

  return (
    <article className={`admin-home-module module-${accent}`}>
      <div className="admin-home-module-icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6v6l4 2" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
      <div className="admin-home-module-body">
        <span className="admin-home-module-kicker">Meta de {metric.targetDays} dias</span>
        <h3>{metric.label}</h3>
        <p>
          Média atual: {averageLabel}. {varianceLabel}.
        </p>
      </div>
      <span className="admin-home-module-action">{rateLabel}</span>
    </article>
  )
}

export function AdminDashboardAdmissaoPage() {
  const { token, user } = useAuth()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setErrorMessage('')

    getAdminAdmissionRequests(token)
      .then((data) => {
        if (isMounted) {
          setRequests(data.items ?? [])
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

  const visibleRequests = useMemo(() => {
    if (user?.role !== 'RH_ANALISTA') {
      return requests
    }

    return requests.filter((request) => request.recruiter_user_id === user.id)
  }, [requests, user?.id, user?.role])

  const metrics = useMemo(() => computeOverallMetrics(visibleRequests), [visibleRequests])
  const positionMetrics = useMemo(
    () => Object.keys(POSITION_META).map((positionKey) => computePositionMetrics(visibleRequests, positionKey)),
    [visibleRequests],
  )

  const greeting = useMemo(() => getGreeting(), [])

  return (
    <div className="admin-view admin-home-view">
      <section className="admin-home-hero">
        <div>
          <span className="eyebrow">Dashboard / Admissão</span>
          <h2>{greeting}, {user?.full_name?.split(' ')[0] ?? 'Administrador'}</h2>
          <p>
            Indicadores de fechamento de vagas por perfil. O cálculo usa a data de submissão ou criação como início e a data de finalização gravada no banco como fechamento.
          </p>
        </div>
        <div className="admin-home-hero-badge">
          <span>Tempo de fechamento</span>
          <strong>KPIs de admissão</strong>
        </div>
      </section>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

      {isLoading ? (
        <section className="admin-panel-card">
          <p>Carregando indicadores de admissão...</p>
        </section>
      ) : (
        <>
          <section className="dashboard-stats-grid">
            <SummaryCard label="Solicitações" value={metrics.total} sub="Total no período disponível" />
            <SummaryCard label="Finalizadas" value={metrics.finalizedCount} sub="Vagas já concluídas" />
            <SummaryCard label="Em andamento" value={metrics.inProgressCount} sub="Aguardando fechamento" />
            <SummaryCard
              label="No prazo"
              value={metrics.finalizedCount > 0 ? `${formatNumber((metrics.onTimeCount / metrics.finalizedCount) * 100, 0)}%` : '—'}
              sub={`${metrics.onTimeCount} solicitações dentro da meta`}
            />
          </section>

          <section className="admin-home-modules" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {positionMetrics.map((metric) => (
              <PositionCard key={metric.label} metric={metric} />
            ))}
          </section>

          <section className="admin-panel-card">
            <div className="panel-header-row">
              <div>
                <h3>Leitura do KPI</h3>
                <p>Comparação entre a média real de fechamento e a meta por tipo de vaga.</p>
              </div>
              <Link className="back-link" to="/admin/admission-requests">
                Ver solicitações
              </Link>
            </div>

            <div className="mini-metrics-grid">
              <div className="mini-metric-card">
                <strong>{metrics.averageClosureDays == null ? '—' : `${formatNumber(metrics.averageClosureDays, 1)}d`}</strong>
                <span>Média geral</span>
              </div>
              <div className="mini-metric-card">
                <strong>{metrics.onTimeCount}</strong>
                <span>Fechadas no prazo</span>
              </div>
              <div className="mini-metric-card">
                <strong>{metrics.overdueCount}</strong>
                <span>Fechadas fora do prazo</span>
              </div>
              <div className="mini-metric-card">
                <strong>{formatDateTime(requests.find((request) => request.finalized_at)?.finalized_at)}</strong>
                <span>Última finalização registrada</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}