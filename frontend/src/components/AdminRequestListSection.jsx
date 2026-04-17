import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { AdmissionChecklistModal } from './AdmissionChecklistModal'
import { AdmissionHireModal } from './AdmissionHireModal'
import { ApprovalStatusModal } from './ApprovalStatusModal'
import { RequestDetailsModal } from './RequestDetailsModal'
import {
  finalizeAdminAdmissionRequest,
  getAdminAdmissionChecklist,
  getAdminAdmissionRequests,
  getAdminDismissalRequests,
  rejectAdminDismissalRequest,
} from '../services/admin'

const ADMISSION_STATUS_META = {
  PENDING: { label: 'Pendente', className: 'inactive' },
  APPROVED: { label: 'Aprovada', className: 'active' },
  FINALIZED: { label: 'Finalizada', className: 'active' },
  REJECTED: { label: 'Rejeitada', className: 'inactive' },
}

const STATUS_META = {
  PENDING: { label: 'Pendente', className: 'inactive' },
  UNDER_REVIEW: { label: 'Em análise', className: 'active' },
  APPROVED: { label: 'Aprovada', className: 'active' },
  FINALIZED: { label: 'Finalizada', className: 'active' },
  REJECTED: { label: 'Rejeitada', className: 'inactive' },
  CANCELED: { label: 'Cancelada', className: 'inactive' },
}

const ADMISSION_STATUS_FILTERS = [
  { value: 'all', label: 'Todos os status' },
  ...Object.entries(ADMISSION_STATUS_META).map(([value, meta]) => ({ value, label: meta.label })),
]

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

const DISMISSAL_TYPE_LABELS = {
  JUST_CAUSE: 'Justa causa',
  RESIGNATION: 'Pedido de demissão',
  WITHOUT_JUST_CAUSE: 'Dispensa sem justa causa',
  TERM_CONTRACT: 'Término de contrato',
  CONSENSUAL: 'Demissão consensual',
}

const REQUEST_TAB_PATHS = {
  admission: '/admin/admission-requests',
  dismissal: '/admin/dismissal-requests',
}

