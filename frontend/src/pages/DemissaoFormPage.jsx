import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { createAdminDismissalRequest, getAdminDepartments, getAdminJobTitles } from '../services/admin'
import { canCreateRequests } from '../utils/accessControl'

const INITIAL_FORM = {
  nome: '',
  cargo: '',
  departamento: '',
  tipo: '',
  substituicao: '',
  podeSerRecontratada: '',
  justificativaRecontratacao: '',
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

const BOOLEAN_OPTIONS = ['Sim', 'Não']

const DISMISSAL_TYPE_MAP = {
  'Justa causa': 'JUST_CAUSE',
  'Pedido de demissão': 'RESIGNATION',
  'Dispensa sem justa causa': 'WITHOUT_JUST_CAUSE',
  'Término de contrato': 'TERM_CONTRACT',
  'Demissão consensual': 'CONSENSUAL',
}

const CONTRACT_REGIME_MAP = {
  'Temporário': 'TEMPORARY',
  'Efetivo': 'EFFECTIVE',
  'Estagiário': 'INTERN',
  'Aprendiz': 'APPRENTICE',
  CLT: 'CLT',
  PJ: 'PJ',
}

const FILLED_COUNT_FIELDS = [
  'nome',
  'cargo',
  'departamento',
  'tipo',
  'substituicao',
  'podeSerRecontratada',
  'dataDesligamento',
  'regimeContratacao',
]

function ProgressBar({ form }) {
  const filled = FILLED_COUNT_FIELDS.filter((key) => form[key] && String(form[key]).trim() !== '').length
  const pct = Math.round((filled / FILLED_COUNT_FIELDS.length) * 100)
  const color = pct === 100 ? 'var(--green-600)' : pct >= 50 ? 'var(--blue-600)' : 'var(--amber-500)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 'var(--r-lg)', background: 'var(--slate-50)', border: '1px solid var(--slate-200)' }}>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--slate-200)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width .4s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>
        {filled}/{FILLED_COUNT_FIELDS.length}
      </span>
      <span style={{ fontSize: 12, color: 'var(--slate-400)', fontWeight: 500 }}>campos</span>
    </div>
  )
}

function SummaryRow({ label, value }) {
  const isEmpty = !value || value === 'Ainda não preenchido'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--slate-100)',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.06em', flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: isEmpty ? 'var(--slate-300)' : 'var(--slate-800)',
          textAlign: 'right',
          maxWidth: '55%',
          wordBreak: 'break-word',
        }}
      >
        {isEmpty ? '—' : value}
      </span>
    </div>
  )
}

