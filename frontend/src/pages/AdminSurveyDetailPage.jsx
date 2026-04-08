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
  category: 'CUSTOM',
  isActive: true,
  versionTitle: '',
  versionDescription: '',
}

const INITIAL_DIMENSION_FORM = {
  name: '',
  description: '',
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
  allowComment: false,
  isActive: true,
  optionsText: '',
}

const INITIAL_PUBLISH_FORM = {
  campaignCode: '',
  campaignName: '',
  campaignDescription: '',
  startAt: '',
  endAt: '',
  allowsDraft: true,
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
    allowComment: question.allow_comment,
    isActive: question.is_active,
    optionsText: (question.options ?? [])
      .map((option) => `${option.label}|${option.value}|${option.score_value ?? ''}`)
      .join('\n'),
  }
}

function parseOptions(optionsText) {
  return optionsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, value, scoreValue] = line.split('|').map((item) => item.trim())
      return {
        label,
        value,
        score_value: scoreValue ? Number(scoreValue) : null,
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

export function AdminSurveyDetailPage() {
  const { surveyId } = useParams()
  const { token } = useAuth()
  const [survey, setSurvey] = useState(null)
  const [metadataForm, setMetadataForm] = useState(INITIAL_METADATA_FORM)
  const [dimensionForm, setDimensionForm] = useState(INITIAL_DIMENSION_FORM)
  const [editingDimensionId, setEditingDimensionId] = useState(null)
  const [questionForm, setQuestionForm] = useState(INITIAL_QUESTION_FORM)
  const [publishForm, setPublishForm] = useState(INITIAL_PUBLISH_FORM)
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

  const dimensions = useMemo(() => survey?.dimensions ?? [], [survey])
  const questions = useMemo(() => survey?.current_version?.questions ?? [], [survey])
  const campaigns = useMemo(() => survey?.campaigns ?? [], [survey])

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

  function handleDimensionFieldChange(event) {
    const { name, value } = event.target
    setDimensionForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleQuestionFieldChange(event) {
    const { name, value, type, checked } = event.target
    setQuestionForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handlePublishFieldChange(event) {
    const { name, value, type, checked } = event.target
    setPublishForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
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

  function startEditDimension(dimension) {
    setEditingDimensionId(dimension.id)
    setDimensionForm({
      name: dimension.name,
      description: dimension.description ?? '',
    })
  }

  async function handleDimensionSubmit(event) {
    event.preventDefault()
    setIsSavingDimension(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const data = editingDimensionId
        ? await updateSurveyDimension(token, editingDimensionId, {
            name: dimensionForm.name,
            description: dimensionForm.description || null,
            is_active: true,
          })
        : await createSurveyDimension(token, surveyId, {
            name: dimensionForm.name,
            description: dimensionForm.description || null,
          })

      applySurveyUpdate(data, editingDimensionId ? 'Dimensao atualizada.' : 'Dimensao criada.')
      setDimensionForm(INITIAL_DIMENSION_FORM)
      setEditingDimensionId(null)
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
      if (editingDimensionId === dimensionId) {
        setEditingDimensionId(null)
        setDimensionForm(INITIAL_DIMENSION_FORM)
      }
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  function startEditQuestion(question) {
    setQuestionForm(buildQuestionForm(question))
  }

  async function handleQuestionSubmit(event) {
    event.preventDefault()
    setIsSavingQuestion(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = {
        code: questionForm.code,
        question_text: questionForm.questionText,
        help_text: questionForm.helpText || null,
        question_type: questionForm.questionType,
        dimension_id: questionForm.dimensionId ? Number(questionForm.dimensionId) : null,
        is_required: questionForm.isRequired,
        display_order: questionForm.displayOrder ? Number(questionForm.displayOrder) : null,
        scale_min: Number(questionForm.scaleMin),
        scale_max: Number(questionForm.scaleMax),
        allow_comment: questionForm.allowComment,
        is_active: questionForm.isActive,
        options: parseOptions(questionForm.optionsText),
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
      const data = await publishAdminSurvey(token, surveyId, {
        campaign_code: publishForm.campaignCode,
        campaign_name: publishForm.campaignName,
        campaign_description: publishForm.campaignDescription || null,
        start_at: publishForm.startAt,
        end_at: publishForm.endAt,
        is_anonymous: true,
        allows_draft: publishForm.allowsDraft,
      })
      applySurveyUpdate(data, 'Versao publicada e campanha criada com sucesso.')
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
          <p>
            Edite metadados, gerencie dimensoes e perguntas da versao atual e
            publique a campanha administrativa.
          </p>
        </div>

        <Link className="secondary-link-button" to="/admin/surveys">
          Voltar para listagem
        </Link>
      </div>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
      {successMessage ? <div className="form-success">{successMessage}</div> : null}

      <section className="admin-panel-card">
        <div className="panel-header-row">
          <div>
            <h3>Metadados da pesquisa</h3>
            <p>Atualize nome, categoria e dados da versao atual.</p>
          </div>
        </div>

        <form className="survey-create-form" onSubmit={handleMetadataSubmit}>
          <div className="form-grid two-columns">
            <label className="field-group">
              <span>Codigo</span>
              <input disabled value={survey.code} />
            </label>
            <label className="field-group">
              <span>Categoria</span>
              <select name="category" value={metadataForm.category} onChange={handleMetadataChange}>
                <option value="CUSTOM">Custom</option>
                <option value="GPTW">GPTW</option>
                <option value="PULSE">Pulse</option>
              </select>
            </label>
          </div>

          <label className="field-group">
            <span>Nome</span>
            <input name="name" value={metadataForm.name} onChange={handleMetadataChange} />
          </label>

          <label className="field-group">
            <span>Descricao</span>
            <textarea name="description" rows="3" value={metadataForm.description} onChange={handleMetadataChange} />
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
              {isSavingMetadata ? 'Salvando...' : 'Salvar metadados'}
            </button>
          </div>
        </form>
      </section>

      <section className="dashboard-detail-grid survey-detail-grid">
        <section className="admin-panel-card">
          <div className="panel-header-row">
            <div>
              <h3>Dimensoes</h3>
              <p>Crie, edite e remova dimensoes associadas a esta pesquisa.</p>
            </div>
          </div>

          <form className="survey-create-form" onSubmit={handleDimensionSubmit}>
            <label className="field-group">
              <span>Nome da dimensao</span>
              <input name="name" value={dimensionForm.name} onChange={handleDimensionFieldChange} />
            </label>
            <label className="field-group">
              <span>Descricao</span>
              <textarea name="description" rows="3" value={dimensionForm.description} onChange={handleDimensionFieldChange} />
            </label>
            <div className="form-actions-row">
              <button className="primary-button" disabled={isSavingDimension} type="submit">
                {isSavingDimension ? 'Salvando...' : editingDimensionId ? 'Atualizar dimensao' : 'Adicionar dimensao'}
              </button>
              {editingDimensionId ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setEditingDimensionId(null)
                    setDimensionForm(INITIAL_DIMENSION_FORM)
                  }}
                >
                  Cancelar edicao
                </button>
              ) : null}
            </div>
          </form>

          <div className="stack-list">
            {dimensions.map((dimension) => (
              <article className="stack-item-card" key={dimension.id}>
                <div>
                  <strong>{dimension.name}</strong>
                  <span>{dimension.code}</span>
                </div>
                <div className="inline-actions">
                  <button className="secondary-button" type="button" onClick={() => startEditDimension(dimension)}>
                    Editar
                  </button>
                  <button className="danger-button" type="button" onClick={() => handleDimensionDelete(dimension.id)}>
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-panel-card">
          <div className="panel-header-row">
            <div>
              <h3>Publicar versao e abrir campanha</h3>
              <p>Quando a versao estiver pronta, publique e congele o publico-alvo.</p>
            </div>
          </div>

          <form className="survey-create-form" onSubmit={handlePublishSubmit}>
            <div className="form-grid two-columns">
              <label className="field-group">
                <span>Codigo da campanha</span>
                <input name="campaignCode" value={publishForm.campaignCode} onChange={handlePublishFieldChange} />
              </label>
              <label className="field-group">
                <span>Nome da campanha</span>
                <input name="campaignName" value={publishForm.campaignName} onChange={handlePublishFieldChange} />
              </label>
            </div>

            <label className="field-group">
              <span>Descricao da campanha</span>
              <textarea name="campaignDescription" rows="3" value={publishForm.campaignDescription} onChange={handlePublishFieldChange} />
            </label>

            <div className="form-grid two-columns">
              <label className="field-group">
                <span>Inicio</span>
                <input name="startAt" type="datetime-local" value={publishForm.startAt} onChange={handlePublishFieldChange} />
              </label>
              <label className="field-group">
                <span>Fim</span>
                <input name="endAt" type="datetime-local" value={publishForm.endAt} onChange={handlePublishFieldChange} />
              </label>
            </div>

            <div className="form-grid two-columns">
              <div className="checkbox-field">
                <span>Campanha anonima fixa nesta fase do produto</span>
              </div>
              <label className="checkbox-field">
                <input checked={publishForm.allowsDraft} name="allowsDraft" type="checkbox" onChange={handlePublishFieldChange} />
                <span>Permitir rascunho</span>
              </label>
            </div>

            <div className="form-actions-row">
              <button className="primary-button" disabled={isPublishing} type="submit">
                {isPublishing ? 'Publicando...' : 'Publicar e abrir campanha'}
              </button>
            </div>
          </form>

          <div className="stack-list compact-list">
            {campaigns.map((campaign) => (
              <article className="stack-item-card" key={campaign.id}>
                <div>
                  <strong>{campaign.name}</strong>
                  <span>{campaign.code} · {campaign.status}</span>
                </div>
                <span>{campaign.audience_count} colaboradores</span>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="admin-panel-card">
        <div className="panel-header-row">
          <div>
            <h3>Perguntas da versao atual</h3>
            <p>Crie e gerencie as perguntas que compoem a versao ativa da pesquisa.</p>
          </div>
        </div>

        <form className="survey-create-form" onSubmit={handleQuestionSubmit}>
          <div className="form-grid two-columns">
            <label className="field-group">
              <span>Codigo</span>
              <input name="code" value={questionForm.code} onChange={handleQuestionFieldChange} />
            </label>
            <label className="field-group">
              <span>Tipo de pergunta</span>
              <select name="questionType" value={questionForm.questionType} onChange={handleQuestionFieldChange}>
                <option value="SCALE_1_5">Scale 1 a 5</option>
                <option value="TEXT">Texto</option>
                <option value="SINGLE_CHOICE">Escolha unica</option>
              </select>
            </label>
          </div>

          <label className="field-group">
            <span>Enunciado</span>
            <textarea name="questionText" rows="3" value={questionForm.questionText} onChange={handleQuestionFieldChange} />
          </label>

          <label className="field-group">
            <span>Texto de apoio</span>
            <textarea name="helpText" rows="2" value={questionForm.helpText} onChange={handleQuestionFieldChange} />
          </label>

          <div className="form-grid two-columns">
            <label className="field-group">
              <span>Dimensao</span>
              <select name="dimensionId" value={questionForm.dimensionId} onChange={handleQuestionFieldChange}>
                <option value="">Sem dimensao</option>
                {dimensions.map((dimension) => (
                  <option key={dimension.id} value={dimension.id}>
                    {dimension.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group">
              <span>Ordem de exibicao</span>
              <input name="displayOrder" type="number" value={questionForm.displayOrder} onChange={handleQuestionFieldChange} />
            </label>
          </div>

          <div className="form-grid two-columns">
            <label className="field-group">
              <span>Escala minima</span>
              <input name="scaleMin" type="number" value={questionForm.scaleMin} onChange={handleQuestionFieldChange} />
            </label>
            <label className="field-group">
              <span>Escala maxima</span>
              <input name="scaleMax" type="number" value={questionForm.scaleMax} onChange={handleQuestionFieldChange} />
            </label>
          </div>

          <div className="form-grid two-columns">
            <label className="checkbox-field">
              <input checked={questionForm.isRequired} name="isRequired" type="checkbox" onChange={handleQuestionFieldChange} />
              <span>Pergunta obrigatoria</span>
            </label>
            <label className="checkbox-field">
              <input checked={questionForm.allowComment} name="allowComment" type="checkbox" onChange={handleQuestionFieldChange} />
              <span>Permitir comentario</span>
            </label>
          </div>

          <label className="checkbox-field">
            <input checked={questionForm.isActive} name="isActive" type="checkbox" onChange={handleQuestionFieldChange} />
            <span>Pergunta ativa</span>
          </label>

          <label className="field-group">
            <span>Opcoes para escolha unica</span>
            <textarea
              name="optionsText"
              rows="4"
              placeholder={"Uma opcao por linha no formato Label|VALUE|Score\nEx: Concordo|AGREE|5"}
              value={questionForm.optionsText}
              onChange={handleQuestionFieldChange}
            />
          </label>

          <div className="form-actions-row">
            <button className="primary-button" disabled={isSavingQuestion} type="submit">
              {isSavingQuestion ? 'Salvando...' : questionForm.id ? 'Atualizar pergunta' : 'Criar pergunta'}
            </button>
            {questionForm.id ? (
              <button className="secondary-button" type="button" onClick={() => setQuestionForm(INITIAL_QUESTION_FORM)}>
                Cancelar edicao
              </button>
            ) : null}
          </div>
        </form>

        <div className="stack-list">
          {questions.map((question) => (
            <article className="stack-item-card question-stack-item" key={question.id}>
              <div>
                <strong>{question.question_text}</strong>
                <span>{question.code} · {question.question_type} · ordem {question.display_order}</span>
              </div>
              <div className="inline-actions">
                <button className="secondary-button" type="button" onClick={() => startEditQuestion(question)}>
                  Editar
                </button>
                <button className="danger-button" type="button" onClick={() => handleQuestionDelete(question.id)}>
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
