import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { AdmissionChecklistModal } from './AdmissionChecklistModal'
import { AdmissionHireModal } from './AdmissionHireModal'
import { ApprovalStatusModal } from './ApprovalStatusModal'
import { DismissalChecklistModal } from './DismissalChecklistModal'
import { RequestDetailsModal } from './RequestDetailsModal'
import {
  finalizeAdminAdmissionRequest,
  getAdminAdmissionChecklist,
  getAdminAdmissionRequests,
  getAdminDismissalChecklist,
  getAdminDismissalRequests,
  rejectAdminDismissalRequest,
} from '../services/admin'

const ADMISSION_STATUS_META = {
  PENDING:   { label: 'Pendente',   color: '#b45309', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  APPROVED:  { label: 'Aprovada',   color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  FINALIZED: { label: 'Finalizada', color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4', dot: '#14b8a6' },
  REJECTED:  { label: 'Rejeitada',  color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
}

const STATUS_META = {
  PENDING:      { label: 'Pendente',    color: '#b45309', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
  UNDER_REVIEW: { label: 'Em análise',  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
  APPROVED:     { label: 'Aprovada',    color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  FINALIZED:    { label: 'Finalizada',  color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4', dot: '#14b8a6' },
  REJECTED:     { label: 'Rejeitada',   color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  CANCELED:     { label: 'Cancelada',   color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8' },
}

const ADMISSION_STATUS_FILTERS = [
  { value: 'all', label: 'Todos os status' },
  ...Object.entries(ADMISSION_STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
]

const REQUEST_TYPE_LABELS = {
  GROWTH:      'Aumento de quadro',
  REPLACEMENT: 'Substituição',
}

const RECRUITMENT_SCOPE_LABELS = {
  INTERNAL: 'Interno',
  EXTERNAL: 'Externo',
  MIXED:    'Misto',
}

const CONTRACT_REGIME_LABELS = {
  TEMPORARY:  'Temporário',
  EFFECTIVE:  'Efetivo',
  INTERN:     'Estagiário',
  APPRENTICE: 'Aprendiz',
  CLT:        'CLT',
  PJ:         'PJ',
}

const DISMISSAL_TYPE_LABELS = {
  JUST_CAUSE:         'Justa causa',
  RESIGNATION:        'Pedido de demissão',
  WITHOUT_JUST_CAUSE: 'Dispensa sem justa causa',
  TERM_CONTRACT:      'Término de contrato',
  CONSENSUAL:         'Demissão consensual',
}

const REQUEST_TAB_PATHS = {
  admission: '/admin/admission-requests',
  dismissal: '/admin/dismissal-requests',
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function formatDateShort(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

function formatCurrency(value, currency = 'BRL') {
  if (value === null || value === undefined || value === '') return 'Ainda não informado'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(Number(value))
}

function getSummary(requests) {
  return {
    total:       requests.length,
    pending:     requests.filter((r) => r.status === 'PENDING').length,
    underReview: requests.filter((r) => r.status === 'UNDER_REVIEW').length,
    approved:    requests.filter((r) => r.status === 'APPROVED').length,
    finalized:   requests.filter((r) => r.status === 'FINALIZED').length,
    rejected:    requests.filter((r) => r.status === 'REJECTED').length,
  }
}

function getTabFromPathname(pathname) {
  return pathname.includes('dismissal-requests') ? 'dismissal' : 'admission'
}

function StatusPill({ status, meta }) {
  const m = meta ?? ADMISSION_STATUS_META[status] ?? ADMISSION_STATUS_META.PENDING
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: m.bg, border: `1px solid ${m.border}`,
      color: m.color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  )
}

function HireProgressBar({ hired, total }) {
  const pct = total > 0 ? Math.min(100, (hired / total) * 100) : 0
  const color = pct === 100 ? '#10b981' : pct > 0 ? '#3b82f6' : '#e2e8f0'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#10b981' : '#334155' }}>
          {hired} / {total}
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 999,
          background: pct === 100
            ? 'linear-gradient(90deg, #10b981, #34d399)'
            : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
          transition: 'width .5s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
    </div>
  )
}

function AdmissionCard({ item, actions, user }) {
  const statusMeta = ADMISSION_STATUS_META[item.status] ?? ADMISSION_STATUS_META.PENDING
  const hiredCount = item.hired_employee_count ?? 0
  const quantityPeople = item.quantity_people ?? 0
  const salaryLabel = formatCurrency(item.vacancy_salary, item.vacancy_salary_currency ?? 'BRL')
  const isFinalized = item.status === 'FINALIZED'
  const canFinalizeAdmission = item.status === 'APPROVED' && quantityPeople > 0 && hiredCount >= quantityPeople
  const canRegisterHire = item.status === 'APPROVED'
  const isApproved = item.status === 'APPROVED'

  return (
    <article style={{
      borderRadius: 16,
      background: '#fff',
      border: `1.5px solid ${isApproved ? '#bfdbfe' : '#e2e8f0'}`,
      boxShadow: isApproved ? '0 4px 20px rgba(37,99,235,.07)' : '0 1px 4px rgba(15,23,42,.04)',
      overflow: 'hidden',
      transition: 'box-shadow 160ms ease, border-color 160ms ease',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        height: 3,
        background: statusMeta.dot,
      }} />

      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <StatusPill status={item.status} meta={statusMeta} />
              <span style={{
                padding: '3px 8px', borderRadius: 5,
                background: '#f1f5f9', color: '#64748b',
                fontSize: 11, fontWeight: 600,
              }}>
                {REQUEST_TYPE_LABELS[item.request_type] ?? item.request_type}
              </span>
              <span style={{
                padding: '3px 8px', borderRadius: 5,
                background: '#ede9fe', color: '#5b21b6',
                fontSize: 11, fontWeight: 600,
              }}>
                {CONTRACT_REGIME_LABELS[item.contract_regime] ?? item.contract_regime}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
              {item.cargo}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
              {item.setor} · {item.turno} · {RECRUITMENT_SCOPE_LABELS[item.recruitment_scope] ?? item.recruitment_scope}
            </p>
          </div>

          <div style={{
            flexShrink: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
          }}>
            <div style={{
              padding: '8px 14px', borderRadius: 10,
              background: '#f8fafc', border: '1px solid #e2e8f0',
              textAlign: 'center', minWidth: 60,
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                {quantityPeople}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>
                vaga{quantityPeople !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(160px, .8fr)', gap: 10 }}>
          <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
              Contratações
            </div>
            <HireProgressBar hired={hiredCount} total={quantityPeople} />
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: item.vacancy_salary ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${item.vacancy_salary ? '#bbf7d0' : '#f1f5f9'}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: item.vacancy_salary ? '#15803d' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>
              Salário
            </div>
            <strong style={{
              fontSize: 15,
              fontWeight: 800,
              color: item.vacancy_salary ? '#166534' : '#64748b',
              lineHeight: 1.2,
              overflowWrap: 'anywhere',
            }}>
              {salaryLabel}
            </strong>
            <span style={{ marginTop: 3, fontSize: 11, color: item.vacancy_salary ? '#16a34a' : '#94a3b8' }}>
              Gerente de RH
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {(item.created_by_user_name ?? '?').split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{item.created_by_user_name ?? 'Desconhecido'}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatDateShort(item.created_at)}</div>
            </div>
          </div>

          {item.finalized_at && (
            <div style={{
              marginLeft: 'auto', fontSize: 11, color: '#94a3b8',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Finalizada {formatDateShort(item.finalized_at)}
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          <button
            onClick={actions.onViewApprovalStatus}
            style={btnStyle('ghost')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Aprovações
          </button>
          <button
            onClick={actions.onViewDetails}
            style={btnStyle('ghost')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Detalhes
          </button>
          {actions.onViewChecklist && (
            <button onClick={actions.onViewChecklist} style={btnStyle('ghost')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              Checklist
            </button>
          )}

          {canFinalizeAdmission && !isFinalized && (
            <button onClick={actions.onFinalizeAdmission} style={{ ...btnStyle('success'), marginLeft: 'auto' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Finalizar vaga
            </button>
          )}

          <button
            onClick={actions.onRegisterHire}
            disabled={!canRegisterHire}
            title={!canRegisterHire ? 'Aguardando aprovação' : undefined}
            style={{
              ...btnStyle(canRegisterHire ? 'primary' : 'disabled'),
              ...(canFinalizeAdmission ? {} : { marginLeft: 'auto' }),
            }}
          >
            {isFinalized ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Vaga finalizada
              </>
            ) : canRegisterHire ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  <path d="M16 11l2 2 4-4"/>
                </svg>
                Cadastrar candidatos
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Aguardando aprovação
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}

function DismissalCard({ item, actions, user }) {
  const statusMeta = STATUS_META[item.status] ?? STATUS_META.PENDING
  const canRejectDismissal = actions.canRejectDismissal && item.status === 'APPROVED'

  return (
    <article style={{
      borderRadius: 16,
      background: '#fff',
      border: '1.5px solid #e2e8f0',
      boxShadow: '0 1px 4px rgba(15,23,42,.04)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ height: 3, background: statusMeta.dot }} />

      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <StatusPill status={item.status} meta={statusMeta} />
              <span style={{
                padding: '3px 8px', borderRadius: 5,
                background: '#fef3c7', color: '#92400e',
                fontSize: 11, fontWeight: 600,
              }}>
                {DISMISSAL_TYPE_LABELS[item.dismissal_type] ?? item.dismissal_type}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
              {item.employee_name}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
              {item.cargo} · {item.departamento}
            </p>
          </div>
          <div style={{
            flexShrink: 0, padding: '8px 12px', borderRadius: 10,
            background: item.has_replacement ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${item.has_replacement ? '#bbf7d0' : '#e2e8f0'}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: item.has_replacement ? '#166534' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Substituição
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: item.has_replacement ? '#15803d' : '#64748b', marginTop: 2 }}>
              {item.has_replacement ? 'Sim' : 'Não'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {(item.created_by_user_name ?? '?').split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{item.created_by_user_name ?? 'Desconhecido'}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.created_by_user_email}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
            {formatDateShort(item.created_at)}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          <button onClick={actions.onViewApprovalStatus} style={btnStyle('ghost')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Aprovações
          </button>
          <button onClick={actions.onViewChecklist} style={btnStyle('ghost')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Checklist
          </button>
          <button onClick={actions.onViewDetails} style={btnStyle('ghost')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Detalhes
          </button>
          {canRejectDismissal && (
            <button onClick={actions.onRejectDismissal} style={{ ...btnStyle('danger'), marginLeft: 'auto' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Recusar demissão
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function btnStyle(variant) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 13px', borderRadius: 8,
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer', transition: 'all 140ms ease',
    whiteSpace: 'nowrap', border: '1.5px solid',
  }
  const variants = {
    ghost:    { ...base, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569' },
    primary:  { ...base, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8' },
    success:  { ...base, border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#166534' },
    danger:   { ...base, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#b91c1c' },
    disabled: { ...base, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed', opacity: .7 },
  }
  return variants[variant] ?? variants.ghost
}

function SummaryKpiCard({ label, value, accent }) {
  return (
    <div style={{
      padding: '16px 18px', borderRadius: 14,
      background: '#fff', border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(15,23,42,.04)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: accent ?? '#3b82f6',
      }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-.02em' }}>
        {value}
      </div>
    </div>
  )
}

const REQUEST_TABS_CONFIG = {
  admission: {
    label: 'Admissão',
    title: 'Solicitações de admissão',
    description: 'Controle o fluxo de pedidos de ingresso enviados pelo RH e acompanhe a situação de cada solicitação.',
    emptyText: 'Quando o RH enviar solicitações de admissão, elas aparecerão aqui.',
    searchPlaceholder: 'Cargo, setor, tipo ou solicitante...',
    fetcher: getAdminAdmissionRequests,
    getSearchValues(item) {
      const salaryValue = item.vacancy_salary ? String(item.vacancy_salary) : ''
      const salaryFormatted = item.vacancy_salary
        ? formatCurrency(item.vacancy_salary, item.vacancy_salary_currency ?? 'BRL')
        : ''
      return [
        item.cargo, item.setor, item.created_by_user_name, item.created_by_user_email,
        REQUEST_TYPE_LABELS[item.request_type], RECRUITMENT_SCOPE_LABELS[item.recruitment_scope],
        CONTRACT_REGIME_LABELS[item.contract_regime], item.turno, salaryValue, salaryFormatted,
      ]
    },
  },
  dismissal: {
    label: 'Demissão',
    title: 'Solicitações de demissão',
    description: 'Acompanhe desligamentos e mantenha o time de RH com visibilidade do status de cada pedido.',
    emptyText: 'Quando o RH enviar solicitações de demissão, elas aparecerão aqui.',
    searchPlaceholder: 'Colaborador, cargo, departamento ou solicitante...',
    fetcher: getAdminDismissalRequests,
    getSearchValues(item) {
      return [
        item.employee_name, item.cargo, item.departamento,
        item.created_by_user_name, item.created_by_user_email,
        DISMISSAL_TYPE_LABELS[item.dismissal_type], CONTRACT_REGIME_LABELS[item.contract_regime],
      ]
    },
  },
}

export function AdminRequestListSection({ initialTab = 'admission' }) {
  const { token, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = getTabFromPathname(location.pathname) || initialTab

  const [requestsByTab, setRequestsByTab] = useState({ admission: [], dismissal: [] })
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessages, setErrorMessages] = useState({ admission: '', dismissal: '' })
  const [selectedApprovalRequest, setSelectedApprovalRequest] = useState(null)
  const [selectedDetailsRequest, setSelectedDetailsRequest] = useState(null)
  const [selectedChecklistRequest, setSelectedChecklistRequest] = useState(null)
  const [selectedDismissalChecklistRequest, setSelectedDismissalChecklistRequest] = useState(null)
  const [selectedHireRequest, setSelectedHireRequest] = useState(null)
  const [selectedDismissalRejectionRequest, setSelectedDismissalRejectionRequest] = useState(null)
  const [dismissalRejectionComments, setDismissalRejectionComments] = useState('')
  const [dismissalRejectionError, setDismissalRejectionError] = useState('')
  const [isRejectingDismissal, setIsRejectingDismissal] = useState(false)
  const [admissionChecklistSteps, setAdmissionChecklistSteps] = useState([])
  const [dismissalChecklistSteps, setDismissalChecklistSteps] = useState([])
  const [refreshCounter, setRefreshCounter] = useState(0)

  useEffect(() => {
    let isMounted = true
    Promise.allSettled([
      REQUEST_TABS_CONFIG.admission.fetcher(token),
      REQUEST_TABS_CONFIG.dismissal.fetcher(token),
    ]).then(([admissionResult, dismissalResult]) => {
      if (!isMounted) return
      const nextRequests = { admission: [], dismissal: [] }
      const nextErrors = { admission: '', dismissal: '' }
      if (admissionResult.status === 'fulfilled') nextRequests.admission = admissionResult.value.items ?? []
      else nextErrors.admission = admissionResult.reason?.message ?? 'Erro ao carregar solicitações de admissão.'
      if (dismissalResult.status === 'fulfilled') nextRequests.dismissal = dismissalResult.value.items ?? []
      else nextErrors.dismissal = dismissalResult.reason?.message ?? 'Erro ao carregar solicitações de demissão.'
      setRequestsByTab(nextRequests)
      setErrorMessages(nextErrors)
    }).finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [refreshCounter, token])

  useEffect(() => {
    let isMounted = true
    getAdminAdmissionChecklist(token)
      .then((data) => { if (isMounted) setAdmissionChecklistSteps(data.items ?? []) })
      .catch(() => { if (isMounted) setAdmissionChecklistSteps([]) })
    return () => { isMounted = false }
  }, [token, refreshCounter])

  useEffect(() => {
    let isMounted = true
    getAdminDismissalChecklist(token)
      .then((data) => { if (isMounted) setDismissalChecklistSteps(data.items ?? []) })
      .catch(() => { if (isMounted) setDismissalChecklistSteps([]) })
    return () => { isMounted = false }
  }, [token, refreshCounter])

  const activeConfig = REQUEST_TABS_CONFIG[activeTab]
  const activeRequests = requestsByTab[activeTab]

  const visibleRequests = useMemo(() => {
    if (activeTab === 'dismissal') {
      if (user?.role === 'RH_ADMIN') return activeRequests
      if (user?.role !== 'RH_ANALISTA') return []
      return activeRequests.filter((item) => item.recruiter_user_id === user?.id)
    }
    if (user?.role === 'RH_ADMIN') return activeRequests
    if (user?.role !== 'RH_ANALISTA') return []
    return activeRequests.filter((item) => item.recruiter_user_id === user?.id)
  }, [activeRequests, activeTab, user?.id, user?.role])

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return visibleRequests.filter((item) => {
      const matchesStatus = activeTab !== 'admission' || statusFilter === 'all' || item.status === statusFilter
      const matchesQuery = !normalizedQuery || activeConfig.getSearchValues(item)
        .filter(Boolean).some((v) => v.toLowerCase().includes(normalizedQuery))
      return matchesStatus && matchesQuery
    })
  }, [activeConfig, activeTab, query, statusFilter, visibleRequests])

  const summary = getSummary(filteredRequests)

  function handleTabChange(tabKey) {
    setQuery('')
    setStatusFilter('all')
    setSelectedApprovalRequest(null)
    setSelectedDetailsRequest(null)
    setSelectedHireRequest(null)
    navigate(REQUEST_TAB_PATHS[tabKey])
  }

  function openApprovalStatus(item) {
    setSelectedApprovalRequest({ ...item, request_id: item.id, request_kind: activeTab.toUpperCase() })
  }

  function openDetailsModal(item) {
    setSelectedDetailsRequest({ ...item, request_id: item.id, request_kind: activeTab.toUpperCase() })
  }

  function openDismissalRejectionModal(item) {
    setSelectedDismissalRejectionRequest(item)
    setDismissalRejectionComments('')
    setDismissalRejectionError('')
  }

  function closeDismissalRejectionModal() {
    if (isRejectingDismissal) return
    setSelectedDismissalRejectionRequest(null)
    setDismissalRejectionComments('')
    setDismissalRejectionError('')
  }

  async function confirmDismissalRejection(event) {
    event.preventDefault()
    const normalizedComments = dismissalRejectionComments.trim()
    if (!normalizedComments) { setDismissalRejectionError('Informe o impedimento para recusar a demissão.'); return }
    if (!selectedDismissalRejectionRequest) return
    setIsRejectingDismissal(true)
    setDismissalRejectionError('')
    try {
      await rejectAdminDismissalRequest(token, selectedDismissalRejectionRequest.id, { comments: normalizedComments })
      setSelectedDismissalRejectionRequest(null)
      setDismissalRejectionComments('')
      setRefreshCounter((v) => v + 1)
    } catch (error) {
      setDismissalRejectionError(error.message)
    } finally {
      setIsRejectingDismissal(false)
    }
  }

  async function finalizeAdmissionRequest(item) {
    try {
      await finalizeAdminAdmissionRequest(token, item.id)
      setRefreshCounter((v) => v + 1)
    } catch (error) {
      setErrorMessages((cur) => ({ ...cur, admission: error.message }))
    }
  }

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Solicitações RH</span>
          <h2>{activeConfig.title}</h2>
          <p>{activeConfig.description}</p>
        </div>
        <div className="admin-header-actions">
          {activeTab === 'admission' ? (
            <Link className="secondary-link-button" to="/admin/admission-checklist">Gerenciar checklist</Link>
          ) : (
            <Link className="secondary-link-button" to="/admin/dismissal-checklist">Gerenciar checklist</Link>
          )}
          <Link className="secondary-link-button" to="/admin">Voltar ao início</Link>
        </div>
      </div>

      <section style={{
        display: 'flex', gap: 4,
        padding: '8px',
        borderRadius: 16,
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
      }}>
        {Object.entries(REQUEST_TABS_CONFIG).map(([tabKey, tabConfig]) => {
          const isActive = tabKey === activeTab
          const count = requestsByTab[tabKey].length
          return (
            <button
              key={tabKey}
              onClick={() => handleTabChange(tabKey)}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '11px 18px',
                borderRadius: 11, border: 'none',
                background: isActive ? '#fff' : 'transparent',
                color: isActive ? '#0f172a' : '#64748b',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms ease',
                boxShadow: isActive ? '0 1px 4px rgba(15,23,42,.08)' : 'none',
              }}
            >
              <span>{tabConfig.label}</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 22, height: 22, padding: '0 7px',
                borderRadius: 999,
                background: isActive ? '#0f172a' : '#e2e8f0',
                color: isActive ? '#fff' : '#64748b',
                fontSize: 11, fontWeight: 700,
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </section>

      {errorMessages[activeTab] && (
        <div className="form-error">{errorMessages[activeTab]}</div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 12,
      }}>
        <SummaryKpiCard label="Total" value={summary.total} accent="linear-gradient(90deg,#64748b,#94a3b8)" />
        <SummaryKpiCard label="Pendentes" value={summary.pending} accent="linear-gradient(90deg,#f59e0b,#fbbf24)" />
        <SummaryKpiCard label="Em análise" value={summary.underReview} accent="linear-gradient(90deg,#3b82f6,#60a5fa)" />
        <SummaryKpiCard label="Aprovadas" value={summary.approved} accent="linear-gradient(90deg,#22c55e,#4ade80)" />
        <SummaryKpiCard label="Finalizadas" value={summary.finalized} accent="linear-gradient(90deg,#14b8a6,#2dd4bf)" />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: activeTab === 'admission' ? '1fr auto' : '1fr',
        gap: 12,
        padding: '14px 18px',
        borderRadius: 14,
        background: '#fff',
        border: '1px solid #e2e8f0',
        alignItems: 'end',
      }}>
        <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 600, color: '#64748b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Buscar solicitação
          </span>
          <input
            placeholder={activeConfig.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              padding: '10px 14px', border: '1.5px solid #e2e8f0',
              borderRadius: 10, background: '#f8fafc',
              color: '#0f172a', fontSize: 14,
              outline: 'none',
            }}
          />
        </label>

        {activeTab === 'admission' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ADMISSION_STATUS_FILTERS.map((opt) => {
              const isSelected = statusFilter === opt.value
              const meta = ADMISSION_STATUS_META[opt.value]
              return (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '8px 13px', borderRadius: 8,
                    border: `1.5px solid ${isSelected ? (meta?.border ?? '#bfdbfe') : '#e2e8f0'}`,
                    background: isSelected ? (meta?.bg ?? '#eff6ff') : '#f8fafc',
                    color: isSelected ? (meta?.color ?? '#1d4ed8') : '#64748b',
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 140ms ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {meta && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot }} />
                  )}
                  {opt.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 32, height: 32,
            border: '3px solid #dbeafe', borderTopColor: '#2563eb',
            borderRadius: '50%', animation: 'spin .7s linear infinite',
          }} />
          <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Carregando solicitações...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div style={{
          padding: '72px 32px', textAlign: 'center',
          borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 4,
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/>
              <path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>
            </svg>
          </div>
          <strong style={{ fontSize: 16, color: '#334155' }}>Nenhuma solicitação encontrada</strong>
          <span style={{ fontSize: 14, color: '#94a3b8', maxWidth: 320, lineHeight: 1.65 }}>
            {activeConfig.emptyText}
          </span>
          {(query || statusFilter !== 'all') && (
            <button
              onClick={() => { setQuery(''); setStatusFilter('all') }}
              style={{ ...btnStyle('ghost'), marginTop: 8 }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 14,
        }}>
          {activeTab === 'admission'
            ? filteredRequests.map((item) => (
                <AdmissionCard
                  key={item.id}
                  item={item}
                  user={user}
                  actions={{
                    onViewApprovalStatus: () => openApprovalStatus(item),
                    onViewDetails: () => openDetailsModal(item),
                    onViewChecklist: () => setSelectedChecklistRequest(item),
                    onFinalizeAdmission: () => finalizeAdmissionRequest(item),
                    onRegisterHire: () => setSelectedHireRequest(item),
                  }}
                />
              ))
            : filteredRequests.map((item) => (
                <DismissalCard
                  key={item.id}
                  item={item}
                  user={user}
                  actions={{
                    onViewApprovalStatus: () => openApprovalStatus(item),
                    onViewChecklist: () => setSelectedDismissalChecklistRequest(item),
                    onViewDetails: () => openDetailsModal(item),
                    onRejectDismissal: () => openDismissalRejectionModal(item),
                    canRejectDismissal: user?.role === 'RH_ANALISTA' || user?.role === 'RH_ADMIN',
                  }}
                />
              ))
          }
        </div>
      )}

      <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, textAlign: 'right' }}>
        {filteredRequests.length} de {visibleRequests.length} solicitaç{visibleRequests.length !== 1 ? 'ões' : 'ão'} {query || statusFilter !== 'all' ? 'filtrada' + (filteredRequests.length !== 1 ? 's' : '') : ''}
      </div>

      <ApprovalStatusModal
        request={selectedApprovalRequest}
        token={token}
        onClose={() => setSelectedApprovalRequest(null)}
        onUpdated={() => setRefreshCounter((v) => v + 1)}
      />

      <RequestDetailsModal
        request={selectedDetailsRequest}
        token={token}
        onClose={() => setSelectedDetailsRequest(null)}
      />

      <AdmissionChecklistModal
        request={selectedChecklistRequest}
        steps={admissionChecklistSteps}
        token={token}
        onClose={() => setSelectedChecklistRequest(null)}
        onUpdated={(updatedRequest) => {
          setSelectedChecklistRequest(updatedRequest)
          setRefreshCounter((v) => v + 1)
        }}
      />

      <DismissalChecklistModal
        request={selectedDismissalChecklistRequest}
        steps={dismissalChecklistSteps}
        token={token}
        onClose={() => setSelectedDismissalChecklistRequest(null)}
        onUpdated={(updatedRequest) => {
          setSelectedDismissalChecklistRequest(updatedRequest)
          setRefreshCounter((v) => v + 1)
        }}
      />

      <AdmissionHireModal
        request={selectedHireRequest}
        token={token}
        onClose={() => setSelectedHireRequest(null)}
        onSubmitted={() => {
          setSelectedHireRequest(null)
          setRefreshCounter((v) => v + 1)
        }}
      />

      {selectedDismissalRejectionRequest ? createPortal(
        <div className="request-modal-backdrop" role="presentation" onClick={closeDismissalRejectionModal}>
          <div
            aria-labelledby="dismissal-rejection-title"
            aria-modal="true"
            className="request-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="request-modal-header">
              <div>
                <span className="approval-kind">Demissão</span>
                <h3 id="dismissal-rejection-title">Recusar solicitação</h3>
                <p>Informe o impedimento que justifica a recusa dessa demissão.</p>
              </div>
              <button className="secondary-button" type="button" onClick={closeDismissalRejectionModal} disabled={isRejectingDismissal}>
                Fechar
              </button>
            </div>

            <div className="request-modal-meta">
              <div>
                <span>Colaborador</span>
                <strong>{selectedDismissalRejectionRequest.employee_name}</strong>
                <small>{selectedDismissalRejectionRequest.cargo}</small>
              </div>
              <div>
                <span>Solicitante</span>
                <strong>{selectedDismissalRejectionRequest.created_by_user_name}</strong>
                <small>{selectedDismissalRejectionRequest.created_by_user_email}</small>
              </div>
            </div>

            {dismissalRejectionError && <div className="form-error">{dismissalRejectionError}</div>}

            <form onSubmit={confirmDismissalRejection}>
              <div className="request-modal-section">
                <div className="request-modal-section-header">
                  <h4>Justificativa da recusa</h4>
                  <span>Obrigatória</span>
                </div>
                <label className="field-group">
                  <span>Impedimento</span>
                  <textarea
                    autoFocus
                    disabled={isRejectingDismissal}
                    minLength={3}
                    name="comments"
                    onChange={(e) => setDismissalRejectionComments(e.target.value)}
                    placeholder="Ex.: colaborador ainda possui pendência contratual, documentação incompleta, entre outros."
                    required
                    rows="5"
                    value={dismissalRejectionComments}
                  />
                </label>
                <p className="request-modal-helper-text">
                  A solicitação será marcada como rejeitada assim que você confirmar.
                </p>
              </div>

              <div className="request-modal-actions">
                <button className="primary-button" type="submit" disabled={isRejectingDismissal}>
                  {isRejectingDismissal ? 'Recusando...' : 'Confirmar recusa'}
                </button>
                <button className="secondary-button" type="button" onClick={closeDismissalRejectionModal} disabled={isRejectingDismissal}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
