import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  getPublishedCampaignDetail,
  startPublishedCampaignParticipation,
  submitPublishedCampaignResponse,
} from '../services/api'
import { getCampaignAvailability } from '../utils/campaignStatus'

function formatDateLong(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(value))
}

const SCALE_LABELS = {
  1: 'Discordo totalmente',
  2: 'Discordo',
  3: 'Neutro',
  4: 'Concordo',
  5: 'Concordo totalmente',
}

const SCALE_COLORS = {
  1: { bg: '#fef2f2', border: '#fecaca', num: '#dc2626', numBg: '#fee2e2' },
  2: { bg: '#fff7ed', border: '#fed7aa', num: '#ea580c', numBg: '#ffedd5' },
  3: { bg: '#fffbeb', border: '#fde68a', num: '#d97706', numBg: '#fef3c7' },
  4: { bg: '#f0fdf4', border: '#bbf7d0', num: '#16a34a', numBg: '#dcfce7' },
  5: { bg: '#eff6ff', border: '#bfdbfe', num: '#2563eb', numBg: '#dbeafe' },
}

export function PublicCampaignPage() {
  const { campaignId } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)
  const [participation, setParticipation] = useState(null)
  const [answers, setAnswers] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [startErrorMessage, setStartErrorMessage] = useState('')
  const [submitErrorMessage, setSubmitErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availability = useMemo(
    () => (campaign ? getCampaignAvailability(campaign) : { label: 'Carregando', variant: 'inactive', isOpen: false }),
    [campaign],
  )

  const answeredCount = useMemo(() => {
    if (!participation) return 0
    return participation.questions.filter((q) => {
      const a = answers[q.id]
      if (!a) return false
      if (q.question_type === 'SCALE_1_5') return Boolean(a.numeric_answer)
      if (q.question_type === 'SINGLE_CHOICE') return Boolean(a.selected_option_id)
      return Boolean(a.text_answer?.trim())
    }).length
  }, [participation, answers])

  const progressPct = participation
    ? Math.round((answeredCount / participation.questions.length) * 100)
    : 0

  useEffect(() => {
    let isMounted = true
    getPublishedCampaignDetail(campaignId)
      .then((data) => { if (isMounted) { setCampaign(data); setErrorMessage('') } })
      .catch((error) => { if (isMounted) setErrorMessage(error.message) })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [campaignId])

  function buildInitialAnswers(participationData) {
    return participationData.answers.reduce((acc, item) => {
      acc[item.question_id] = {
        selected_option_id: item.selected_option_id ? String(item.selected_option_id) : '',
        numeric_answer: item.numeric_answer ? String(item.numeric_answer) : '',
        text_answer: item.text_answer ?? '',
      }
      return acc
    }, {})
  }

  async function handleStartParticipation(event) {
    event.preventDefault()
    setIsStarting(true)
    setStartErrorMessage('')
    try {
      const data = await startPublishedCampaignParticipation(campaignId)
      setParticipation(data)
      setAnswers(buildInitialAnswers(data))
    } catch (error) {
      setStartErrorMessage(error.message)
    } finally {
      setIsStarting(false)
    }
  }

  function handleAnswerChange(questionId, field, value) {
    setAnswers((cur) => ({ ...cur, [questionId]: { ...cur[questionId], [field]: value } }))
  }

  async function handleSubmitResponses(event) {
    event.preventDefault()
    if (!participation) return
    setIsSubmitting(true)
    setSubmitErrorMessage('')
    try {
      const payloadAnswers = participation.questions.map((question) => {
        const answer = answers[question.id] ?? {}
        return {
          question_id: question.id,
          selected_option_id: answer.selected_option_id ? Number(answer.selected_option_id) : null,
          numeric_answer: answer.numeric_answer ? Number(answer.numeric_answer) : null,
          text_answer: answer.text_answer?.trim() || null,
        }
      })
      await submitPublishedCampaignResponse(campaignId, {
        response_id: participation.response_id,
        answers: payloadAnswers,
      })
      navigate(`/campaigns/${campaignId}/thank-you`, { replace: true })
    } catch (error) {
      setSubmitErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function renderQuestionField(question) {
    const answer = answers[question.id] ?? { selected_option_id: '', numeric_answer: '', text_answer: '' }

    if (question.question_type === 'SCALE_1_5') {
      const values = Array.from(
        { length: question.scale_max - question.scale_min + 1 },
        (_, i) => question.scale_min + i,
      )
      return (
        <div className="scale-option-row">
          {values.map((value) => {
            const isSelected = answer.numeric_answer === String(value)
            const colors = SCALE_COLORS[value] || {}
            return (
              <label
                key={value}
                className={`scale-option${isSelected ? ' selected' : ''}`}
                style={isSelected ? { background: colors.bg, borderColor: colors.border } : {}}
              >
                <input
                  checked={isSelected}
                  name={`question-${question.id}`}
                  type="radio"
                  onChange={() => handleAnswerChange(question.id, 'numeric_answer', String(value))}
                />
                <span
                  className="scale-option-number"
                  style={isSelected ? { background: colors.numBg, color: colors.num, boxShadow: 'none' } : {}}
                >
                  {value}
                </span>
                <span className="scale-option-label">{SCALE_LABELS[value] ?? value}</span>
                {isSelected && (
                  <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.num} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </label>
            )
          })}
        </div>
      )
    }

    if (question.question_type === 'SINGLE_CHOICE') {
      return (
        <div className="choice-option-list">
          {question.options.map((option) => (
            <label
              key={option.id}
              className={`choice-option${answer.selected_option_id === String(option.id) ? ' selected' : ''}`}
            >
              <input
                checked={answer.selected_option_id === String(option.id)}
                name={`question-${question.id}`}
                type="radio"
                onChange={() => handleAnswerChange(question.id, 'selected_option_id', String(option.id))}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )
    }

    return (
      <textarea
        className="text-answer-field"
        placeholder="Escreva sua resposta aqui..."
        rows="4"
        value={answer.text_answer}
        onChange={(e) => handleAnswerChange(question.id, 'text_answer', e.target.value)}
      />
    )
  }

  if (isLoading) {
    return (
      <main className="collab-shell">
        <header className="collab-header">
          <div className="collab-header-inner">
            <Link className="text-muted-link" to="/">← Voltar</Link>
          </div>
        </header>
        <div className="collab-loading"><span>Carregando pesquisa...</span></div>
      </main>
    )
  }

  if (errorMessage || !campaign) {
    return (
      <main className="collab-shell">
        <header className="collab-header">
          <div className="collab-header-inner">
            <Link className="text-muted-link" to="/">← Voltar</Link>
          </div>
        </header>
        <div className="collab-content">
          <div className="form-error">{errorMessage || 'Pesquisa não encontrada.'}</div>
        </div>
      </main>
    )
  }

  return (
    <main className="collab-shell">
      <header className="collab-header">
        <div className="collab-header-inner">
          <Link className="text-muted-link" to="/">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
            Todas as pesquisas
          </Link>
          {participation && (
            <span className="collab-progress-label">
              {answeredCount} / {participation.questions.length} respondidas
            </span>
          )}
        </div>
        {participation && (
          <div className="collab-progress-bar">
            <div className="collab-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </header>

      <div className="collab-content">
        {!participation ? (
          <div className="collab-entry-card">
            <div className="collab-entry-badge-row">
              <span className={`status-pill ${availability.variant}`}>{availability.label}</span>
            </div>

            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--slate-400)', marginBottom: 6 }}>
                {campaign.survey_name}
              </p>
              <h1 className="collab-entry-title">{campaign.name}</h1>
            </div>

            <p className="collab-entry-desc">
              {campaign.description ?? 'Sua participação é importante para melhorarmos o ambiente de trabalho.'}
            </p>

            <div className="collab-entry-meta">
              <div className="collab-meta-item">
                <span className="collab-meta-label">Período</span>
                <span className="collab-meta-value">
                  {formatDateLong(campaign.start_at)} até {formatDateLong(campaign.end_at)}
                </span>
              </div>
              <div className="collab-meta-item">
                <span className="collab-meta-label">Perguntas</span>
                <span className="collab-meta-value">{campaign.total_questions} questões</span>
              </div>
              <div className="collab-meta-item">
                <span className="collab-meta-label">Privacidade</span>
                <span className="collab-meta-value">
                  Respostas 100% anônimas — nenhuma informação pessoal é coletada
                </span>
              </div>
            </div>

            {availability.isOpen ? (
              <form onSubmit={handleStartParticipation}>
                {startErrorMessage && <div className="form-error" style={{ marginBottom: 14 }}>{startErrorMessage}</div>}
                <button className="collab-start-button" disabled={isStarting} type="submit">
                  {isStarting ? (
                    <>
                      <svg width="16" height="16" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Preparando...
                    </>
                  ) : (
                    <>
                      Iniciar pesquisa
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="collab-unavailable">
                Esta pesquisa não está disponível para participação no momento.
              </div>
            )}
          </div>
        ) : (
          <form className="collab-questionnaire" onSubmit={handleSubmitResponses}>
            {/* Instrução rápida */}
            <div style={{
              padding: '14px 18px',
              borderRadius: 'var(--r-lg)',
              background: 'var(--blue-50)',
              border: '1px solid var(--blue-100)',
              fontSize: 13, color: 'var(--blue-700)', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Todas as respostas são confidenciais. Seja honesto — suas opiniões constroem um ambiente melhor.
            </div>

            {participation.questions.map((question, index) => (
              <article className="collab-question-card" key={question.id}>
                <div className="collab-question-header">
                  <span className="collab-question-num">{index + 1}</span>
                  <div className="collab-question-body">
                    <p className="collab-question-text">{question.question_text}</p>
                    {question.help_text && (
                      <p className="collab-question-hint">{question.help_text}</p>
                    )}
                  </div>
                  {question.is_required && (
                    <span
                      className="collab-required-dot"
                      title="Obrigatória"
                    />
                  )}
                </div>
                <div className="collab-question-answer">
                  {renderQuestionField(question)}
                </div>
              </article>
            ))}

            {submitErrorMessage && <div className="form-error">{submitErrorMessage}</div>}

            <div className="collab-submit-row">
              <span className="collab-submit-hint">
                {answeredCount === participation.questions.length
                  ? '✓ Todas as perguntas respondidas'
                  : `${answeredCount} de ${participation.questions.length} respondidas`}
              </span>
              <button
                className="collab-start-button"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar respostas'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}