const REQUEST_TABS = {
  admission: {
    label: 'Admissão',
    title: 'Solicitações de admissão',
    description: 'Controle o fluxo de pedidos de ingresso enviados pelo RH e acompanhe a situação de cada solicitação.',
    emptyText: 'Quando o RH enviar solicitações de admissão, elas aparecerão aqui.',
    searchPlaceholder: 'Filtrar por cargo, setor, tipo ou solicitante',
    fetcher: getAdminAdmissionRequests,
    getSearchValues(item) {
      return [
        item.cargo,
        item.setor,
        item.created_by_user_name,
        item.created_by_user_email,
        REQUEST_TYPE_LABELS[item.request_type],
        RECRUITMENT_SCOPE_LABELS[item.recruitment_scope],
        CONTRACT_REGIME_LABELS[item.contract_regime],
        item.turno,
        `${item.hired_employee_count ?? 0}/${item.quantity_people ?? 0}`,
      ]
    },
    renderHeaders() {
      return (
        <tr>
          <th>Solicitante</th>
          <th>Tipo</th>
          <th>Cargo</th>
          <th>Setor</th>
          <th>Qtd.</th>
          <th>Contratados</th>
          <th>Regime</th>
          <th>Status</th>
          <th>Ações</th>
          <th>Criado em</th>
          <th>Finalizada em</th>
        </tr>
      )
    },
    renderRow(item, actions) {
      const statusMeta = ADMISSION_STATUS_META[item.status] ?? ADMISSION_STATUS_META.PENDING
      const hiredCount = item.hired_employee_count ?? 0
      const quantityPeople = item.quantity_people ?? 0
      const remainingPositions = item.remaining_positions ?? Math.max(quantityPeople - hiredCount, 0)
      const isFinalized = item.status === 'FINALIZED'
      const canFinalizeAdmission = item.status === 'APPROVED' && quantityPeople > 0 && hiredCount >= quantityPeople
      const canRegisterHire = item.status === 'APPROVED'

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
          <td>
            <span className="request-hire-counter">
              <strong>{hiredCount}</strong>&nbsp;/ {item.quantity_people}
            </span>
          </td>
          <td>{CONTRACT_REGIME_LABELS[item.contract_regime] ?? item.contract_regime}</td>
          <td>
            <span className={`status-pill ${statusMeta.className}`}>{statusMeta.label}</span>
          </td>
          <td>
            <div className="request-row-actions">
              <div className="request-row-actions-info">
                <button className="table-action-btn" type="button" onClick={actions.onViewApprovalStatus}>
                  Aprovações
                </button>
                <button className="table-action-btn" type="button" onClick={actions.onViewDetails}>
                  Detalhes
                </button>
                {actions.onViewChecklist ? (
                  <button className="table-action-btn" type="button" onClick={actions.onViewChecklist}>
                    Checklist
                  </button>
                ) : null}
              </div>
              <div className="request-row-actions-cta">
                {actions.onFinalizeAdmission && canFinalizeAdmission && !isFinalized ? (
                  <button className="table-action-btn success" type="button" onClick={actions.onFinalizeAdmission}>
                    Finalizar vaga
                  </button>
                ) : null}
                <button
                  className="table-action-btn primary"
                  type="button"
                  onClick={actions.onRegisterHire}
                  disabled={!canRegisterHire}
                  title={!canRegisterHire ? 'Aguardando aprovação da solicitação' : undefined}
                >
                  {isFinalized ? 'Vaga finalizada' : canRegisterHire ? 'Cadastrar candidatos' : 'Aguardando aprovação'}
                </button>
              </div>
            </div>
          </td>
          <td>{formatDateTime(item.created_at)}</td>
          <td>{formatDateTime(item.finalized_at)}</td>
        </tr>
      )
    },
  },
  dismissal: {
    label: 'Demissão',
    title: 'Solicitações de demissão',
    description: 'Acompanhe desligamentos e mantenha o time de RH com visibilidade do status de cada pedido.',
    emptyText: 'Quando o RH enviar solicitações de demissão, elas aparecerão aqui.',
    searchPlaceholder: 'Filtrar por colaborador, cargo, departamento ou solicitante',
    fetcher: getAdminDismissalRequests,
    getSearchValues(item) {
      return [
        item.employee_name,
        item.cargo,
        item.departamento,
        item.created_by_user_name,
        item.created_by_user_email,
        DISMISSAL_TYPE_LABELS[item.dismissal_type],
        CONTRACT_REGIME_LABELS[item.contract_regime],
        item.has_replacement ? 'Sim' : 'Não',
      ]
    },
    renderHeaders() {
      return (
        <tr>
          <th>Solicitante</th>
          <th>Colaborador</th>
          <th>Tipo</th>
          <th>Cargo</th>
          <th>Departamento</th>
          <th>Substituição</th>
          <th>Status</th>
          <th>Aprovação</th>
          <th>Criado em</th>
        </tr>
      )
    },
    renderRow(item, actions) {
      const statusMeta = STATUS_META[item.status] ?? STATUS_META.PENDING
      const canRejectDismissal = actions.canRejectDismissal && item.status === 'APPROVED'

      return (
        <tr key={item.id}>
          <td>
            <strong>{item.created_by_user_name}</strong>
            <span>{item.created_by_user_email}</span>
          </td>
          <td>
            <strong>{item.employee_name}</strong>
            <span>{CONTRACT_REGIME_LABELS[item.contract_regime] ?? item.contract_regime}</span>
          </td>
          <td>{DISMISSAL_TYPE_LABELS[item.dismissal_type] ?? item.dismissal_type}</td>
          <td>{item.cargo}</td>
          <td>{item.departamento}</td>
          <td>{item.has_replacement ? 'Sim' : 'Não'}</td>
          <td>
            <span className={`status-pill ${statusMeta.className}`}>{statusMeta.label}</span>
          </td>
          <td>
            <div className="request-row-actions">
              <div className="request-row-actions-info">
                <button className="table-action-btn" type="button" onClick={actions.onViewApprovalStatus}>
                  Aprovações
                </button>
                <button className="table-action-btn" type="button" onClick={actions.onViewDetails}>
                  Detalhes
                </button>
              </div>
              {canRejectDismissal && actions.onRejectDismissal ? (
                <div className="request-row-actions-cta">
                  <button className="table-action-btn danger" type="button" onClick={actions.onRejectDismissal}>
                    Recusar demissão
                  </button>
                </div>
              ) : null}
            </div>
          </td>
          <td>{formatDateTime(item.created_at)}</td>
        </tr>
      )
    },
  },
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

function getTabFromPathname(pathname) {
  return pathname.includes('dismissal-requests') ? 'dismissal' : 'admission'
}

