import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../auth/AuthProvider'
import { createAdminDepartment, getAdminDepartments, updateAdminDepartment } from '../services/admin'

const INITIAL_FORM = {
  id: null,
  code: '',
  name: '',
  description: '',
  totalPeople: '0',
  isActive: true,
}

function buildForm(department) {
  if (!department) {
    return INITIAL_FORM
  }

  return {
    id: department.id,
    code: department.code,
    name: department.name,
    description: department.description ?? '',
    totalPeople: String(department.total_people ?? 0),
    isActive: department.is_active,
  }
}

export function AdminDepartmentsPage() {
  const { token } = useAuth()
  const [departments, setDepartments] = useState([])
  const [query, setQuery] = useState('')
  const [formValues, setFormValues] = useState(INITIAL_FORM)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    getAdminDepartments(token)
      .then((data) => {
        if (!isMounted) {
          return
        }
        setDepartments(data.items)
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

  const filteredDepartments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return departments
    }

    return departments.filter((department) => (
      [department.code, department.name, department.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    ))
  }, [departments, query])

  function handleFieldChange(event) {
    const { name, value, type, checked } = event.target
    setFormValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleStartEdit(department) {
    setFormValues(buildForm(department))
    setErrorMessage('')
    setSuccessMessage('')
  }

  function handleCancelEdit() {
    setFormValues(INITIAL_FORM)
    setErrorMessage('')
    setSuccessMessage('')
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
      total_people: Number(formValues.totalPeople || 0),
      is_active: formValues.isActive,
    }

    try {
      const saved = formValues.id
        ? await updateAdminDepartment(token, formValues.id, payload)
        : await createAdminDepartment(token, payload)

      setDepartments((current) => {
        if (formValues.id) {
          return current.map((item) => (item.id === saved.id ? saved : item))
        }
        return [...current, saved].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      })
      setFormValues(INITIAL_FORM)
      setSuccessMessage(formValues.id ? 'Departamento atualizado.' : 'Departamento cadastrado.')
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
          <h2>Departamentos</h2>
          <p>Cadastre e mantenha os departamentos disponíveis para segmentação das pesquisas.</p>
        </div>
      </div>

      {errorMessage ? <div className="form-error">{errorMessage}</div> : null}
      {successMessage ? <div className="form-success">{successMessage}</div> : null}

      <section className="admin-panel-card" style={{ display: 'grid', gap: 24 }}>
        <div className="question-editor-layout">
          <aside className="question-form-pane">
            <div className="question-form-pane-header">
              <strong>{formValues.id ? 'Editando departamento' : 'Novo departamento'}</strong>
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
                  placeholder="EX: RH"
                  value={formValues.code}
                  onChange={handleFieldChange}
                />
              </label>

              <label className="field-group">
                <span>Nome</span>
                <input
                  name="name"
                  placeholder="Ex: Recursos Humanos"
                  value={formValues.name}
                  onChange={handleFieldChange}
                />
              </label>

              <label className="field-group">
                <span>Descrição <span className="field-optional">(opcional)</span></span>
                <textarea
                  name="description"
                  rows="4"
                  placeholder="Descreva a atuação deste departamento"
                  value={formValues.description}
                  onChange={handleFieldChange}
                />
              </label>

              <label className="field-group">
                <span>Quantidade de pessoas no departamento</span>
                <input
                  min="0"
                  name="totalPeople"
                  placeholder="Ex: 42"
                  type="number"
                  value={formValues.totalPeople}
                  onChange={handleFieldChange}
                />
              </label>

              <label className="flag-toggle">
                <input checked={formValues.isActive} name="isActive" type="checkbox" onChange={handleFieldChange} />
                <span>Departamento ativo</span>
              </label>

              <button
                className="primary-button full-width-button"
                disabled={isSubmitting || formValues.code.trim().length < 2 || formValues.name.trim().length < 2 || Number(formValues.totalPeople) < 0}
                type="submit"
              >
                {isSubmitting ? 'Salvando...' : formValues.id ? 'Salvar alterações' : 'Cadastrar departamento'}
              </button>
            </form>
          </aside>

          <div className="question-list-pane">
            <div className="admin-toolbar-card" style={{ marginBottom: 16 }}>
              <label className="field-group">
                <span>Buscar departamento</span>
                <input
                  placeholder="Filtrar por código, nome ou descrição"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>

            {isLoading ? (
              <div className="empty-state">
                <strong>Carregando departamentos...</strong>
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="empty-state">
                <strong>Nenhum departamento encontrado</strong>
                <span>Cadastre o primeiro departamento ou ajuste o filtro.</span>
              </div>
            ) : (
              <div className="stack-list">
                {filteredDepartments.map((department) => (
                  <article className="stack-item-card" key={department.id}>
                    <div>
                      <strong>{department.name}</strong>
                      <span>{department.code} · {department.is_active ? 'Ativo' : 'Inativo'}</span>
                      <span style={{ color: 'var(--slate-500)', fontSize: 13 }}>Base cadastrada: {department.total_people ?? 0} pessoa(s)</span>
                      {department.description ? (
                        <span style={{ color: 'var(--slate-500)', fontSize: 13, lineHeight: 1.5 }}>{department.description}</span>
                      ) : null}
                    </div>
                    <button className="secondary-button" type="button" onClick={() => handleStartEdit(department)}>
                      Editar
                    </button>
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
