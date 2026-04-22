import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../auth/AuthProvider'
import { getAdminAccessControlUsers, updateAdminAccessControlUser } from '../services/admin'
import { ACCESS_MODULE_META, ACCESS_MODULES } from '../utils/accessControl'

const ACCESS_LEVEL_OPTIONS = [
  { value: 'READ', label: 'Leitura' },
  { value: 'MANAGE', label: 'Gestão' },
]

function buildDraftFromUser(user) {
  return ACCESS_MODULES.map((moduleName) => {
    const grant = user?.access_grants?.find((item) => item.module === moduleName && item.is_active !== false)
    return {
      module: moduleName,
      enabled: Boolean(grant),
      accessLevel: grant?.access_level ?? 'READ',
    }
  })
}

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

function formatSource(source) {
  return source === 'LDAP' ? 'AD / LDAP' : 'Local'
}

export function AdminAccessControlPage() {
  const { token } = useAuth()
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [draft, setDraft] = useState([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    getAdminAccessControlUsers(token)
      .then((data) => {
        if (!isMounted) return
        const items = data.items ?? []
        setUsers(items)
        setSelectedUserId((current) => current ?? items[0]?.id ?? null)
        setErrorMessage('')
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error.message)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [token])

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return users
    }

    return users.filter((item) => {
      return [item.full_name, item.email, item.role, item.auth_source]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
  }, [query, users])

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) ?? null,
    [selectedUserId, users],
  )

  useEffect(() => {
    if (!selectedUser) {
      setDraft([])
      return
    }

    setDraft(buildDraftFromUser(selectedUser))
  }, [selectedUser])

  const stats = useMemo(() => ({
    totalUsers: users.length,
    ldapUsers: users.filter((item) => item.auth_source === 'LDAP').length,
    usersWithAccess: users.filter((item) => (item.access_grants ?? []).some((grant) => grant.is_active !== false)).length,
  }), [users])

  function handleToggleModule(moduleName, enabled) {
    setDraft((current) => current.map((item) => (item.module === moduleName ? { ...item, enabled } : item)))
  }

  function handleChangeAccessLevel(moduleName, accessLevel) {
    setDraft((current) => current.map((item) => (item.module === moduleName ? { ...item, accessLevel } : item)))
  }

  async function handleSave() {
    if (!selectedUser) return

    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    const payload = {
      grants: draft
        .filter((item) => item.enabled)
        .map((item) => ({
          module: item.module,
          access_level: item.accessLevel,
        })),
    }

    try {
      const savedUser = await updateAdminAccessControlUser(token, selectedUser.id, payload)
      setUsers((current) => current.map((item) => (item.id === savedUser.id ? savedUser : item)))
      setSuccessMessage('Acessos atualizados com sucesso.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedActiveModules = draft.filter((item) => item.enabled).length

  return (
    <div className="admin-view">
      <div className="admin-view-header">
        <div>
          <span className="eyebrow">Segurança e acesso</span>
          <h2>Delegação de acesso</h2>
          <p>Selecione um usuário sincronizado do AD e conceda acesso por módulo dentro da aplicação.</p>
        </div>
      </div>

      <div className="dashboard-stats-grid" style={{ marginBottom: 24 }}>
        <article className="stat-card"><span>Usuários</span><strong>{stats.totalUsers}</strong></article>
        <article className="stat-card"><span>AD sincronizados</span><strong>{stats.ldapUsers}</strong></article>
        <article className="stat-card"><span>Com acesso ativo</span><strong>{stats.usersWithAccess}</strong></article>
        <article className="stat-card"><span>Módulos do portal</span><strong>{ACCESS_MODULES.length}</strong></article>
      </div>

      {errorMessage ? <div className="form-error" style={{ marginBottom: 16 }}>{errorMessage}</div> : null}
      {successMessage ? <div className="form-success" style={{ marginBottom: 16 }}>{successMessage}</div> : null}

      <div className="admin-two-column-layout" style={{ display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 20 }}>
        <aside className="card-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <label className="field-label" htmlFor="access-control-search">Buscar usuário</label>
            <input
              id="access-control-search"
              className="text-input"
              placeholder="Nome, email, papel..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 640, overflow: 'auto' }}>
            {filteredUsers.length ? filteredUsers.map((item) => {
              const isActive = item.id === selectedUserId
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedUserId(item.id)}
                  style={{
                    textAlign: 'left',
                    padding: 14,
                    borderRadius: 16,
                    border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                    background: isActive ? '#f8fafc' : '#fff',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#0f172a', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                    {getInitials(item.full_name)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <strong style={{ fontSize: 14 }}>{item.full_name}</strong>
                      <span className="status-pill">{formatSource(item.auth_source)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{item.email}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{(item.access_grants ?? []).length} acesso(s) ativo(s)</div>
                  </div>
                </button>
              )
            }) : (
              <div style={{ padding: 16, color: '#64748b', background: '#f8fafc', borderRadius: 14 }}>
                Nenhum usuário sincronizado encontrado.
              </div>
            )}
          </div>
        </aside>

        <section className="card-panel" style={{ padding: 24 }}>
          {selectedUser ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                <div>
                  <span className="eyebrow">Usuário selecionado</span>
                  <h3 style={{ marginBottom: 8 }}>{selectedUser.full_name}</h3>
                  <p style={{ marginBottom: 0, color: '#64748b' }}>{selectedUser.email} • {selectedUser.role} • {formatSource(selectedUser.auth_source)}</p>
                </div>
                <div className="status-pill" style={{ alignSelf: 'flex-start' }}>{selectedActiveModules} módulo(s) ativo(s)</div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {draft.map((item) => {
                  const meta = ACCESS_MODULE_META[item.module]
                  return (
                    <div key={item.module} style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, background: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', flex: 1 }}>
                          <input
                            checked={item.enabled}
                            onChange={(event) => handleToggleModule(item.module, event.target.checked)}
                            type="checkbox"
                            style={{ marginTop: 4 }}
                          />
                          <div>
                            <strong style={{ display: 'block', marginBottom: 4 }}>{meta.label}</strong>
                            <span style={{ color: '#64748b', fontSize: 13 }}>{meta.description}</span>
                          </div>
                        </label>

                        <div style={{ minWidth: 160 }}>
                          <label className="field-label" htmlFor={`access-level-${item.module}`} style={{ marginBottom: 6 }}>Nível</label>
                          <select
                            id={`access-level-${item.module}`}
                            className="text-input"
                            disabled={!item.enabled}
                            value={item.accessLevel}
                            onChange={(event) => handleChangeAccessLevel(item.module, event.target.value)}
                          >
                            {ACCESS_LEVEL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginTop: 24 }}>
                <div style={{ color: '#64748b', fontSize: 13 }}>
                  O salvamento substitui os grants ativos do usuário selecionado.
                </div>
                <button className="primary-button" type="button" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar acesso'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
              Selecione um usuário para editar os acessos.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}