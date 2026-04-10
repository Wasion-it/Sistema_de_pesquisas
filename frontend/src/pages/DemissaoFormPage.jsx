import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { createAdminDismissalRequest } from '../services/admin'

const INITIAL_FORM = {
  nome: '',
  cargo: '',
  departamento: '',
  tipo: '',
  substituicao: '',
  dataDesligamento: '',
  regimeContratacao: '',
}

const TIPO_OPTIONS = [
  'Justa causa',
  'Pedido de demissão',
  'Dispensa sem justa causa',
  'Término de contrato',
  'Demissão consensual',
]

const REGIME_OPTIONS = [
  'Temporário',
  'Efetivo',
  'Estagiário',
  'Aprendiz',
  'CLT',
  'PJ',
]

const DismissalTypeMap = {
  'Justa causa': 'JUST_CAUSE',
  'Pedido de demissão': 'RESIGNATION',
  'Dispensa sem justa causa': 'WITHOUT_JUST_CAUSE',
  'Término de contrato': 'TERM_CONTRACT',
  'Demissão consensual': 'CONSENSUAL',
}

const ContractRegimeMap = {
  'Temporário': 'TEMPORARY',
  'Efetivo': 'EFFECTIVE',
  'Estagiário': 'INTERN',
  'Aprendiz': 'APPRENTICE',
  CLT: 'CLT',
  PJ: 'PJ',
}

export function DemissaoFormPage() {
  const { isAuthenticated, isLoading, token } = useAuth()
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSubmitDisabled = useMemo(
    () => Object.values(formValues).some((value) => value.trim().length === 0),
    [formValues],
  )

  function handleFieldChange(event) {
    const { name, value } = event.target
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }))
    if (successMessage) {
      setSuccessMessage('')
    }
    if (errorMessage) {
      setErrorMessage('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!token || !isAuthenticated) {
      setErrorMessage('Você precisa estar autenticado no portal administrativo para salvar esta solicitação.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const payload = {
        employee_name: formValues.nome.trim(),
        cargo: formValues.cargo.trim(),
        departamento: formValues.departamento.trim(),
        dismissal_type: DismissalTypeMap[formValues.tipo],
        has_replacement: formValues.substituicao === 'Sim',
        estimated_termination_date: formValues.dataDesligamento,
        contract_regime: ContractRegimeMap[formValues.regimeContratacao],
      }

      await createAdminDismissalRequest(token, payload)
      setSuccessMessage('Solicitação de demissão salva com sucesso.')
      setFormValues(INITIAL_FORM)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleReset() {
    setFormValues(INITIAL_FORM)
    setSuccessMessage('')
  }

  return (
    <main className="collab-shell">
      <header className="collab-header">
        <div className="collab-header-inner">
          <Link className="text-muted-link" to="/solicitacoes">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Solicitações
          </Link>
          <span className="collab-brand">RH Operacional</span>
        </div>
      </header>

      <div className="collab-content">
        <section className="module-hero-card compact">
          <span className="eyebrow">Solicitação de desligamento</span>
          <h1>Formulário de demissão</h1>
          <p>
            Preencha os dados principais da solicitação para padronizar o início do
            processo de desligamento.
          </p>
        </section>

        {isLoading ? <div className="collab-loading"><span>Carregando acesso administrativo...</span></div> : null}
        {!isLoading && !isAuthenticated ? (
          <div className="form-error">
            Acesso administrativo necessário. Faça login no portal RH para salvar esta solicitação.
          </div>
        ) : null}

        {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
        {successMessage ? <div className="form-success">{successMessage}</div> : null}

        <section className="request-editor-layout admin-panel-card">
          <aside className="request-form-pane">
            <div className="question-form-pane-header">
              <strong>Dados da solicitação</strong>
              <span className="field-hint">Preenchimento inicial</span>
            </div>

            <form className="survey-create-form" onSubmit={handleSubmit}>
              <div className="form-grid two-columns">
                <label className="field-group">
                  <span>Nome</span>
                  <input
                    name="nome"
                    placeholder="Nome do colaborador"
                    value={formValues.nome}
                    onChange={handleFieldChange}
                  />
                </label>

                <label className="field-group">
                  <span>Cargo</span>
                  <input
                    name="cargo"
                    placeholder="Cargo atual"
                    value={formValues.cargo}
                    onChange={handleFieldChange}
                  />
                </label>

                <label className="field-group">
                  <span>Departamento</span>
                  <input
                    name="departamento"
                    placeholder="Departamento de lotação"
                    value={formValues.departamento}
                    onChange={handleFieldChange}
                  />
                </label>

                <label className="field-group">
                  <span>Tipo</span>
                  <select name="tipo" value={formValues.tipo} onChange={handleFieldChange}>
                    <option value="">Selecione</option>
                    {TIPO_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Substituição</span>
                  <select name="substituicao" value={formValues.substituicao} onChange={handleFieldChange}>
                    <option value="">Selecione</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </label>

                <label className="field-group">
                  <span>Data estimada do desligamento</span>
                  <input
                    name="dataDesligamento"
                    type="date"
                    value={formValues.dataDesligamento}
                    onChange={handleFieldChange}
                  />
                </label>
              </div>

              <label className="field-group">
                <span>Regime de contratação</span>
                <select name="regimeContratacao" value={formValues.regimeContratacao} onChange={handleFieldChange}>
                  <option value="">Selecione</option>
                  {REGIME_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-actions-row">
                <button className="primary-button" disabled={isSubmitDisabled || isSubmitting || !isAuthenticated} type="submit">
                  {isSubmitting ? 'Salvando...' : 'Salvar solicitação'}
                </button>
                <button className="secondary-button" type="button" onClick={handleReset}>
                  Limpar campos
                </button>
              </div>
            </form>
          </aside>

          <aside className="request-summary-pane">
            <div>
              <span className="eyebrow">Resumo</span>
              <h2>Fluxo de desligamento</h2>
              <p>
                Use este bloco para manter o pedido claro antes de integrar com o
                backend ou com o processo de aprovação.
              </p>
            </div>

            <div className="request-summary-list">
              <div className="request-summary-item">
                <strong>Nome</strong>
                <span>{formValues.nome || 'Ainda não preenchido'}</span>
              </div>
              <div className="request-summary-item">
                <strong>Tipo</strong>
                <span>{formValues.tipo || 'Ainda não preenchido'}</span>
              </div>
              <div className="request-summary-item">
                <strong>Substituição</strong>
                <span>{formValues.substituicao || 'Ainda não preenchido'}</span>
              </div>
              <div className="request-summary-item">
                <strong>Data estimada</strong>
                <span>{formValues.dataDesligamento || 'Ainda não preenchido'}</span>
              </div>
              <div className="request-summary-item">
                <strong>Regime</strong>
                <span>{formValues.regimeContratacao || 'Ainda não preenchido'}</span>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}