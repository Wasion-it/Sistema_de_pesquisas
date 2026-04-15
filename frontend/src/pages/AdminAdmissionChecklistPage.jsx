import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import {
  createAdminAdmissionChecklistStep,
  deleteAdminAdmissionChecklistStep,
  getAdminAdmissionChecklist,
  updateAdminAdmissionChecklistStep,
} from '../services/admin'

const INITIAL_FORM = {
  id: null,
  title: '',
  description: '',
  stepOrder: '',
}

function buildForm(step) {
  if (!step) return INITIAL_FORM

  return {
    id: step.id,
    title: step.title,
    description: step.description ?? '',
    stepOrder: String(step.step_order ?? ''),
  }
}

function sortSteps(items = []) {
  return [...items].sort((left, right) => {
    const orderDiff = (left.step_order ?? 0) - (right.step_order ?? 0)
    if (orderDiff !== 0) return orderDiff
    return (left.id ?? 0) - (right.id ?? 0)
  })
}

export function AdminAdmissionChecklistPage() {
  const { token } = useAuth()
  const [steps, setSteps] = useState([])
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showForm, setShowForm] = useState(false)

  async function loadChecklist() {
    const data = await getAdminAdmissionChecklist(token)
    setSteps(sortSteps(data.items ?? []))
  }

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    loadChecklist()
      .then(() => {
        if (isMounted) {
          setErrorMessage('')
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message)
          setSteps([])
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
  }, [token])

  const stats = useMemo(() => ({
    total: steps.length,
    firstStep: steps[0]?.title ?? 'Sem passos',
    lastStep: steps[steps.length - 1]?.title ?? 'Sem passos',
  }), [steps])

  function handleFieldChange(event) {
    const { name, value } = event.target
    setFormValues((current) => ({ ...current, [name]: value }))
  }

  function startCreate() {
    setFormValues({ ...INITIAL_FORM, stepOrder: String(steps.length + 1) })
    setShowForm(true)
    setErrorMessage('')
    setSuccessMessage('')
    setTimeout(() => document.getElementById('admission-checklist-title-input')?.focus(), 50)
  }

  function startEdit(step) {
    setFormValues(buildForm(step))
    setShowForm(true)
    setErrorMessage('')
    setSuccessMessage('')
    setTimeout(() => document.getElementById('admission-checklist-title-input')?.focus(), 50)
  }

  function cancelEdit() {
    setFormValues(INITIAL_FORM)
    setShowForm(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    const payload = {
      title: formValues.title.trim(),
      description: formValues.description.trim() || null,
      step_order: Number(formValues.stepOrder || 1),
    }

    try {
      if (formValues.id) {
        await updateAdminAdmissionChecklistStep(token, formValues.id, payload)
      } else {
        await createAdminAdmissionChecklistStep(token, payload)
      }

      await loadChecklist()
      setFormValues(INITIAL_FORM)
      setShowForm(false)
      setSuccessMessage(formValues.id ? 'Passo atualizado com sucesso.' : 'Passo adicionado com sucesso.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(step) {
    const confirmed = window.confirm(`Excluir o passo "${step.title}" do checklist?`)
    if (!confirmed) {
      return
    }

    setErrorMessage('')
    setSuccessMessage('')

    try {
      await deleteAdminAdmissionChecklistStep(token, step.id)
      await loadChecklist()
      if (formValues.id === step.id) {
        setFormValues(INITIAL_FORM)
        setShowForm(false)
      }
      setSuccessMessage('Passo excluído com sucesso.')
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const isFormValid = formValues.title.trim().length >= 2 && Number(formValues.stepOrder) >= 1

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">RH • Admissão</span>
          <h2>Checklist de admissão</h2>
          <p>Configure os passos que aparecem no modal da solicitação de admissão.</p>
        </div>
        <div className="admin-header-actions">
          <Link className="secondary-link-button" to="/admin/admission-requests">
            Voltar para admissões
          </Link>
          <button className="primary-button" type="button" onClick={startCreate}>
            Novo passo
          </button>
        </div>
      </div>

      {!isLoading && (
        <section className="dashboard-stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <article className="stat-card">
            <span>Total de passos</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="stat-card">
            <span>Primeiro passo</span>
            <strong style={{ fontSize: 15 }}>{stats.firstStep}</strong>
          </article>
          <article className="stat-card">
            <span>Último passo</span>
            <strong style={{ fontSize: 15 }}>{stats.lastStep}</strong>
          </article>
        </section>
      )}

      {successMessage ? <div className="form-success">{successMessage}</div> : null}
      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}

      <section className="admin-checklist-layout">
        <article className="admin-panel-card">
          <div className="admin-view-header" style={{ paddingBottom: 0, marginBottom: 18 }}>
            <div>
              <span className="eyebrow">Passos cadastrados</span>
              <h3 style={{ margin: 0 }}>Ordem atual do checklist</h3>
            </div>
          </div>

          {isLoading ? (
            <div className="empty-state">
              <strong>Carregando checklist...</strong>
            </div>
          ) : steps.length === 0 ? (
            <div className="empty-state">
              <strong>Nenhum passo cadastrado</strong>
              <span>Adicione os passos que o RH precisa seguir na admissão.</span>
            </div>
          ) : (
            <div className="admin-checklist-list">
              {steps.map((step) => (
                <div className="admin-checklist-item" key={step.id}>
                  <div className="admin-checklist-item-order">{step.step_order}</div>
                  <div className="admin-checklist-item-body">
                    <strong>{step.title}</strong>
                    <p>{step.description || 'Sem descrição cadastrada.'}</p>
                  </div>
                  <div className="admin-checklist-item-actions">
                    <button className="secondary-button" type="button" onClick={() => startEdit(step)}>
                      Editar
                    </button>
                    <button className="secondary-button danger" type="button" onClick={() => handleDelete(step)}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="admin-panel-card">
          <div className="admin-view-header" style={{ paddingBottom: 0, marginBottom: 18 }}>
            <div>
              <span className="eyebrow">Editor</span>
              <h3 style={{ margin: 0 }}>{formValues.id ? 'Editar passo' : 'Novo passo'}</h3>
              <p style={{ marginTop: 6 }}>Defina a ordem e o texto que aparecerão no modal da solicitação.</p>
            </div>
            {showForm ? (
              <button className="secondary-button" type="button" onClick={cancelEdit}>
                Cancelar
              </button>
            ) : null}
          </div>

          {!showForm ? (
            <div className="empty-state" style={{ padding: '52px 24px' }}>
              <strong>Selecione ou crie um passo</strong>
              <span>Use o botão acima para incluir um novo item ou editar um item existente.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="checklist-editor-grid">
                <label className="field-group">
                  <span>Ordem</span>
                  <input
                    name="stepOrder"
                    type="number"
                    min="1"
                    value={formValues.stepOrder}
                    onChange={handleFieldChange}
                    required
                  />
                </label>

                <label className="field-group checklist-editor-span-2">
                  <span>Título</span>
                  <input
                    id="admission-checklist-title-input"
                    name="title"
                    value={formValues.title}
                    onChange={handleFieldChange}
                    placeholder="Ex.: Conferência de documentos"
                    required
                  />
                </label>

                <label className="field-group checklist-editor-span-2">
                  <span>Descrição</span>
                  <textarea
                    name="description"
                    rows="6"
                    value={formValues.description}
                    onChange={handleFieldChange}
                    placeholder="Explique o que o RH precisa fazer nessa etapa"
                  />
                </label>
              </div>

              <div className="admin-checklist-form-actions">
                <button className="primary-button" disabled={!isFormValid || isSubmitting} type="submit">
                  {isSubmitting ? 'Salvando...' : formValues.id ? 'Salvar alterações' : 'Adicionar passo'}
                </button>
                <button className="secondary-button" type="button" onClick={cancelEdit}>
                  Limpar
                </button>
              </div>
            </form>
          )}
        </article>
      </section>
    </div>
  )
}