export function DemissaoFormPage() {
  const { isAuthenticated, isLoading, token, user } = useAuth()
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [departments, setDepartments] = useState([])
  const [jobTitles, setJobTitles] = useState([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true)
  const [isLoadingJobTitles, setIsLoadingJobTitles] = useState(true)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const requiresRehireJustification = formValues.podeSerRecontratada === 'Não'
  const activeDepartments = useMemo(() => departments.filter((department) => department.is_active), [departments])
  const activeJobTitles = useMemo(() => jobTitles.filter((jt) => jt.is_active), [jobTitles])

  useEffect(() => {
    let isMounted = true

    if (!token || !isAuthenticated) {
      if (isMounted) {
        setDepartments([])
        setIsLoadingDepartments(false)
        setJobTitles([])
        setIsLoadingJobTitles(false)
      }
      return () => { isMounted = false }
    }

    setIsLoadingDepartments(true)
    getAdminDepartments(token)
      .then((data) => {
        if (!isMounted) return
        setDepartments(data.items ?? [])
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error.message)
      })
      .finally(() => {
        if (isMounted) setIsLoadingDepartments(false)
      })

    setIsLoadingJobTitles(true)
    getAdminJobTitles(token)
      .then((data) => {
        if (!isMounted) return
        setJobTitles(data.items ?? [])
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error.message)
      })
      .finally(() => {
        if (isMounted) setIsLoadingJobTitles(false)
      })

    return () => { isMounted = false }
  }, [isAuthenticated, token])

  useEffect(() => {
    if (!formValues.cargo) return
    const still = activeJobTitles.some((jt) => jt.name === formValues.cargo)
    if (!still) setFormValues((current) => ({ ...current, cargo: '' }))
  }, [activeJobTitles, formValues.cargo])

  useEffect(() => {
    if (!formValues.departamento) return
    const still = activeDepartments.some((department) => department.name === formValues.departamento)
    if (!still) setFormValues((current) => ({ ...current, departamento: '' }))
  }, [activeDepartments, formValues.departamento])

  const isSubmitDisabled = useMemo(() => {
    const requiredFields = [
      formValues.nome,
      formValues.cargo,
      formValues.departamento,
      formValues.tipo,
      formValues.substituicao,
      formValues.podeSerRecontratada,
      formValues.dataDesligamento,
      formValues.regimeContratacao,
    ]

    if (requiredFields.some((value) => value.trim().length === 0)) {
      return true
    }

    if (requiresRehireJustification) {
      return formValues.justificativaRecontratacao.trim().length === 0
    }

    return false
  }, [formValues, requiresRehireJustification])

  function clearFeedback() {
    if (successMessage) setSuccessMessage('')
    if (errorMessage) setErrorMessage('')
  }

  function handleFieldChange(event) {
    const { name, value } = event.target
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }))
    clearFeedback()
  }

  function handleRehireChange(event) {
    const { value } = event.target
    setFormValues((current) => ({
      ...current,
      podeSerRecontratada: value,
      justificativaRecontratacao: value === 'Sim' ? '' : current.justificativaRecontratacao,
    }))
    clearFeedback()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!token || !isAuthenticated) {
      setErrorMessage('Você precisa estar autenticado no portal administrativo para salvar esta solicitação.')
      return
    }
    if (!canCreateRequests(user)) {
      setErrorMessage('Seu perfil não possui permissão para abrir solicitações.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const payload = {
        employee_name: formValues.nome.trim(),
        cargo: formValues.cargo.trim(),
        departamento: formValues.departamento.trim(),
        dismissal_type: DISMISSAL_TYPE_MAP[formValues.tipo],
        has_replacement: formValues.substituicao === 'Sim',
        can_be_rehired: formValues.podeSerRecontratada === 'Sim',
        rehire_justification: requiresRehireJustification
          ? formValues.justificativaRecontratacao.trim()
          : null,
        estimated_termination_date: formValues.dataDesligamento,
        contract_regime: CONTRACT_REGIME_MAP[formValues.regimeContratacao],
      }

      await createAdminDismissalRequest(token, payload)
      setSuccessMessage('Solicitação de demissão enviada com sucesso! O pedido já entrou na fila de aprovação.')
      setFormValues(INITIAL_FORM)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleReset() {
    setFormValues(INITIAL_FORM)
    setSuccessMessage('')
    setErrorMessage('')
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
          <span className="collab-brand">Recursos Humanos</span>
        </div>
      </header>

      <div className="collab-content" style={{ maxWidth: 960 }}>
        <section
          style={{
            padding: '28px 32px',
            borderRadius: 'var(--r-2xl)',
            background: 'linear-gradient(135deg, #111827 0%, #7c2d12 55%, #b45309 100%)',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,.2), transparent 70%)', pointerEvents: 'none' }} />
          <span className="eyebrow" style={{ color: 'rgba(254,215,170,.92)' }}>RH · Demissão</span>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 3vw, 2rem)', margin: '6px 0 10px' }}>Solicitação de desligamento</h1>
          <p style={{ color: 'rgba(255,237,213,.88)', maxWidth: '54ch', lineHeight: 1.7, margin: 0 }}>
            Registre o pedido de desligamento com os dados essenciais para iniciar o fluxo de aprovação e preparar a transição da posição.
          </p>
        </section>

        {isLoading ? (
          <div className="collab-loading"><span>Verificando acesso...</span></div>
        ) : null}
        {!isLoading && !isAuthenticated ? (
          <div className="form-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Acesso administrativo necessário. Faça login no portal RH para salvar esta solicitação.
          </div>
        ) : null}
        {!isLoading && isAuthenticated && !canCreateRequests(user) ? (
          <div className="form-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Seu perfil não possui permissão para abrir solicitações.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="form-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="form-success" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {successMessage}
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 20, alignItems: 'start' }}>
          <form id="demissao-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '16px 20px', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--amber-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: 14, color: 'var(--slate-800)' }}>Colaborador e vínculo</strong>
                  <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Identifique quem será desligado e o vínculo atual</span>
                </div>
              </div>
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label className="field-group">
                  <span>Nome do colaborador</span>
                  <input
                    name="nome"
                    placeholder="Nome completo do colaborador"
                    value={formValues.nome}
                    onChange={handleFieldChange}
                  />
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
                    {activeJobTitles.map((jt) => (
                      <option key={jt.id} value={jt.name}>
                        {jt.name}{jt.description ? ` — ${jt.description}` : ''}
                      </option>
                    ))}
                  </select>
                  {!isLoadingJobTitles && activeJobTitles.length === 0 ? (
                    <span style={{ color: 'var(--red-600)', fontSize: 12, marginTop: 2 }}>
                      Nenhum cargo ativo cadastrado pelo RH.
                    </span>
                  ) : null}
                </label>

                <label className="field-group">
                  <span>Departamento</span>
                  <select
                    name="departamento"
                    value={formValues.departamento}
                    onChange={handleFieldChange}
                    disabled={isLoadingDepartments}
                  >
                    <option value="">
                      {isLoadingDepartments ? 'Carregando departamentos...' : 'Selecione um departamento'}
                    </option>
                    {activeDepartments.map((department) => (
                      <option key={department.id} value={department.name}>
                        {department.name}{department.code ? ` — ${department.code}` : ''}
                      </option>
                    ))}
                  </select>
                  {!isLoadingDepartments && activeDepartments.length === 0 ? (
                    <span style={{ color: 'var(--red-600)', fontSize: 12, marginTop: 2 }}>
                      Nenhum departamento ativo cadastrado pelo RH.
                    </span>
                  ) : null}
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
            </section>

            <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '16px 20px', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--red-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: 14, color: 'var(--slate-800)' }}>Motivo e continuidade</strong>
                  <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Defina o tipo de desligamento e o plano para a posição</span>
                </div>
              </div>
              <div style={{ padding: '20px', display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label className="field-group">
                    <span>Tipo de desligamento</span>
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
                    <span>Data estimada do desligamento</span>
                    <input
                      name="dataDesligamento"
                      type="date"
                      value={formValues.dataDesligamento}
                      onChange={handleFieldChange}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label className="field-group">
                    <span>Haverá substituição?</span>
                    <select name="substituicao" value={formValues.substituicao} onChange={handleFieldChange}>
                      <option value="">Selecione</option>
                      {BOOLEAN_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  <label className="field-group">
                    <span>Pode ser recontratada no futuro?</span>
                    <select name="podeSerRecontratada" value={formValues.podeSerRecontratada} onChange={handleRehireChange}>
                      <option value="">Selecione</option>
                      {BOOLEAN_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {requiresRehireJustification ? (
                  <label className="field-group" style={{ animation: 'fadeUp .2s ease both' }}>
                    <span>Justificativa para bloquear recontratação</span>
                    <textarea
                      name="justificativaRecontratacao"
                      rows="3"
                      placeholder="Explique por que o colaborador não poderá ser recontratado futuramente"
                      value={formValues.justificativaRecontratacao}
                      onChange={handleFieldChange}
                    />
                  </label>
                ) : null}
              </div>
            </section>

            <div
              style={{
                display: 'flex',
                gap: 12,
                padding: '14px 16px',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--amber-200)',
                background: 'var(--amber-50)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <strong style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--amber-800)', marginBottom: 4 }}>Lembrete</strong>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--amber-900)', lineHeight: 1.6 }}>
                  Se houver reposição da posição, o fluxo de nova vaga deve ser aberto separadamente pelo formulário de requisição de vaga.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                className="primary-button"
                disabled={isSubmitDisabled || isSubmitting || !isAuthenticated || !canCreateRequests(user) || activeJobTitles.length === 0 || activeDepartments.length === 0}
                type="submit"
                style={{ minWidth: 180, padding: '13px 20px', fontSize: 15 }}
              >
                {isSubmitting ? (
                  <>
                    <svg width="14" height="14" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Enviando...
                  </>
                ) : 'Enviar solicitação'}
              </button>
              <button className="secondary-button" type="button" onClick={handleReset}>
                Limpar formulário
              </button>
            </div>
          </form>

          <div style={{ display: 'grid', gap: 14, position: 'sticky', top: 80 }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--r-xl)', padding: '18px 16px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Progresso</p>
              <ProgressBar form={formValues} />
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--r-xl)', padding: '18px 16px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Resumo do desligamento</p>
              <SummaryRow label="Nome" value={formValues.nome} />
              <SummaryRow label="Cargo" value={formValues.cargo} />
              <SummaryRow label="Departamento" value={formValues.departamento} />
              <SummaryRow label="Tipo" value={formValues.tipo} />
              <SummaryRow label="Substituição" value={formValues.substituicao} />
              <SummaryRow label="Recontratação" value={formValues.podeSerRecontratada} />
              <SummaryRow label="Data" value={formValues.dataDesligamento} />
              <SummaryRow label="Regime" value={formValues.regimeContratacao} />
            </div>

            <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-100)', borderRadius: 'var(--r-xl)', padding: '16px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: 'var(--amber-800)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Próximas etapas</p>
              {[
                { label: 'Envio da solicitação', desc: 'Você está aqui' },
                { label: 'Validação da liderança', desc: 'Confirmação do desligamento' },
                { label: 'Aprovação do RH', desc: 'Análise operacional e jurídica' },
                { label: 'Execução do processo', desc: 'Encerramento e transição' },
              ].map((step, index) => (
                <div key={step.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: index < 3 ? 10 : 0 }}>
                  <div
                    style={{
                      flexShrink: 0,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: index === 0 ? 'var(--amber-600)' : 'var(--amber-100)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      color: index === 0 ? '#fff' : 'var(--amber-700)',
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--amber-950)' }}>{step.label}</strong>
                    <span style={{ fontSize: 12, color: 'var(--amber-700)' }}>{step.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
