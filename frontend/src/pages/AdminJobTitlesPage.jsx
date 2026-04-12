import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../auth/AuthProvider'
import { createAdminJobTitle, getAdminJobTitles, updateAdminJobTitle } from '../services/admin'

const INITIAL_FORM = {
  id: null,
  code: '',
  name: '',
  description: '',
  isActive: true,
}

function buildForm(jobTitle) {
  if (!jobTitle) {
    return INITIAL_FORM
  }

  return {
    id: jobTitle.id,
    code: jobTitle.code,
    name: jobTitle.name,
    description: jobTitle.description ?? '',
    isActive: jobTitle.is_active,
  }
}

export function AdminJobTitlesPage() {
  const { token } = useAuth()
  const [jobTitles, setJobTitles] = useState([])
  const [query, setQuery] = useState('')
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    getAdminJobTitles(token)
      .then((data) => {
        if (!isMounted) {
          return
        }
        setJobTitles(data.items ?? [])
        setErrorMessage('')
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
  }, [token])

  const filteredJobTitles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return jobTitles
    }

    return jobTitles.filter((jobTitle) => (
      [jobTitle.code, jobTitle.name, jobTitle.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    ))
  }, [jobTitles, query])

  function handleFieldChange(event) {
    const { name, value, type, checked } = event.target
    setFormValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleStartEdit(jobTitle) {
    setFormValues(buildForm(jobTitle))
    setErrorMessage('')
    setSuccessMessage('')
  }

  function handleCancelEdit() {
    setFormValues(INITIAL_FORM)
    setErrorMessage('')
    setSuccessMessage('')
  }

  async function handleToggleActive(jobTitle) {
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const saved = await updateAdminJobTitle(token, jobTitle.id, {
        code: jobTitle.code,
        name: jobTitle.name,
        description: jobTitle.description ?? null,
        is_active: !jobTitle.is_active,
      })

      setJobTitles((current) => current.map((item) => (item.id === saved.id ? saved : item)))
      setSuccessMessage(saved.is_active ? 'Cargo ativado.' : 'Cargo inativado.')
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    const payload = {
      code: formValues.code,
      name: formValues.name,
      description: formValues.description || null,
      is_active: formValues.isActive,
    }

    try {
      const saved = formValues.id
        ? await updateAdminJobTitle(token, formValues.id, payload)
        : await createAdminJobTitle(token, payload)

      setJobTitles((current) => {
        if (formValues.id) {
          return current.map((item) => (item.id === saved.id ? saved : item))
        }
        return [...current, saved].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      })
      setFormValues(INITIAL_FORM)
      setSuccessMessage(formValues.id ? 'Cargo atualizado.' : 'Cargo cadastrado.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Cadastros de Apoio</span>
          <h2>Cargos</h2>
          <p>Cadastre e mantenha os cargos com descrição para uso nos fluxos e cadastros do RH.</p>
        </div>
      </div>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
      {successMessage ? <div className="form-success">{successMessage}</div> : null}

      <section className="admin-panel-card" style={{ display: 'grid', gap: 24 }}>
        <div className="question-editor-layout">
          <aside className="question-form-pane">
            <div className="question-form-pane-header">
              <strong>{formValues.id ? 'Editando cargo' : 'Novo cargo'}</strong>
              {formValues.id ? (
                <button className="text-button" type="button" onClick={handleCancelEdit}>
                  Cancelar
                </button>
              ) : null}
            </div>

            <form className="survey-create-form" onSubmit={handleSubmit}>
              <label className="field-group">
                <span>Código</span>
                <input
                  name="code"
                  placeholder="Ex: MANAGER"
                  value={formValues.code}
                  onChange={handleFieldChange}
                />
              </label>

              <label className="field-group">
                <span>Nome</span>
                <input
                  name="name"
                  placeholder="Ex: Gerente de TI"
                  value={formValues.name}
                  onChange={handleFieldChange}
                />
              </label>

              <label className="field-group">
                <span>Descrição <span className="field-optional">(opcional)</span></span>
                <textarea
                  name="description"
                  rows="4"
                  placeholder="Descreva a responsabilidade deste cargo"
                  value={formValues.description}
                  onChange={handleFieldChange}
                />
              </label>

              <label className="flag-toggle">
                <input checked={formValues.isActive} name="isActive" type="checkbox" onChange={handleFieldChange} />
                <span>Cargo ativo</span>
              </label>

              <button
                className="primary-button full-width-button"
                disabled={isSubmitting || formValues.code.trim().length < 2 || formValues.name.trim().length < 2}
                type="submit"
              >
                {isSubmitting ? 'Salvando...' : formValues.id ? 'Salvar alterações' : 'Cadastrar cargo'}
              </button>
            </form>
          </aside>

          <div className="question-list-pane">
            <div className="admin-toolbar-card" style={{ marginBottom: 16 }}>
              <label className="field-group">
                <span>Buscar cargo</span>
                <input
                  placeholder="Filtrar por código, nome ou descrição"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>

            {isLoading ? (
              <div className="empty-state">
                <strong>Carregando cargos...</strong>
              </div>
            ) : filteredJobTitles.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhum cargo encontrado</strong>
                <span>Cadastre o primeiro cargo ou ajuste o filtro.</span>
              </div>
            ) : (
              <div className="stack-list">
                {filteredJobTitles.map((jobTitle) => (
                  <article className="stack-item-card" key={jobTitle.id}>
                    <div>
                      <strong>{jobTitle.name}</strong>
                      <span>{jobTitle.code} · {jobTitle.is_active ? 'Ativo' : 'Inativo'}</span>
                      {jobTitle.description ? (
                        <span style={{ color: 'var(--slate-500)', fontSize: 13, lineHeight: 1.5 }}>{jobTitle.description}</span>
                      ) : null}
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <button className="secondary-button" type="button" onClick={() => handleStartEdit(jobTitle)}>
                        Editar
                      </button>
                      <button className="secondary-button" type="button" onClick={() => handleToggleActive(jobTitle)}>
                        {jobTitle.is_active ? 'Inativar' : 'Ativar'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}