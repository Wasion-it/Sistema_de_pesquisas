import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { createAdminAdmissionRequest, getAdminJobTitles } from '../services/admin'

const INITIAL_FORM = {
  tipo: '',
  nomeSubstituido: '',
  justificativa: '',
  posicaoVaga: '',
  isConfidential: false,
  cargo: '',
  setor: '',
  recrutamento: '',
  quantidadePessoas: '',
  turno: '',
  regimeContratacao: '',
}

const TIPO_OPTIONS = ['Aumento de quadro', 'Substituição']

const RECRUTAMENTO_OPTIONS = ['Interno', 'Externo', 'Misto']

const POSITION_OPTIONS = [
  { label: 'Administrativo', value: 'PUBLIC_ADMINISTRATIVE' },
  { label: 'Operacional', value: 'PUBLIC_OPERATIONAL' },
  { label: 'Liderança', value: 'PUBLIC_LEADERSHIP' },
]

const TURNO_OPTIONS = ['Integral', 'Manhã', 'Tarde', 'Noite', 'Misto']

const REGIME_OPTIONS = [
  'Temporário',
  'Efetivo',
  'Estagiário',
  'Aprendiz',
  'CLT',
  'PJ',
]

const REQUEST_TYPE_MAP = {
  'Aumento de quadro': 'GROWTH',
  'Substituição': 'REPLACEMENT',
}

const RECRUITMENT_SCOPE_MAP = {
  Interno: 'INTERNAL',
  Externo: 'EXTERNAL',
  Misto: 'MIXED',
}

const CONTRACT_REGIME_MAP = {
  Temporário: 'TEMPORARY',
  Efetivo: 'EFFECTIVE',
  Estagiário: 'INTERN',
  Aprendiz: 'APPRENTICE',
  CLT: 'CLT',
  PJ: 'PJ',
}

export function AdmissaoFormPage() {
  const { isAuthenticated, isLoading, token } = useAuth()
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [jobTitles, setJobTitles] = useState([])
  const [isLoadingJobTitles, setIsLoadingJobTitles] = useState(true)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSubstituicao = formValues.tipo === 'Substituição'
  const isAumentoQuado = formValues.tipo === 'Aumento de quadro'

  useEffect(() => {
    let isMounted = true

    if (!token || !isAuthenticated) {
      if (isMounted) {
        setJobTitles([])
        setIsLoadingJobTitles(false)
      }
      return () => {
        isMounted = false
      }
    }

    setIsLoadingJobTitles(true)
    getAdminJobTitles(token)
      .then((data) => {
        if (!isMounted) {
          return
        }

        setJobTitles(data.items ?? [])
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingJobTitles(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, token])

  const activeJobTitles = useMemo(() => jobTitles.filter((jobTitle) => jobTitle.is_active), [jobTitles])

  useEffect(() => {
    if (!formValues.cargo) {
      return
    }

    const cargoStillAvailable = activeJobTitles.some((jobTitle) => jobTitle.name === formValues.cargo)
    if (!cargoStillAvailable) {
      setFormValues((current) => ({
        ...current,
        cargo: '',
      }))
    }
  }, [activeJobTitles, formValues.cargo])

  const isSubmitDisabled = useMemo(() => {
    if (!formValues.tipo || !formValues.cargo || !formValues.setor || !formValues.recrutamento) {
      return true
    }

    if (!formValues.posicaoVaga) {
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
    const { name, type, checked, value } = event.target
    setFormValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (successMessage) {
      setSuccessMessage('')
    }
    if (errorMessage) {
      setErrorMessage('')
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
        request_type: REQUEST_TYPE_MAP[formValues.tipo],
        posicao_vaga: formValues.posicaoVaga,
        is_confidential: formValues.isConfidential,
        cargo: formValues.cargo.trim(),
        setor: formValues.setor.trim(),
        recruitment_scope: RECRUITMENT_SCOPE_MAP[formValues.recrutamento],
        quantity_people: Number(formValues.quantidadePessoas),
        turno: formValues.turno.trim(),
        contract_regime: CONTRACT_REGIME_MAP[formValues.regimeContratacao],
        substituted_employee_name: formValues.nomeSubstituido.trim() || null,
        justification: formValues.justificativa.trim() || null,
        manager_reminder:
          formValues.tipo === 'Substituição'
            ? 'Caso seja substituição de funcionário, informe ao gestor que ele deve solicitar a demissão do substituído.'
            : null,
      }

      await createAdminAdmissionRequest(token, payload)
      setSuccessMessage('Requisição de vaga salva com sucesso.')
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
          <span className="eyebrow">Requisição de vaga</span>
          <h1>Formulário de requisição de vaga</h1>
          <p>
            Preencha os dados do novo pedido para organizar a abertura da vaga, o tipo
            de contratação e o contexto da requisição.
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
              <strong>Dados da requisição</strong>
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
                  <span>Posição da vaga</span>
                  <select name="posicaoVaga" value={formValues.posicaoVaga} onChange={handleFieldChange}>
                    <option value="">Selecione</option>
                    {POSITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="checkbox-field" style={{ marginTop: 25 }}>
                  <input
                    checked={formValues.isConfidential}
                    name="isConfidential"
                    type="checkbox"
                    onChange={handleFieldChange}
                  />
                  Vaga confidencial
                </label>

                <label className="field-group">
                  <span>Cargo</span>
                  <select
                    name="cargo"
                    value={formValues.cargo}
                    onChange={handleFieldChange}
                    disabled={isLoadingJobTitles}
                  >
                    <option value="">
                      {isLoadingJobTitles ? 'Carregando cargos...' : 'Selecione um cargo'}
                    </option>
                    {activeJobTitles.map((jobTitle) => (
                      <option key={jobTitle.id} value={jobTitle.name}>
                        {jobTitle.name}
                        {jobTitle.description ? ` - ${jobTitle.description}` : ''}
                      </option>
                    ))}
                  </select>
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
                  Caso seja substituição de funcionário, é necessario
                  solicitar a demissão do substituído.
                </p>
                <p>
                  Caso se trate de movimentação de pessoal, abrir o formulário de
                  movimentação.
                </p>
              </div>

              {!isLoadingJobTitles && activeJobTitles.length === 0 ? (
                <div className="form-error">
                  Nenhum cargo ativo foi cadastrado pelo RH. Ative um cargo antes de enviar a requisição.
                </div>
              ) : null}

              <div className="form-actions-row">
                <button className="primary-button" disabled={isSubmitDisabled || isSubmitting || !isAuthenticated || activeJobTitles.length === 0} type="submit">
                  {isSubmitting ? 'Salvando...' : 'Salvar requisição'}
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
              <h2>Fluxo da requisição de vaga</h2>
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
                <strong>Posição da vaga</strong>
                <span>{POSITION_OPTIONS.find((option) => option.value === formValues.posicaoVaga)?.label || 'Ainda não preenchido'}</span>
              </div>
              <div className="request-summary-item">
                <strong>Confidencial</strong>
                <span>{formValues.isConfidential ? 'Sim' : 'Não'}</span>
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