import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const INITIAL_FORM = {
  tipo: '',
  nomeSubstituido: '',
  justificativa: '',
  cargo: '',
  setor: '',
  recrutamento: '',
  quantidadePessoas: '',
  turno: '',
  regimeContratacao: '',
}

const TIPO_OPTIONS = ['Aumento de quadro', 'Substituição']

const RECRUTAMENTO_OPTIONS = ['Interno', 'Externo', 'Misto']

const TURNO_OPTIONS = ['Integral', 'Manhã', 'Tarde', 'Noite', 'Misto']

const REGIME_OPTIONS = [
  'Temporário',
  'Efetivo',
  'Estagiário',
  'Aprendiz',
  'CLT',
  'PJ',
]

export function AdmissaoFormPage() {
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [successMessage, setSuccessMessage] = useState('')

  const isSubstituicao = formValues.tipo === 'Substituição'
  const isAumentoQuado = formValues.tipo === 'Aumento de quadro'

  const isSubmitDisabled = useMemo(() => {
    if (!formValues.tipo || !formValues.cargo || !formValues.setor || !formValues.recrutamento) {
      return true
    }

    if (!formValues.quantidadePessoas || Number(formValues.quantidadePessoas) < 1) {
      return true
    }

    if (!formValues.turno || !formValues.regimeContratacao) {
      return true
    }

    if (isSubstituicao && !formValues.nomeSubstituido.trim()) {
      return true
    }

    if (isAumentoQuado && !formValues.justificativa.trim()) {
      return true
    }

    return false
  }, [formValues, isSubstituicao, isAumentoQuado])

  function handleFieldChange(event) {
    const { name, value } = event.target
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }))
    if (successMessage) {
      setSuccessMessage('')
    }
  }

  function handleTipoChange(event) {
    const { value } = event.target
    setFormValues((current) => ({
      ...current,
      tipo: value,
      nomeSubstituido: value === 'Substituição' ? current.nomeSubstituido : '',
      justificativa: value === 'Aumento de quadro' ? current.justificativa : '',
    }))
    if (successMessage) {
      setSuccessMessage('')
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSuccessMessage('Solicitação de admissão preparada localmente. Integração com backend será o próximo passo.')
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
          <span className="eyebrow">Solicitação de admissão</span>
          <h1>Formulário de admissão</h1>
          <p>
            Preencha os dados do novo pedido para organizar abertura de vaga, tipo de
            contratação e contexto da solicitação.
          </p>
        </section>

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
                  <span>Tipo</span>
                  <select name="tipo" value={formValues.tipo} onChange={handleTipoChange}>
                    <option value="">Selecione</option>
                    {TIPO_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Cargo</span>
                  <input
                    name="cargo"
                    placeholder="Cargo da vaga"
                    value={formValues.cargo}
                    onChange={handleFieldChange}
                  />
                </label>

                <label className="field-group">
                  <span>Setor</span>
                  <input
                    name="setor"
                    placeholder="Setor responsável"
                    value={formValues.setor}
                    onChange={handleFieldChange}
                  />
                </label>

                <label className="field-group">
                  <span>Recrutamento</span>
                  <select name="recrutamento" value={formValues.recrutamento} onChange={handleFieldChange}>
                    <option value="">Selecione</option>
                    {RECRUTAMENTO_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Quantidade de pessoas para a vaga</span>
                  <input
                    min="1"
                    name="quantidadePessoas"
                    placeholder="Ex: 1"
                    type="number"
                    value={formValues.quantidadePessoas}
                    onChange={handleFieldChange}
                  />
                </label>

                <label className="field-group">
                  <span>Turno</span>
                  <select name="turno" value={formValues.turno} onChange={handleFieldChange}>
                    <option value="">Selecione</option>
                    {TURNO_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

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
              </div>

              {isSubstituicao ? (
                <label className="field-group">
                  <span>Nome do substituído</span>
                  <input
                    name="nomeSubstituido"
                    placeholder="Nome do colaborador a ser substituído"
                    value={formValues.nomeSubstituido}
                    onChange={handleFieldChange}
                  />
                </label>
              ) : null}

              {isAumentoQuado ? (
                <label className="field-group">
                  <span>Justificativa</span>
                  <textarea
                    name="justificativa"
                    rows="4"
                    placeholder="Explique a necessidade da vaga"
                    value={formValues.justificativa}
                    onChange={handleFieldChange}
                  />
                </label>
              ) : null}

              <div className="request-note-box">
                <strong>Lembrete</strong>
                <p>
                  Caso seja substituição de funcionário, informe ao gestor que ele deve
                  solicitar a demissão do substituído.
                </p>
              </div>

              <div className="form-actions-row">
                <button className="primary-button" disabled={isSubmitDisabled} type="submit">
                  Salvar solicitação
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
              <h2>Fluxo de admissão</h2>
              <p>
                Esta tela organiza o pedido antes de seguir para as próximas etapas do
                RH e do gestor.
              </p>
            </div>

            <div className="request-summary-list">
              <div className="request-summary-item">
                <strong>Tipo</strong>
                <span>{formValues.tipo || 'Ainda não preenchido'}</span>
              </div>
              <div className="request-summary-item">
                <strong>Cargo</strong>
                <span>{formValues.cargo || 'Ainda não preenchido'}</span>
              </div>
              <div className="request-summary-item">
                <strong>Setor</strong>
                <span>{formValues.setor || 'Ainda não preenchido'}</span>
              </div>
              <div className="request-summary-item">
                <strong>Recrutamento</strong>
                <span>{formValues.recrutamento || 'Ainda não preenchido'}</span>
              </div>
              <div className="request-summary-item">
                <strong>Quantidade</strong>
                <span>{formValues.quantidadePessoas || 'Ainda não preenchido'}</span>
              </div>
              <div className="request-summary-item">
                <strong>Turno</strong>
                <span>{formValues.turno || 'Ainda não preenchido'}</span>
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