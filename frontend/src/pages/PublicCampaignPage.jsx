import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  getPublishedCampaignDetail,
  startPublishedCampaignParticipation,
  submitPublishedCampaignResponse,
} from '../services/api'
import { getCampaignAvailability } from '../utils/campaignStatus'

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
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
    if (!participation) {
      return
    }

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

      const result = await submitPublishedCampaignResponse(campaignId, {
        response_id: participation.response_id,
        answers: payloadAnswers,
      })

      setParticipation((current) => (current ? { ...current, status: result.status } : current))
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
        <div className="question-options-grid">
          {values.map((value) => (
            <label className="checkbox-field public-option-chip" key={value}>
              <input
                checked={answer.numeric_answer === String(value)}
                name={`question-${question.id}`}
                type="radio"
                onChange={() => handleAnswerChange(question.id, 'numeric_answer', String(value))}
              />
              <span>{value}</span>
            </label>
          ))}
        </div>
      )
    }

    if (question.question_type === 'SINGLE_CHOICE') {
      return (
        <div className="question-options-grid single-choice-grid">
          {question.options.map((option) => (
            <label className="checkbox-field public-option-chip" key={option.id}>
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
        rows="4"
        value={answer.text_answer}
        onChange={(event) => handleAnswerChange(question.id, 'text_answer', event.target.value)}
      />
    )
  }

  return (
    <main className="page-shell">
      <div className="public-home-layout">
        <section className="hero-card public-hero-card">
          <Link className="back-link" to="/">
            Voltar para campanhas
          </Link>

          {isLoading ? (
            <div className="public-empty-state">
              <strong>Carregando campanha...</strong>
            </div>
          ) : errorMessage ? (
            <div className="form-error">{errorMessage}</div>
          ) : campaign ? (
            <>
              <span className="eyebrow">Entrada da Campanha</span>
              <h1>{campaign.name}</h1>
              <p>
                Esta e a porta de entrada da jornada do colaborador. O inicio da
                participacao acontece sem identificacao explicita nesta fase.
              </p>

              <div className="public-hero-metrics">
                <article className="public-metric-card">
                  <span>Status</span>
                  <strong>{availability.label}</strong>
                </article>
                <article className="public-metric-card">
                  <span>Perguntas nesta versao</span>
                  <strong>{campaign.total_questions}</strong>
                </article>
              </div>

              <div className="public-campaign-meta public-detail-meta">
                <span>Pesquisa: {campaign.survey_name}</span>
                <span>Categoria: {campaign.survey_category}</span>
                <span>Versao: {campaign.version_title}</span>
                <span>Publico-alvo: {campaign.audience_count} colaborador(es)</span>
                <span>Anonima: Sim</span>
                <span>Permite rascunho: {campaign.allows_draft ? 'Sim' : 'Nao'}</span>
              </div>

              <div className="public-campaign-dates public-detail-dates">
                <span>Publicada em {formatDate(campaign.published_at)}</span>
                <span>Inicio: {formatDate(campaign.start_at)}</span>
                <span>Fim: {formatDate(campaign.end_at)}</span>
              </div>

              <section className="public-campaigns-panel public-detail-panel">
                <h2>Sobre esta campanha</h2>
                <p>{campaign.description ?? 'Campanha publicada sem descricao adicional.'}</p>
                <p>{campaign.version_description ?? 'A versao atual ainda nao possui uma descricao detalhada.'}</p>
                <p>As respostas desta campanha sao tratadas como anonimas nesta fase do produto.</p>

                {availability.isOpen ? (
                  <form className="survey-create-form" onSubmit={handleStartParticipation}>
                    {startErrorMessage ? <div className="form-error">{startErrorMessage}</div> : null}

                    <div className="form-actions-row public-detail-actions">
                      <button className="primary-button" disabled={isStarting} type="submit">
                        {isStarting ? 'Carregando questionario...' : 'Iniciar participacao'}
                      </button>
                      <span className="public-action-hint">
                        Nenhum dado de identificacao e solicitado do colaborador neste fluxo.
                      </span>
                    </div>
                  </form>
                ) : (
                  <div className="public-empty-state">
                    <strong>Campanha indisponivel para participacao</strong>
                    <span>O periodo atual desta campanha nao permite iniciar respostas.</span>
                  </div>
                )}
              </section>

              {participation ? (
                <section className="public-campaigns-panel public-questionnaire-panel">
                  <div className="panel-header-row">
                    <div>
                      <h2>Questionario</h2>
                      <p>Identidade ocultada. Respostas anonimas em processamento.</p>
                    </div>
                  </div>

                  {submitErrorMessage ? <div className="form-error">{submitErrorMessage}</div> : null}

                  <form className="survey-create-form" onSubmit={handleSubmitResponses}>
                    {participation.questions.map((question) => (
                      <article className="public-question-card" key={question.id}>
                        <div className="public-question-header">
                          <strong>
                            {question.display_order}. {question.question_text}
                          </strong>
                          {question.is_required ? <span className="public-required-badge">Obrigatoria</span> : null}
                        </div>
                        {question.help_text ? <p>{question.help_text}</p> : null}
                        {renderQuestionField(question)}
                      </article>
                    ))}

                    <div className="form-actions-row public-detail-actions">
                      <button
                        className="primary-button"
                        disabled={isSubmitting || participation.status === 'SUBMITTED'}
                        type="submit"
                      >
                        {participation.status === 'SUBMITTED'
                          ? 'Questionario enviado'
                          : isSubmitting
                            ? 'Enviando respostas...'
                            : 'Enviar respostas'}
                      </button>
                    </div>
                  </form>
                </section>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </main>
  )
}