import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { createAdminAdmissionRequest, getAdminDepartments, getAdminJobTitles } from '../services/admin'

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

const TURNO_OPTIONS = ['Comercial', '1º turno', '2º turno', '3º turno']

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

const FILLED_COUNT_FIELDS = [
  'tipo',
  'posicaoVaga',
  'cargo',
  'setor',
  'recrutamento',
  'quantidadePessoas',
  'turno',
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
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid var(--slate-100)',
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.06em', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: isEmpty ? 'var(--slate-300)' : 'var(--slate-800)',
        textAlign: 'right',
        maxWidth: '55%',
        wordBreak: 'break-word',
      }}>
        {isEmpty ? '—' : value}
      </span>
    </div>
  )
}

export function AdmissaoFormPage() {
  const { isAuthenticated, isLoading, token } = useAuth()
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [departments, setDepartments] = useState([])
  const [jobTitles, setJobTitles] = useState([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true)
  const [isLoadingJobTitles, setIsLoadingJobTitles] = useState(true)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSubstituicao = formValues.tipo === 'Substituição'
  const isAumentoQuadro = formValues.tipo === 'Aumento de quadro'

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

  const activeDepartments = useMemo(() => departments.filter((department) => department.is_active), [departments])
  const activeJobTitles = useMemo(() => jobTitles.filter((jt) => jt.is_active), [jobTitles])

  useEffect(() => {
    if (!formValues.cargo) return
    const still = activeJobTitles.some((jt) => jt.name === formValues.cargo)
    if (!still) setFormValues((cur) => ({ ...cur, cargo: '' }))
  }, [activeJobTitles, formValues.cargo])

  useEffect(() => {
    if (!formValues.setor) return
    const still = activeDepartments.some((department) => department.name === formValues.setor)
    if (!still) setFormValues((cur) => ({ ...cur, setor: '' }))
  }, [activeDepartments, formValues.setor])

  const isSubmitDisabled = useMemo(() => {
    if (!formValues.tipo || !formValues.cargo || !formValues.setor || !formValues.recrutamento) return true
    if (!formValues.posicaoVaga) return true
    if (!formValues.quantidadePessoas || Number(formValues.quantidadePessoas) < 1) return true
    if (!formValues.turno || !formValues.regimeContratacao) return true
    if (isSubstituicao && !formValues.nomeSubstituido.trim()) return true
    if (isAumentoQuadro && !formValues.justificativa.trim()) return true
    return false
  }, [formValues, isSubstituicao, isAumentoQuadro])

  function clearFeedback() {
    if (successMessage) setSuccessMessage('')
    if (errorMessage) setErrorMessage('')
  }

  function handleFieldChange(event) {
    const { name, type, checked, value } = event.target
    setFormValues((cur) => ({ ...cur, [name]: type === 'checkbox' ? checked : value }))
    clearFeedback()
  }

  function handleTipoChange(event) {
    const { value } = event.target
    setFormValues((cur) => ({
      ...cur,
      tipo: value,
      nomeSubstituido: value === 'Substituição' ? cur.nomeSubstituido : '',
      justificativa: value === 'Aumento de quadro' ? cur.justificativa : '',
    }))
    clearFeedback()
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
      setSuccessMessage('Requisição de vaga enviada com sucesso! A solicitação já está na fila de aprovação.')
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

  const posicaoLabel = POSITION_OPTIONS.find((o) => o.value === formValues.posicaoVaga)?.label
  const setorLabel = activeDepartments.find((department) => department.name === formValues.setor)?.name

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
        {/* Hero */}
        <section style={{
          padding: '28px 32px',
          borderRadius: 'var(--r-2xl)',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,.2), transparent 70%)', pointerEvents: 'none' }} />
          <span className="eyebrow" style={{ color: 'rgba(148,163,184,.9)' }}>RH · Admissão</span>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.5rem, 3vw, 2rem)', margin: '6px 0 10px' }}>Requisição de vaga</h1>
          <p style={{ color: 'rgba(203,213,225,.85)', maxWidth: '52ch', lineHeight: 1.7, margin: 0 }}>
            Preencha os dados para abrir uma nova vaga. Após enviar, a solicitação entra automaticamente no fluxo de aprovação.
          </p>
        </section>

        {/* Auth warnings */}
        {isLoading ? (
          <div className="collab-loading"><span>Verificando acesso...</span></div>
        ) : null}
        {!isLoading && !isAuthenticated ? (
          <div className="form-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Acesso administrativo necessário. Faça login no portal RH para salvar esta solicitação.
          </div>
        ) : null}

        {/* Feedback */}
        {errorMessage ? (
          <div className="form-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
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

        {/* Main layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 20, alignItems: 'start' }}>

          {/* Form sections */}
          <form id="admissao-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>

            {/* Seção 1: Tipo e posição */}
            <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '16px 20px', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--blue-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: 14, color: 'var(--slate-800)' }}>Tipo e posição</strong>
                  <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Defina o contexto da abertura da vaga</span>
                </div>
              </div>
              <div style={{ padding: '20px', display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label className="field-group">
                    <span>Tipo de requisição</span>
                    <select name="tipo" value={formValues.tipo} onChange={handleTipoChange}>
                      <option value="">Selecione o tipo</option>
                      {TIPO_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>

                  <label className="field-group">
                    <span>Posição da vaga</span>
                    <select name="posicaoVaga" value={formValues.posicaoVaga} onChange={handleFieldChange}>
                      <option value="">Selecione a posição</option>
                      {POSITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Toggle confidencial */}
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  alignSelf: 'flex-start',
                  padding: '10px 14px',
                  borderRadius: 999,
                  border: formValues.isConfidential ? '1.5px solid var(--blue-300)' : '1.5px solid var(--slate-200)',
                  background: formValues.isConfidential ? 'var(--blue-50)' : 'var(--color-surface)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all .16s ease',
                }}>
                  <input
                    checked={formValues.isConfidential}
                    name="isConfidential"
                    type="checkbox"
                    onChange={handleFieldChange}
                    style={{ width: 15, height: 15, accentColor: 'var(--blue-600)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600, color: formValues.isConfidential ? 'var(--blue-700)' : 'var(--slate-600)' }}>
                    Vaga confidencial
                  </span>
                  {formValues.isConfidential ? (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--blue-100)', color: 'var(--blue-800)', fontWeight: 700 }}>
                      Ativo
                    </span>
                  ) : null}
                </label>

                {/* Campos condicionais de tipo */}
                {isSubstituicao ? (
                  <label className="field-group" style={{ animation: 'fadeUp .2s ease both' }}>
                    <span>Nome do colaborador substituído</span>
                    <input
                      name="nomeSubstituido"
                      placeholder="Nome completo do colaborador"
                      value={formValues.nomeSubstituido}
                      onChange={handleFieldChange}
                    />
                  </label>
                ) : null}

                {isAumentoQuadro ? (
                  <label className="field-group" style={{ animation: 'fadeUp .2s ease both' }}>
                    <span>Justificativa para aumento de quadro</span>
                    <textarea
                      name="justificativa"
                      rows="3"
                      placeholder="Descreva a necessidade e o contexto da abertura"
                      value={formValues.justificativa}
                      onChange={handleFieldChange}
                    />
                  </label>
                ) : null}
              </div>
            </section>

            {/* Seção 2: Cargo e setor */}
            <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '16px 20px', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--amber-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: 14, color: 'var(--slate-800)' }}>Cargo e setor</strong>
                  <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Onde a vaga será alocada</span>
                </div>
              </div>
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
                  <span>Setor</span>
                  <select
                    name="setor"
                    value={formValues.setor}
                    onChange={handleFieldChange}
                    disabled={isLoadingDepartments}
                  >
                    <option value="">
                      {isLoadingDepartments ? 'Carregando departamentos...' : 'Selecione um setor'}
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
              </div>
            </section>

            {/* Seção 3: Detalhes da contratação */}
            <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '16px 20px', background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-100)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/>
                  </svg>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: 14, color: 'var(--slate-800)' }}>Detalhes da contratação</strong>
                  <span style={{ fontSize: 12, color: 'var(--slate-500)' }}>Escopo, quantidade, turno e regime</span>
                </div>
              </div>
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label className="field-group">
                  <span>Escopo do recrutamento</span>
                  <select name="recrutamento" value={formValues.recrutamento} onChange={handleFieldChange}>
                    <option value="">Selecione</option>
                    {RECRUTAMENTO_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Quantidade de vagas</span>
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
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Regime de contratação</span>
                  <select name="regimeContratacao" value={formValues.regimeContratacao} onChange={handleFieldChange}>
                    <option value="">Selecione</option>
                    {REGIME_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            {/* Aviso */}
            <div style={{
              display: 'flex',
              gap: 12,
              padding: '14px 16px',
              borderRadius: 'var(--r-lg)',
              border: '1px solid var(--amber-200)',
              background: 'var(--amber-50)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <strong style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--amber-800)', marginBottom: 4 }}>Lembrete</strong>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--amber-900)', lineHeight: 1.6 }}>
                  Em caso de substituição, solicite também o desligamento do colaborador substituído.
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--amber-900)', lineHeight: 1.6 }}>
                  Movimentações internas de pessoal devem ser feitas pelo formulário específico.
                </p>
              </div>
            </div>

            {/* Botões */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                className="primary-button"
                disabled={isSubmitDisabled || isSubmitting || !isAuthenticated || activeJobTitles.length === 0}
                type="submit"
                style={{ minWidth: 180, padding: '13px 20px', fontSize: 15 }}
              >
                {isSubmitting ? (
                  <>
                    <svg width="14" height="14" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Enviando...
                  </>
                ) : 'Enviar requisição'}
              </button>
              <button className="secondary-button" type="button" onClick={handleReset}>
                Limpar formulário
              </button>
            </div>
          </form>

          {/* Painel lateral sticky */}
          <div style={{ display: 'grid', gap: 14, position: 'sticky', top: 80 }}>
            {/* Progresso */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--r-xl)', padding: '18px 16px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Progresso</p>
              <ProgressBar form={formValues} />
            </div>

            {/* Resumo */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--r-xl)', padding: '18px 16px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Resumo da vaga</p>
              <SummaryRow label="Tipo" value={formValues.tipo} />
              <SummaryRow label="Posição" value={posicaoLabel} />
              <SummaryRow label="Confidencial" value={formValues.isConfidential ? 'Sim' : 'Não'} />
              <SummaryRow label="Cargo" value={formValues.cargo} />
              <SummaryRow label="Setor" value={setorLabel ?? formValues.setor} />
              <SummaryRow label="Recrutamento" value={formValues.recrutamento} />
              <SummaryRow label="Vagas" value={formValues.quantidadePessoas} />
              <SummaryRow label="Turno" value={formValues.turno} />
              <SummaryRow label="Regime" value={formValues.regimeContratacao} />
            </div>

            {/* Fluxo de aprovação */}
            <div style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 'var(--r-xl)', padding: '16px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: 'var(--blue-700)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Próximas etapas</p>
              {[
                { label: 'Envio da requisição', desc: 'Você está aqui' },
                { label: 'Aprovação do gestor', desc: 'Gerente e diretor' },
                { label: 'Aprovação do RH', desc: 'Gerente de RH' },
                { label: 'Recrutamento', desc: 'Analista de RH' },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 3 ? 10 : 0 }}>
                  <div style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                    background: i === 0 ? 'var(--blue-600)' : 'var(--blue-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                    color: i === 0 ? '#fff' : 'var(--blue-500)',
                  }}>{i + 1}</div>
                  <div>
                    <strong style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--blue-900)' }}>{step.label}</strong>
                    <span style={{ fontSize: 12, color: 'var(--blue-600)' }}>{step.desc}</span>
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
