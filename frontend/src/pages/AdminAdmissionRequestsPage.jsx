import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { getAdminAdmissionRequests } from '../services/admin'

const STATUS_META = {
  PENDING: { label: 'Pendente', className: 'inactive' },
  UNDER_REVIEW: { label: 'Em análise', className: 'active' },
  APPROVED: { label: 'Aprovada', className: 'active' },
  REJECTED: { label: 'Rejeitada', className: 'inactive' },
  CANCELED: { label: 'Cancelada', className: 'inactive' },
}

const REQUEST_TYPE_LABELS = {
  GROWTH: 'Aumento de quadro',
  REPLACEMENT: 'Substituição',
}

const RECRUITMENT_SCOPE_LABELS = {
  INTERNAL: 'Interno',
  EXTERNAL: 'Externo',
  MIXED: 'Misto',
}

const CONTRACT_REGIME_LABELS = {
  TEMPORARY: 'Temporário',
  EFFECTIVE: 'Efetivo',
  INTERN: 'Estagiário',
  APPRENTICE: 'Aprendiz',
  CLT: 'CLT',
  PJ: 'PJ',
}

function formatDateTime(value) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getSummary(requests) {
  return {
    total: requests.length,
    pending: requests.filter((item) => item.status === 'PENDING').length,
    underReview: requests.filter((item) => item.status === 'UNDER_REVIEW').length,
    approved: requests.filter((item) => item.status === 'APPROVED').length,
  }
}

export function AdminAdmissionRequestsPage() {
  const { token } = useAuth()
  const [requests, setRequests] = useState([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    getAdminAdmissionRequests(token)
      .then((data) => {
        if (isMounted) {
          setRequests(data.items)
          setErrorMessage('')
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

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return requests
    }

    return requests.filter((item) => (
      [
        item.cargo,
        item.setor,
        item.created_by_user_name,
        item.created_by_user_email,
        REQUEST_TYPE_LABELS[item.request_type],
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    ))
  }, [query, requests])

  const summary = getSummary(filteredRequests)

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Solicitações RH</span>
          <h2>Solicitações de admissão</h2>
          <p>Controle o fluxo de pedidos enviados pelo RH e acompanhe a situação de cada solicitação.</p>
        </div>
        <Link className="secondary-link-button" to="/admin">
          Voltar ao início
        </Link>
      </div>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

      <section className="dashboard-stats-grid">
        <article className="stat-card">
          <span>Total</span>
          <strong>{summary.total}</strong>
        </article>
        <article className="stat-card">
          <span>Pendentes</span>
          <strong>{summary.pending}</strong>
        </article>
        <article className="stat-card">
          <span>Em análise</span>
          <strong>{summary.underReview}</strong>
        </article>
        <article className="stat-card">
          <span>Aprovadas</span>
          <strong>{summary.approved}</strong>
        </article>
      </section>

      <section className="admin-toolbar-card">
        <label className="field-group">
          <span>Buscar solicitação</span>
          <input
            placeholder="Filtrar por cargo, setor, tipo ou solicitante"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </section>

      <section className="admin-panel-card">
        {isLoading ? (
          <div className="empty-state">
            <strong>Carregando solicitações...</strong>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma solicitação encontrada</strong>
            <span>Quando o RH enviar solicitações de admissão, elas aparecerão aqui.</span>
          </div>
        ) : (
          <div className="requests-table-wrap">
            <table className="admin-table requests-table">
              <thead>
                <tr>
                  <th>Solicitante</th>
                  <th>Tipo</th>
                  <th>Cargo</th>
                  <th>Setor</th>
                  <th>Qtd.</th>
                  <th>Regime</th>
                  <th>Status</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((item) => {
                  const statusMeta = STATUS_META[item.status] ?? STATUS_META.PENDING
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.created_by_user_name}</strong>
                        <span>{item.created_by_user_email}</span>
                      </td>
                      <td>{REQUEST_TYPE_LABELS[item.request_type] ?? item.request_type}</td>
                      <td>
                        <strong>{item.cargo}</strong>
                        <span>{RECRUITMENT_SCOPE_LABELS[item.recruitment_scope] ?? item.recruitment_scope}</span>
                      </td>
                      <td>
                        <strong>{item.setor}</strong>
                        <span>{item.turno}</span>
                      </td>
                      <td>{item.quantity_people}</td>
                      <td>{CONTRACT_REGIME_LABELS[item.contract_regime] ?? item.contract_regime}</td>
                      <td>
                        <span className={`status-pill ${statusMeta.className}`}>{statusMeta.label}</span>
                      </td>
                      <td>{formatDateTime(item.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}