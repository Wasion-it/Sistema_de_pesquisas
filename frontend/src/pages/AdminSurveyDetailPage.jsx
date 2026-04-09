import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import {
  createSurveyDimension,
  createSurveyQuestion,
  deleteSurveyDimension,
  deleteSurveyQuestion,
  getAdminSurveyDetail,
  publishAdminSurvey,
  updateAdminSurvey,
  updateSurveyDimension,
  updateSurveyQuestion,
} from '../services/admin'

const INITIAL_METADATA_FORM = {
  name: '',
  description: '',
  category: '',
  isActive: true,
  versionTitle: '',
  versionDescription: '',
}

const INITIAL_QUESTION_FORM = {
  id: null,
  code: '',
  questionText: '',
  helpText: '',
  questionType: 'SCALE_1_5',
  dimensionId: '',
  isRequired: true,
  displayOrder: '',
  scaleMin: 1,
  scaleMax: 5,
  scoreWeight: 1,
  isNegative: false,
  allowComment: false,
  isActive: true,
  optionsText: '',
}

const INITIAL_DIMENSION_FORM = {
  id: null,
  name: '',
  description: '',
  isActive: true,
}

const INITIAL_PUBLISH_FORM = {
  startAt: '',
  endAt: '',
}

function buildQuestionForm(question) {
  if (!question) {
    return INITIAL_QUESTION_FORM
  }

  return {
    id: question.id,
    code: question.code,
    questionText: question.question_text,
    helpText: question.help_text ?? '',
    questionType: question.question_type,
    dimensionId: question.dimension_id ? String(question.dimension_id) : '',
    isRequired: question.is_required,
    displayOrder: String(question.display_order),
    scaleMin: question.scale_min ?? 1,
    scaleMax: question.scale_max ?? 5,
    scoreWeight: question.score_weight ?? 1,
    isNegative: question.is_negative ?? false,
    allowComment: question.allow_comment,
    isActive: question.is_active,
    optionsText: (question.options ?? []).map((option) => option.label).join('\n'),
  }
}

function buildOptionValue(label, usedValues, index) {
  const normalizedBase = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  const fallbackBase = normalizedBase || `OPTION_${index + 1}`
  let candidate = fallbackBase
  let suffix = 2

  while (usedValues.has(candidate)) {
    candidate = `${fallbackBase}_${suffix}`
    suffix += 1
  }

  usedValues.add(candidate)
  return candidate
}

function parseOptions(optionsText, existingOptions = []) {
  const existingByLabel = new Map(
    existingOptions.map((option) => [option.label.trim().toLowerCase(), option]),
  )
  const usedValues = new Set(
    existingOptions
      .map((option) => option.value?.trim().toUpperCase())
      .filter(Boolean),
  )

  return optionsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label, index) => {
      const existingOption = existingByLabel.get(label.toLowerCase())

      if (existingOption) {
        usedValues.add(existingOption.value.trim().toUpperCase())
        return {
          label,
          value: existingOption.value,
          score_value: existingOption.score_value,
        }
      }

      return {
        label,
        value: buildOptionValue(label, usedValues, index),
        score_value: null,
      }
    })
}

function buildMetadataForm(data) {
  return {
    name: data.name,
    description: data.description ?? '',
    category: data.category,
    isActive: data.is_active,
    versionTitle: data.current_version?.title ?? '',
    versionDescription: data.current_version?.description ?? '',
  }
}

function buildDimensionForm(dimension) {
  if (!dimension) {
    return INITIAL_DIMENSION_FORM
  }

  return {
    id: dimension.id,
    name: dimension.name,
    description: dimension.description ?? '',
    isActive: dimension.is_active,
  }
}

