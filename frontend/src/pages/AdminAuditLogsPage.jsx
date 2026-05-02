import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { getAdminAuditLogs } from '../services/admin'

const ACTION_LABELS = {
  CREATE: 'Criacao',
  UPDATE: 'Atualizacao',
  DELETE: 'Exclusao',
  LOGIN: 'Login',
  PUBLISH: 'Publicacao',
  SUBMIT: 'Envio',
}

const ACTION_OPTIONS = [
  { value: '', label: 'Todas as acoes' },
  { value: 'CREATE', label: 'Criacao' },
  { value: 'UPDATE', label: 'Atualizacao' },
  { value: 'DELETE', label: 'Exclusao' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'PUBLISH', label: 'Publicacao' },
  { value: 'SUBMIT', label: 'Envio' },
]

function formatDateTime(value) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDetails(details) {
  if (details === null || details === undefined || details === '') {
    return ''
  }

  if (typeof details === 'string') {
    return details
  }

  return JSON.stringify(details, null, 2)
}

function getActorName(item) {
  if (item.actor_user?.full_name) return item.actor_user.full_name
  if (item.actor_user?.email) return item.actor_user.email
  return 'Sistema'
}

export function AdminAuditLogsPage() {
  const { token, user } = useAuth()
  const [pageData, setPageData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [filters, setFilters] = useState({ query: '', action: '', entity_name: '' })
  const [appliedFilters, setAppliedFilters] = useState({ query: '', action: '', entity_name: '' })
  const [offset, setOffset] = useState(0)

  const limit = 250

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setErrorMessage('')

    getAdminAuditLogs(token, { ...appliedFilters, limit, offset })
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
  }, [appliedFilters, offset, token])

  const items = pageData?.items ?? []
  const total = pageData?.total ?? 0
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const hasPrevious = offset > 0
  const hasNext = offset + limit < total

  const stats = useMemo(() => {
    const byAction = items.reduce((acc, item) => {
      acc[item.action] = (acc[item.action] ?? 0) + 1
      return acc
    }, {})

    return {
      loaded: items.length,
      total,
      updates: byAction.UPDATE ?? 0,
      logins: byAction.LOGIN ?? 0,
    }
  }, [items, total])

  if (user?.role !== 'RH_ADMIN') {
    return <Navigate replace to="/admin" />
  }

  function handleSubmit(event) {
    event.preventDefault()
    setOffset(0)
    setAppliedFilters(filters)
  }

  function handleClear() {
    const emptyFilters = { query: '', action: '', entity_name: '' }
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setOffset(0)
  }

  return (
    <div className="admin-view audit-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Auditoria</span>
          <h2>Logs do sistema</h2>
          <p>
            Consulte eventos administrativos, publicacoes, envios, logins e alteracoes registradas no portal.
          </p>
        </div>
      </div>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

      <section className="dashboard-stats-grid audit-stats-grid">
        <article className="stat-card">
          <span>Total encontrado</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="stat-card">
          <span>Carregados</span>
          <strong>{stats.loaded}</strong>
        </article>
        <article className="stat-card">
          <span>Atualizacoes nesta pagina</span>
          <strong>{stats.updates}</strong>
        </article>
        <article className="stat-card">
          <span>Logins nesta pagina</span>
          <strong>{stats.logins}</strong>
        </article>
      </section>

      <form className="admin-toolbar-card audit-toolbar" onSubmit={handleSubmit}>
        <label>
          <span>Busca</span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="Usuario, entidade, descricao ou detalhes"
          />
        </label>

        <label>
          <span>Acao</span>
          <select
            value={filters.action}
            onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Entidade</span>
          <input
            type="search"
            value={filters.entity_name}
            onChange={(event) => setFilters((current) => ({ ...current, entity_name: event.target.value }))}
            placeholder="Ex.: user_access"
          />
        </label>

        <div className="audit-toolbar-actions">
          <button className="primary-action-button" type="submit">Filtrar</button>
          <button className="secondary-action-button" type="button" onClick={handleClear}>Limpar</button>
        </div>
      </form>

      <section className="admin-table-card">
        <div className="panel-header-row">
          <div>
            <h3>Eventos registrados</h3>
            <p>Pagina {currentPage} de {totalPages} · exibindo ate {limit} registros por pagina.</p>
          </div>

          <div className="audit-pagination">
            <button className="secondary-action-button" type="button" disabled={!hasPrevious} onClick={() => setOffset(Math.max(0, offset - limit))}>
              Anterior
            </button>
            <button className="secondary-action-button" type="button" disabled={!hasNext} onClick={() => setOffset(offset + limit)}>
              Proxima
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="empty-state">
            <strong>Carregando logs</strong>
            <span>Buscando eventos registrados no sistema.</span>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhum log encontrado</strong>
            <span>Ajuste os filtros para ampliar a consulta.</span>
          </div>
        ) : (
          <div className="requests-table-wrap">
            <table className="requests-table audit-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Acao</th>
                  <th>Usuario</th>
                  <th>Entidade</th>
                  <th>Descricao</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const details = formatDetails(item.details)

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{formatDateTime(item.created_at)}</strong>
                        <span>IP: {item.ip_address ?? '-'}</span>
                      </td>
                      <td>
                        <span className={`audit-action-pill action-${item.action.toLowerCase()}`}>
                          {ACTION_LABELS[item.action] ?? item.action}
                        </span>
                      </td>
                      <td>
                        <strong>{getActorName(item)}</strong>
                        <span>{item.actor_user?.role ?? 'Sem usuario'}</span>
                      </td>
                      <td>
                        <strong>{item.entity_name}</strong>
                        <span>ID: {item.entity_id}</span>
                      </td>
                      <td>{item.description ?? '-'}</td>
                      <td>
                        {details ? (
                          <details className="audit-details">
                            <summary>Ver dados</summary>
                            <pre>{details}</pre>
                          </details>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
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
