import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  getPublishedCampaignDetail,
  startPublishedCampaignParticipation,
  submitPublishedCampaignResponse,
} from '../services/api'
import { getCampaignAvailability } from '../utils/campaignStatus'

function formatDateShort(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(value))
}

const SCALE_LABELS = {
  1: 'Discordo totalmente',
  2: 'Discordo',
  3: 'Neutro',
  4: 'Concordo',
  5: 'Concordo totalmente',
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

  useEffect(() => {
    let isMounted = true

    getPublishedCampaignDetail(campaignId)
      .then((data) => {
        if (isMounted) {
          setCampaign(data)
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
  }, [campaignId])

  function buildInitialAnswers(participationData) {
    return participationData.answers.reduce((accumulator, item) => {
      accumulator[item.question_id] = {
        selected_option_id: item.selected_option_id ? String(item.selected_option_id) : '',
        numeric_answer: item.numeric_answer ? String(item.numeric_answer) : '',
        text_answer: item.text_answer ?? '',
      }
      return accumulator
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
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        ...current[questionId],
        [field]: value,
      },
    }))
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
          text_answer: answer.text_answer?.trim() ? answer.text_answer.trim() : null,
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
    const answer = answers[question.id] ?? {
      selected_option_id: '',
      numeric_answer: '',
      text_answer: '',
    }

    if (question.question_type === 'SCALE_1_5') {
      const values = Array.from(
        { length: question.scale_max - question.scale_min + 1 },
        (_, index) => question.scale_min + index,
      )

      return (
        <div className="scale-option-row">
          {values.map((value) => (
            <label
              key={value}
              className={`scale-option${answer.numeric_answer === String(value) ? ' selected' : ''}`}
            >
              <input
                checked={answer.numeric_answer === String(value)}
                name={`question-${question.id}`}
                type="radio"
                onChange={() => handleAnswerChange(question.id, 'numeric_answer', String(value))}
              />
              <span className="scale-option-number">{value}</span>
              <span className="scale-option-label">{SCALE_LABELS[value] ?? value}</span>
            </label>
          ))}
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
        onChange={(event) => handleAnswerChange(question.id, 'text_answer', event.target.value)}
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
          <div className="form-error">{errorMessage || 'Pesquisa nao encontrada.'}</div>
        </div>
      </main>
    )
  }

  return (
    <main className="collab-shell">
      <header className="collab-header">
        <div className="collab-header-inner">
          <Link className="text-muted-link" to="/">← Todas as pesquisas</Link>
          {participation ? (
            <span className="collab-progress-label">
              {answeredCount} de {participation.questions.length} respondidas
            </span>
          ) : null}
        </div>
        {participation ? (
          <div className="collab-progress-bar">
            <div
              className="collab-progress-fill"
              style={{ width: `${(answeredCount / participation.questions.length) * 100}%` }}
            />
          </div>
        ) : null}
      </header>

      <div className="collab-content">
        {!participation ? (
          <div className="collab-entry-card">
            <div className="collab-entry-badge-row">
              <span className={`status-pill ${availability.variant}`}>{availability.label}</span>
            </div>
            <h1 className="collab-entry-title">{campaign.survey_name}</h1>
            <p className="collab-entry-desc">
              {campaign.description ?? 'Sua participacao e importante para melhorarmos o ambiente de trabalho.'}
            </p>

            <div className="collab-entry-meta">
              <div className="collab-meta-item">
                <span className="collab-meta-label">Periodo</span>
                <span className="collab-meta-value">{formatDateShort(campaign.start_at)} ate {formatDateShort(campaign.end_at)}</span>
              </div>
              <div className="collab-meta-item">
                <span className="collab-meta-label">Perguntas</span>
                <span className="collab-meta-value">{campaign.total_questions}</span>
              </div>
              <div className="collab-meta-item">
                <span className="collab-meta-label">Anonimato</span>
                <span className="collab-meta-value">Suas respostas sao anonimas</span>
              </div>
            </div>

            {availability.isOpen ? (
              <form onSubmit={handleStartParticipation}>
                {startErrorMessage ? <div className="form-error" style={{ marginBottom: 14 }}>{startErrorMessage}</div> : null}
                <button className="collab-start-button" disabled={isStarting} type="submit">
                  {isStarting ? 'Preparando...' : 'Iniciar pesquisa'}
                </button>
              </form>
            ) : (
              <div className="collab-unavailable">
                Esta pesquisa nao esta disponivel para participacao no momento.
              </div>
            )}
          </div>
        ) : (
          <form className="collab-questionnaire" onSubmit={handleSubmitResponses}>
            {participation.questions.map((question, index) => (
              <article className="collab-question-card" key={question.id}>
                <div className="collab-question-header">
                  <span className="collab-question-num">{index + 1}</span>
                  <div className="collab-question-body">
                    <p className="collab-question-text">{question.question_text}</p>
                    {question.help_text ? (
                      <p className="collab-question-hint">{question.help_text}</p>
                    ) : null}
                  </div>
                  {question.is_required ? <span className="collab-required-dot" title="Obrigatoria" /> : null}
                </div>
                <div className="collab-question-answer">
                  {renderQuestionField(question)}
                </div>
              </article>
            ))}

            {submitErrorMessage ? <div className="form-error">{submitErrorMessage}</div> : null}

            <div className="collab-submit-row">
              <span className="collab-submit-hint">{answeredCount} de {participation.questions.length} respondidas</span>
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