export function AdminSurveyDetailPage() {
  const { surveyId } = useParams()
  const { token } = useAuth()
  const [survey, setSurvey] = useState(null)
  const [metadataForm, setMetadataForm] = useState(INITIAL_METADATA_FORM)
  const [questionForm, setQuestionForm] = useState(INITIAL_QUESTION_FORM)
  const [dimensionForm, setDimensionForm] = useState(INITIAL_DIMENSION_FORM)
  const [publishForm, setPublishForm] = useState(INITIAL_PUBLISH_FORM)
  const [activeTab, setActiveTab] = useState('pesquisa')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSavingMetadata, setIsSavingMetadata] = useState(false)
  const [isSavingDimension, setIsSavingDimension] = useState(false)
  const [isSavingQuestion, setIsSavingQuestion] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadSurvey() {
      try {
        const data = await getAdminSurveyDetail(token, surveyId)

        if (!isMounted) {
          return
        }

        setSurvey(data)
        setMetadataForm(buildMetadataForm(data))
        setErrorMessage('')
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSurvey()

    return () => {
      isMounted = false
    }
  }, [surveyId, token])

  const questions = useMemo(() => survey?.current_version?.questions ?? [], [survey])
  const dimensions = useMemo(() => survey?.dimensions ?? [], [survey])
  const dimensionMap = useMemo(
    () => new Map(dimensions.map((dimension) => [dimension.id, dimension])),
    [dimensions],
  )
  const campaigns = useMemo(() => survey?.campaigns ?? [], [survey])
  const hasDates = Boolean(publishForm.startAt && publishForm.endAt)
  const hasValidDateRange = hasDates && new Date(publishForm.endAt) >= new Date(publishForm.startAt)
  const canPublish = hasDates && hasValidDateRange

  function applySurveyUpdate(data, successText) {
    setSurvey(data)
    setMetadataForm(buildMetadataForm(data))
    setSuccessMessage(successText)
    setErrorMessage('')
  }

  function handleMetadataChange(event) {
    const { name, value, type, checked } = event.target
    setMetadataForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleQuestionFieldChange(event) {
    const { name, value, type, checked } = event.target
    setQuestionForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleDimensionFieldChange(event) {
    const { name, value, type, checked } = event.target
    setDimensionForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handlePublishFieldChange(event) {
    const { name, value } = event.target
    setPublishForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleMetadataSubmit(event) {
    event.preventDefault()
    setIsSavingMetadata(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const data = await updateAdminSurvey(token, surveyId, {
        name: metadataForm.name,
        description: metadataForm.description || null,
        category: metadataForm.category,
        is_active: metadataForm.isActive,
        version_title: metadataForm.versionTitle,
        version_description: metadataForm.versionDescription || null,
      })
      applySurveyUpdate(data, 'Metadados da pesquisa atualizados.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSavingMetadata(false)
    }
  }

  function startEditQuestion(question) {
    setQuestionForm(buildQuestionForm(question))
  }

  function startEditDimension(dimension) {
    setDimensionForm(buildDimensionForm(dimension))
  }

  async function handleDimensionSubmit(event) {
    event.preventDefault()
    setIsSavingDimension(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = {
        name: dimensionForm.name,
        description: dimensionForm.description || null,
        ...(dimensionForm.id ? { is_active: dimensionForm.isActive } : {}),
      }

      const data = dimensionForm.id
        ? await updateSurveyDimension(token, dimensionForm.id, payload)
        : await createSurveyDimension(token, surveyId, payload)

      applySurveyUpdate(data, dimensionForm.id ? 'Dimensao atualizada.' : 'Dimensao criada.')
      setDimensionForm(INITIAL_DIMENSION_FORM)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSavingDimension(false)
    }
  }

  async function handleDimensionDelete(dimensionId) {
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const data = await deleteSurveyDimension(token, dimensionId)
      applySurveyUpdate(data, 'Dimensao removida.')
      if (dimensionForm.id === dimensionId) {
        setDimensionForm(INITIAL_DIMENSION_FORM)
      }
      if (questionForm.dimensionId === String(dimensionId)) {
        setQuestionForm((current) => ({ ...current, dimensionId: '' }))
      }
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  async function handleQuestionSubmit(event) {
    event.preventDefault()
    setIsSavingQuestion(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const order = questionForm.displayOrder ? Number(questionForm.displayOrder) : questions.length + 1
      const currentQuestion = questionForm.id
        ? questions.find((question) => question.id === questionForm.id)
        : null
      const payload = {
        code: questionForm.code || `Q${order}`,
        question_text: questionForm.questionText,
        help_text: questionForm.helpText || null,
        question_type: questionForm.questionType,
        dimension_id: questionForm.dimensionId ? Number(questionForm.dimensionId) : null,
        is_required: questionForm.isRequired,
        display_order: order,
        scale_min: Number(questionForm.scaleMin),
        scale_max: Number(questionForm.scaleMax),
        score_weight: questionForm.questionType === 'SCALE_1_5' ? Number(questionForm.scoreWeight) : 1,
        is_negative: questionForm.questionType === 'SCALE_1_5' ? questionForm.isNegative : false,
        allow_comment: questionForm.allowComment,
        is_active: questionForm.isActive,
        options: parseOptions(questionForm.optionsText, currentQuestion?.options ?? []),
      }

      const data = questionForm.id
        ? await updateSurveyQuestion(token, questionForm.id, payload)
        : await createSurveyQuestion(token, surveyId, payload)

      applySurveyUpdate(data, questionForm.id ? 'Pergunta atualizada.' : 'Pergunta criada.')
      setQuestionForm(INITIAL_QUESTION_FORM)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSavingQuestion(false)
    }
  }

  async function handleQuestionDelete(questionId) {
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const data = await deleteSurveyQuestion(token, questionId)
      applySurveyUpdate(data, 'Pergunta removida.')
      if (questionForm.id === questionId) {
        setQuestionForm(INITIAL_QUESTION_FORM)
      }
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  async function handlePublishSubmit(event) {
    event.preventDefault()
    setIsPublishing(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const dateTag = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`
      const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

      const data = await publishAdminSurvey(token, surveyId, {
        campaign_code: `${survey.code}-${dateTag}`,
        campaign_name: `${survey.name} - ${monthLabel}`,
        campaign_description: null,
        start_at: publishForm.startAt,
        end_at: publishForm.endAt,
        is_anonymous: true,
        allows_draft: false,
      })
      applySurveyUpdate(data, 'Pesquisa publicada com sucesso.')
      setPublishForm(INITIAL_PUBLISH_FORM)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsPublishing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="admin-view">
        <section className="admin-panel-card">
          <p>Carregando detalhes da pesquisa...</p>
        </section>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="admin-view">
        <section className="admin-panel-card">
          <strong>Pesquisa nao encontrada</strong>
          <p>Volte para a listagem para escolher uma pesquisa valida.</p>
          <Link className="back-link" to="/admin/surveys">
            Voltar para pesquisas
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Detalhe da Pesquisa</span>
          <h2>{survey.name}</h2>
          <p>{survey.code} · {survey.category} · {questions.length} pergunta(s)</p>
        </div>

        <Link className="secondary-link-button" to="/admin/surveys">
          ← Voltar
        </Link>
      </div>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
      {successMessage ? <div className="form-success">{successMessage}</div> : null}

      <section className="admin-panel-card survey-workspace">
        <nav className="workspace-tabs" role="tablist">
          {[
            { id: 'pesquisa', label: 'Pesquisa', badge: null },
            { id: 'dimensoes', label: 'Dimensoes', badge: dimensions.length || null },
            { id: 'perguntas', label: 'Perguntas', badge: questions.length },
            { id: 'publicar', label: 'Publicar', badge: campaigns.length || null },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`workspace-tab${activeTab === tab.id ? ' active' : ''}`}
              role="tab"
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.badge !== null ? <span className="tab-badge">{tab.badge}</span> : null}
            </button>
          ))}
        </nav>

        {activeTab === 'pesquisa' ? (
          <div className="workspace-panel">
            <form className="survey-create-form" onSubmit={handleMetadataSubmit}>
              <label className="field-group">
                <span>Nome</span>
                <input name="name" value={metadataForm.name} onChange={handleMetadataChange} />
              </label>

              <label className="field-group">
                <span>Descricao</span>
                <textarea name="description" rows="3" value={metadataForm.description} onChange={handleMetadataChange} />
              </label>

              <label className="field-group">
                <span>Tipo de pesquisa</span>
                <input name="category" value={metadataForm.category} onChange={handleMetadataChange} />
              </label>

              <div className="form-grid two-columns">
                <label className="field-group">
                  <span>Titulo da versao atual</span>
                  <input name="versionTitle" value={metadataForm.versionTitle} onChange={handleMetadataChange} />
                </label>
                <label className="checkbox-field">
                  <input checked={metadataForm.isActive} name="isActive" type="checkbox" onChange={handleMetadataChange} />
                  <span>Pesquisa ativa</span>
                </label>
              </div>

              <label className="field-group">
                <span>Descricao da versao atual</span>
                <textarea name="versionDescription" rows="3" value={metadataForm.versionDescription} onChange={handleMetadataChange} />
              </label>

              <div className="form-actions-row">
                <button className="primary-button" disabled={isSavingMetadata} type="submit">
                  {isSavingMetadata ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {activeTab === 'dimensoes' ? (
          <div className="workspace-panel dimension-workspace">
            <div className="dimension-editor-layout">
              <aside className="question-form-pane dimension-form-pane">
                <div className="question-form-pane-header">
                  <strong>{dimensionForm.id ? 'Editando dimensao' : 'Nova dimensao'}</strong>
                  {dimensionForm.id ? (
                    <button className="text-button" type="button" onClick={() => setDimensionForm(INITIAL_DIMENSION_FORM)}>
                      Cancelar
                    </button>
                  ) : null}
                </div>

                <form className="survey-create-form" onSubmit={handleDimensionSubmit}>
                  <label className="field-group">
                    <span>Nome da dimensao</span>
                    <input
                      name="name"
                      placeholder="Ex: Lideranca"
                      value={dimensionForm.name}
                      onChange={handleDimensionFieldChange}
                    />
                  </label>

                  <label className="field-group">
                    <span>Descricao <span className="field-optional">(opcional)</span></span>
                    <textarea
                      name="description"
                      rows="3"
                      placeholder="Descreva o objetivo desta dimensao"
                      value={dimensionForm.description}
                      onChange={handleDimensionFieldChange}
                    />
                  </label>

                  {dimensionForm.id ? (
                    <label className="flag-toggle">
                      <input checked={dimensionForm.isActive} name="isActive" type="checkbox" onChange={handleDimensionFieldChange} />
                      <span>Dimensao ativa</span>
                    </label>
                  ) : null}

                  <button className="primary-button full-width-button" disabled={isSavingDimension || !dimensionForm.name.trim()} type="submit">
                    {isSavingDimension ? 'Salvando...' : dimensionForm.id ? 'Salvar dimensao' : 'Adicionar dimensao'}
                  </button>
                </form>
              </aside>

              <div className="question-list-pane">
                {dimensions.length === 0 ? (
                  <div className="empty-state">
                    <strong>Nenhuma dimensao cadastrada</strong>
                    <span>Crie dimensoes para organizar as perguntas por tema.</span>
                  </div>
                ) : (
                  <div className="stack-list">
                    {dimensions.map((dimension) => (
                      <article className="stack-item-card dimension-card" key={dimension.id}>
                        <div>
                          <div className="dimension-card-header">
                            <strong>{dimension.name}</strong>
                            <span className={`status-pill ${dimension.is_active ? 'active' : 'inactive'}`}>
                              {dimension.is_active ? 'Ativa' : 'Inativa'}
                            </span>
                          </div>
                          <span>{dimension.code} · ordem {dimension.display_order}</span>
                          {dimension.description ? <p className="dimension-card-description">{dimension.description}</p> : null}
                        </div>
                        <div className="question-card-actions">
                          <button className="icon-button" title="Editar" type="button" onClick={() => startEditDimension(dimension)}>
                            ✎
                          </button>
                          <button className="icon-button danger" title="Excluir" type="button" onClick={() => handleDimensionDelete(dimension.id)}>
                            ✕
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'publicar' ? (
          <div className="workspace-panel">
            <form className="survey-create-form" onSubmit={handlePublishSubmit}>
              <div className="form-grid two-columns">
                <label className="field-group">
                  <span>Abertura</span>
                  <input name="startAt" type="datetime-local" value={publishForm.startAt} onChange={handlePublishFieldChange} />
                </label>
                <label className="field-group">
                  <span>Encerramento</span>
                  <input name="endAt" type="datetime-local" value={publishForm.endAt} onChange={handlePublishFieldChange} />
                </label>
              </div>

              {!hasValidDateRange && hasDates ? (
                <div className="form-error">A data de encerramento precisa ser igual ou posterior a abertura.</div>
              ) : null}

              <div className="form-actions-row">
                <button className="primary-button" disabled={!canPublish || isPublishing} type="submit">
                  {isPublishing ? 'Publicando...' : 'Publicar pesquisa'}
                </button>
              </div>
            </form>

            {campaigns.length > 0 ? (
              <>
                <div className="workspace-divider">
                  <span>Aplicacoes anteriores</span>
                </div>
                <div className="stack-list compact-list">
                  {campaigns.map((campaign) => (
                    <article className="stack-item-card" key={campaign.id}>
                      <div>
                        <strong>{campaign.name}</strong>
                        <span>{campaign.status} · {campaign.audience_count} colaboradores</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link className="secondary-link-button" to={`/admin/campaigns/${campaign.id}/responses`}>
                          Ver respostas
                        </Link>
                        <Link className="secondary-link-button" to={`/admin/campaigns/${campaign.id}/kpis`}>
                          KPIs
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <strong>Pesquisa ainda nao publicada</strong>
                <span>Defina o periodo acima e clique em Publicar para abrir esta pesquisa aos colaboradores.</span>
              </div>
            )}
          </div>
        ) : null}

        {activeTab === 'perguntas' ? (
          <div className="question-editor-layout">
            <aside className="question-form-pane">
              <div className="question-form-pane-header">
                <strong>{questionForm.id ? 'Editando pergunta' : 'Nova pergunta'}</strong>
                {questionForm.id ? (
                  <button className="text-button" type="button" onClick={() => setQuestionForm(INITIAL_QUESTION_FORM)}>
                    Cancelar
                  </button>
                ) : null}
              </div>

              <form className="survey-create-form" onSubmit={handleQuestionSubmit}>
                <div className="question-type-selector">
                  {[
                    { value: 'SCALE_1_5', label: 'Escala', hint: '1 a 5' },
                    { value: 'TEXT', label: 'Texto', hint: 'Aberta' },
                    { value: 'SINGLE_CHOICE', label: 'Opcoes', hint: 'Escolha' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      className={`question-type-btn${questionForm.questionType === type.value ? ' active' : ''}`}
                      type="button"
                      onClick={() => setQuestionForm((f) => ({ ...f, questionType: type.value }))}
                    >
                      <span>{type.label}</span>
                      <small>{type.hint}</small>
                    </button>
                  ))}
                </div>

                <label className="field-group">
                  <span>Enunciado</span>
                  <textarea
                    name="questionText"
                    rows="3"
                    placeholder="Escreva a pergunta que o colaborador vai responder"
                    value={questionForm.questionText}
                    onChange={handleQuestionFieldChange}
                  />
                </label>

                <label className="field-group">
                  <span>Instrucao de apoio <span className="field-optional">(opcional)</span></span>
                  <input
                    name="helpText"
                    placeholder="Ex: Considere os ultimos 3 meses"
                    value={questionForm.helpText}
                    onChange={handleQuestionFieldChange}
                  />
                </label>

                <label className="field-group">
                  <span>Ordem</span>
                  <input
                    name="displayOrder"
                    type="number"
                    placeholder={String(questions.length + 1)}
                    value={questionForm.displayOrder}
                    onChange={handleQuestionFieldChange}
                  />
                </label>

                <label className="field-group">
                  <span>Dimensao</span>
                  <select name="dimensionId" value={questionForm.dimensionId} onChange={handleQuestionFieldChange}>
                    <option value="">Sem dimensao</option>
                    {dimensions.map((dimension) => (
                      <option key={dimension.id} value={dimension.id}>
                        {dimension.name}{dimension.is_active ? '' : ' (inativa)'}
                      </option>
                    ))}
                  </select>
                </label>

                {questionForm.questionType === 'SCALE_1_5' ? (
                  <div className="form-grid two-columns">
                    <label className="field-group">
                      <span>Escala minima</span>
                      <input name="scaleMin" type="number" value={questionForm.scaleMin} onChange={handleQuestionFieldChange} />
                    </label>
                    <label className="field-group">
                      <span>Escala maxima</span>
                      <input name="scaleMax" type="number" value={questionForm.scaleMax} onChange={handleQuestionFieldChange} />
                    </label>
                    <label className="field-group">
                      <span>Peso da pergunta</span>
                      <input name="scoreWeight" min="1" max="100" type="number" value={questionForm.scoreWeight} onChange={handleQuestionFieldChange} />
                    </label>
                    <label className="checkbox-field">
                      <input checked={questionForm.isNegative} name="isNegative" type="checkbox" onChange={handleQuestionFieldChange} />
                      <span>Pontuação Invertida</span>
                    </label>
                  </div>
                ) : null}

                {questionForm.questionType === 'SINGLE_CHOICE' ? (
                  <label className="field-group">
                    <span>Opcoes <span className="field-hint">Uma opcao por linha</span></span>
                    <textarea
                      name="optionsText"
                      rows="4"
                      placeholder={"Concordo totalmente\nConcordo\nNeutro"}
                      value={questionForm.optionsText}
                      onChange={handleQuestionFieldChange}
                    />
                  </label>
                ) : null}

                <div className="question-flags">
                  <label className="flag-toggle">
                    <input checked={questionForm.isRequired} name="isRequired" type="checkbox" onChange={handleQuestionFieldChange} />
                    <span>Obrigatoria</span>
                  </label>
                  <label className="flag-toggle">
                    <input checked={questionForm.allowComment} name="allowComment" type="checkbox" onChange={handleQuestionFieldChange} />
                    <span>Aceita comentario</span>
                  </label>
                  <label className="flag-toggle">
                    <input checked={questionForm.isActive} name="isActive" type="checkbox" onChange={handleQuestionFieldChange} />
                    <span>Ativa</span>
                  </label>
                </div>

                <button className="primary-button full-width-button" disabled={isSavingQuestion || !questionForm.questionText.trim()} type="submit">
                  {isSavingQuestion ? 'Salvando...' : questionForm.id ? 'Salvar alteracoes' : 'Adicionar pergunta'}
                </button>
              </form>
            </aside>

            <div className="question-list-pane">
              {questions.length === 0 ? (
                <div className="empty-state">
                  <strong>Nenhuma pergunta ainda</strong>
                  <span>Crie a primeira pergunta no formulario ao lado.</span>
                </div>
              ) : (
                <ol className="question-ordered-list">
                  {questions.map((question, index) => (
                    <li
                      key={question.id}
                      className={`question-card${questionForm.id === question.id ? ' editing' : ''}`}
                    >
                      <div className="question-card-order">{index + 1}</div>
                      <div className="question-card-body">
                        <p className="question-card-text">{question.question_text}</p>
                        <div className="question-card-meta">
                          <span className={`question-type-badge type-${question.question_type.toLowerCase()}`}>
                            {question.question_type === 'SCALE_1_5' ? 'Escala' : question.question_type === 'TEXT' ? 'Texto' : 'Opcoes'}
                          </span>
                          <span className="question-card-code">{question.code}</span>
                          {question.dimension_id ? (
                            <span className="question-card-tag dimension-tag">
                              {dimensionMap.get(question.dimension_id)?.name ?? 'Dimensao vinculada'}
                            </span>
                          ) : null}
                          {question.question_type === 'SCALE_1_5' ? <span className="question-card-tag">Peso {question.score_weight ?? 1}x</span> : null}
                          {question.question_type === 'SCALE_1_5' && question.is_negative ? <span className="question-card-tag negative-tag">Invertida</span> : null}
                          {question.is_required ? <span className="question-card-tag">Obrigatoria</span> : null}
                          {question.allow_comment ? <span className="question-card-tag">Comentario</span> : null}
                        </div>
                      </div>
                      <div className="question-card-actions">
                        <button className="icon-button" title="Editar" type="button" onClick={() => { startEditQuestion(question); }}>
                          ✎
                        </button>
                        <button className="icon-button danger" title="Excluir" type="button" onClick={() => handleQuestionDelete(question.id)}>
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