export function AdminRequestListSection({ initialTab = 'admission' }) {
  const { token, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = getTabFromPathname(location.pathname) || initialTab
  const [requestsByTab, setRequestsByTab] = useState({
    admission: [],
    dismissal: [],
  })
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessages, setErrorMessages] = useState({
    admission: '',
    dismissal: '',
  })
  const [selectedApprovalRequest, setSelectedApprovalRequest] = useState(null)
  const [selectedDetailsRequest, setSelectedDetailsRequest] = useState(null)
  const [selectedChecklistRequest, setSelectedChecklistRequest] = useState(null)
  const [selectedHireRequest, setSelectedHireRequest] = useState(null)
  const [selectedDismissalRejectionRequest, setSelectedDismissalRejectionRequest] = useState(null)
  const [dismissalRejectionComments, setDismissalRejectionComments] = useState('')
  const [dismissalRejectionError, setDismissalRejectionError] = useState('')
  const [isRejectingDismissal, setIsRejectingDismissal] = useState(false)
  const [admissionChecklistSteps, setAdmissionChecklistSteps] = useState([])
  const [refreshCounter, setRefreshCounter] = useState(0)

  useEffect(() => {
    let isMounted = true

    Promise.allSettled([
      REQUEST_TABS.admission.fetcher(token),
      REQUEST_TABS.dismissal.fetcher(token),
    ])
      .then(([admissionResult, dismissalResult]) => {
        if (!isMounted) return

        const nextRequests = {
          admission: [],
          dismissal: [],
        }
        const nextErrors = {
          admission: '',
          dismissal: '',
        }

        if (admissionResult.status === 'fulfilled') {
          nextRequests.admission = admissionResult.value.items ?? []
        } else {
          nextErrors.admission = admissionResult.reason?.message ?? 'Erro ao carregar solicitações de admissão.'
        }

        if (dismissalResult.status === 'fulfilled') {
          nextRequests.dismissal = dismissalResult.value.items ?? []
        } else {
          nextErrors.dismissal = dismissalResult.reason?.message ?? 'Erro ao carregar solicitações de demissão.'
        }

        setRequestsByTab(nextRequests)
        setErrorMessages(nextErrors)
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
    }, [refreshCounter, token])

  useEffect(() => {
    let isMounted = true

    getAdminAdmissionChecklist(token)
      .then((data) => {
        if (isMounted) {
          setAdmissionChecklistSteps(data.items ?? [])
        }
      })
      .catch(() => {
        if (isMounted) {
          setAdmissionChecklistSteps([])
        }
      })

    return () => {
      isMounted = false
    }
  }, [token, refreshCounter])

  const activeConfig = REQUEST_TABS[activeTab]
  const activeRequests = requestsByTab[activeTab]
  const visibleRequests = useMemo(() => {
    if (activeTab === 'dismissal') {
      if (user?.role !== 'RH_ANALISTA') {
        return []
      }

      return activeRequests.filter((item) => item.recruiter_user_id === user?.id)
    }

    if (user?.role === 'RH_ADMIN') {
      return activeRequests
    }

    if (user?.role !== 'RH_ANALISTA') {
      return []
    }

    return activeRequests.filter((item) => item.recruiter_user_id === user?.id)
  }, [activeRequests, activeTab, user?.id, user?.role])

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return visibleRequests.filter((item) => {
      const matchesStatus =
        activeTab !== 'admission' ||
        statusFilter === 'all' ||
        item.status === statusFilter

      const matchesQuery =
        !normalizedQuery ||
        activeConfig.getSearchValues(item)
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery))

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
    setSelectedApprovalRequest({
      ...item,
      request_id: item.id,
      request_kind: activeTab.toUpperCase(),
    })
  }

  function openHireModal(item) {
    setSelectedHireRequest(item)
  }

  function openDetailsModal(item) {
    setSelectedDetailsRequest({
      ...item,
      request_id: item.id,
      request_kind: activeTab.toUpperCase(),
    })
  }

  function openChecklistModal(item) {
    setSelectedChecklistRequest(item)
  }

  function openDismissalRejectionModal(item) {
    setSelectedDismissalRejectionRequest(item)
    setDismissalRejectionComments('')
    setDismissalRejectionError('')
  }

  function closeDismissalRejectionModal() {
    if (isRejectingDismissal) {
      return
    }

    setSelectedDismissalRejectionRequest(null)
    setDismissalRejectionComments('')
    setDismissalRejectionError('')
  }

  async function confirmDismissalRejection(event) {
    event.preventDefault()

    const normalizedComments = dismissalRejectionComments.trim()
    if (!normalizedComments) {
      setDismissalRejectionError('Informe o impedimento para recusar a demissão.')
      return
    }

    if (!selectedDismissalRejectionRequest) {
      return
    }

    setIsRejectingDismissal(true)
    setDismissalRejectionError('')

    try {
      await rejectAdminDismissalRequest(token, selectedDismissalRejectionRequest.id, {
        comments: normalizedComments,
      })
      setSelectedDismissalRejectionRequest(null)
      setDismissalRejectionComments('')
      setRefreshCounter((currentValue) => currentValue + 1)
    } catch (error) {
      setDismissalRejectionError(error.message)
    } finally {
      setIsRejectingDismissal(false)
    }
  }

  async function finalizeAdmissionRequest(item) {
    try {
      await finalizeAdminAdmissionRequest(token, item.id)
      setRefreshCounter((currentValue) => currentValue + 1)
    } catch (error) {
      setErrorMessages((currentErrors) => ({
        ...currentErrors,
        admission: error.message,
      }))
    }
  }

  function handleHireSuccess() {
    setSelectedHireRequest(null)
    setRefreshCounter((currentValue) => currentValue + 1)
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
          <Link className="secondary-link-button" to="/admin/admission-checklist">
            Gerenciar checklist
          </Link>
          <Link className="secondary-link-button" to="/admin">
            Voltar ao início
          </Link>
        </div>
      </div>

      <section className="admin-panel-card admin-request-tabs">
        <div className="admin-request-tabs-row">
          {Object.entries(REQUEST_TABS).map(([tabKey, tabConfig]) => {
            const isActive = tabKey === activeTab
            return (
              <button
                key={tabKey}
                className={`admin-request-tab ${isActive ? 'active' : ''}`}
                type="button"
                onClick={() => handleTabChange(tabKey)}
              >
                <span>{tabConfig.label}</span>
                <strong>{requestsByTab[tabKey].length}</strong>
              </button>
            )
          })}
        </div>
      </section>

      {errorMessages[activeTab] ? <div className="form-error">{errorMessages[activeTab]}</div> : null}

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
        <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'admission' ? '2fr 1fr' : '1fr', gap: 16 }}>
          <label className="field-group">
            <span>Buscar solicitação</span>
            <input
              placeholder={activeConfig.searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          {activeTab === 'admission' ? (
            <label className="field-group">
              <span>Filtrar por status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {ADMISSION_STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </section>

      <section className="admin-panel-card">
        {isLoading ? (
          <div className="empty-state">
            <strong>Carregando solicitações...</strong>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma solicitação encontrada</strong>
            <span>{activeConfig.emptyText}</span>
          </div>
        ) : (
          <div className="requests-table-wrap">
            <table className="admin-table requests-table">
              <thead>{activeConfig.renderHeaders()}</thead>
              <tbody>
                {filteredRequests.map((item) =>
                  activeConfig.renderRow(item, {
                    onViewApprovalStatus: () => openApprovalStatus(item),
                    onViewDetails: () => openDetailsModal(item),
                    onViewChecklist: activeTab === 'admission' ? () => openChecklistModal(item) : null,
                    onFinalizeAdmission: activeTab === 'admission' ? () => finalizeAdmissionRequest(item) : null,
                    onRegisterHire: activeTab === 'admission' ? () => openHireModal(item) : null,
                    onRejectDismissal: activeTab === 'dismissal' ? () => openDismissalRejectionModal(item) : null,
                    canRejectDismissal: user?.role === 'RH_ANALISTA' || user?.role === 'RH_ADMIN',
                  }),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ApprovalStatusModal
        request={selectedApprovalRequest}
        token={token}
        onClose={() => setSelectedApprovalRequest(null)}
        onUpdated={() => setRefreshCounter((currentValue) => currentValue + 1)}
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
          setRefreshCounter((currentValue) => currentValue + 1)
        }}
      />

      <AdmissionHireModal
        request={selectedHireRequest}
        token={token}
        onClose={() => setSelectedHireRequest(null)}
        onSubmitted={handleHireSuccess}
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

            {dismissalRejectionError ? <div className="form-error">{dismissalRejectionError}</div> : null}

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
                    onChange={(event) => setDismissalRejectionComments(event.target.value)}
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