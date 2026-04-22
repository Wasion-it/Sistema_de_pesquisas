import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { getAdminAccessControlUsers, updateAdminAccessControlUser } from '../services/admin'

const ROLE_OPTIONS = [
  {
    value: 'COLABORADOR',
    label: 'Colaborador',
    description: 'Acesso básico ao portal do colaborador',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    value: 'GESTOR',
    label: 'Gestor',
    description: 'Aprovação de admissão e demissão',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    value: 'DIRETOR_RAVI',
    label: 'Diretor Ravi',
    description: 'Aprovação executiva de solicitações',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    value: 'RH_ANALISTA',
    label: 'RH Analista',
    description: 'Gestão de admissão e demissão',
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    value: 'RH_PESQUISAS',
    label: 'RH Pesquisas',
    description: 'Gestão de pesquisas, campanhas e respostas',
    color: '#0f766e',
    bg: '#f0fdfa',
    border: '#99f6e4',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </svg>
    ),
  },
  {
    value: 'RH_ADMIN',
    label: 'RH Admin',
    description: 'Acesso completo ao portal administrativo',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
]

const ROLE_META = Object.fromEntries(ROLE_OPTIONS.map(r => [r.value, r]))

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ef4444, #dc2626)',
  'linear-gradient(135deg, #06b6d4, #0284c7)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #84cc16, #65a30d)',
]

function getGradient(name) {
  if (!name) return AVATAR_GRADIENTS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

function formatSource(source) {
  return source === 'LDAP' ? 'AD / LDAP' : 'Local'
}

export function AdminAccessControlPage() {
  const { token, user } = useAuth()

  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedRole, setSelectedRole] = useState('COLABORADOR')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    let isMounted = true
    getAdminAccessControlUsers(token)
      .then((data) => {
        if (!isMounted) return
        const items = data.items ?? []
        setUsers(items)
        setSelectedUserId(cur => cur ?? items[0]?.id ?? null)
        setErrorMessage('')
      })
      .catch((error) => { if (isMounted) setErrorMessage(error.message) })
      .finally(() => { if (isMounted) setIsLoading(false) })
    return () => { isMounted = false }
  }, [token])

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((item) => {
      const matchesRole = roleFilter === 'all' || item.role === roleFilter
      const matchesQuery = !q || [item.full_name, item.email, item.role, item.auth_source]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
      return matchesRole && matchesQuery
    })
  }, [query, roleFilter, users])

  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId) ?? null, [selectedUserId, users])

  useEffect(() => {
    setSelectedRole(selectedUser?.role ?? 'COLABORADOR')
    setSaveSuccess(false)
  }, [selectedUser])

  const stats = useMemo(() => {
    const byRole = {}
    users.forEach(u => { byRole[u.role] = (byRole[u.role] ?? 0) + 1 })
    return {
      total: users.length,
      ldap: users.filter(u => u.auth_source === 'LDAP').length,
      local: users.filter(u => u.auth_source !== 'LDAP').length,
      byRole,
    }
  }, [users])

  const hasChanged = selectedUser && selectedRole !== selectedUser.role
  const isForbidden = user && user.role !== 'RH_ADMIN'

  async function handleSave() {
    if (!selectedUser) return
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    setSaveSuccess(false)
    try {
      const saved = await updateAdminAccessControlUser(token, selectedUser.id, { role: selectedRole })
      setUsers(cur => cur.map(u => u.id === saved.id ? saved : u))
      setSuccessMessage('Acesso atualizado com sucesso.')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedRoleMeta = ROLE_META[selectedRole]
  const currentRoleMeta = selectedUser ? ROLE_META[selectedUser.role] : null

  if (isForbidden) {
    return <Navigate replace to="/admin" />
  }

  return (
    <div className="admin-view" style={{ gap: 20 }}>
      <style>{`
        .ac-user-item { transition: all 140ms ease; }
        .ac-user-item:hover { background: #f8fafc !important; }
        .ac-role-card { transition: all 140ms ease; cursor: pointer; }
        .ac-role-card:hover { transform: translateY(-1px); }
        @keyframes ac-slide-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ac-check { 0% { transform: scale(0); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }
        .ac-animated { animation: ac-slide-in 0.25s ease both; }
        .ac-check-anim { animation: ac-check 0.3s ease both; }
      `}</style>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <span className="eyebrow">Segurança e acesso</span>
          <h2 style={{ margin: '4px 0 8px', fontSize: 'clamp(1.4rem, 2.2vw, 1.85rem)' }}>Delegação de acesso</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
            Gerencie as permissões dos usuários sincronizados do Active Directory.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
        {[
          { label: 'Total de usuários', value: stats.total, color: '#3b82f6', accent: 'linear-gradient(90deg, #3b82f6, #60a5fa)' },
          { label: 'Via AD / LDAP', value: stats.ldap, color: '#8b5cf6', accent: 'linear-gradient(90deg, #8b5cf6, #a78bfa)' },
          { label: 'Locais', value: stats.local, color: '#64748b', accent: 'linear-gradient(90deg, #64748b, #94a3b8)' },
          { label: 'Admins RH', value: stats.byRole?.['RH_ADMIN'] ?? 0, color: '#16a34a', accent: 'linear-gradient(90deg, #16a34a, #22c55e)' },
          { label: 'Analistas RH', value: stats.byRole?.['RH_ANALISTA'] ?? 0, color: '#0284c7', accent: 'linear-gradient(90deg, #0284c7, #38bdf8)' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '16px 18px', borderRadius: 14, background: '#fff',
            border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.accent }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: '-.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Feedback */}
      {errorMessage && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 14 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {errorMessage}
        </div>
      )}

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>

        {/* ── Left: User list ── */}
        <div style={{ borderRadius: 18, background: '#fff', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,.04)' }}>
          {/* Search + filter */}
          <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                placeholder="Nome, email ou papel..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px 9px 34px',
                  border: '1.5px solid #e2e8f0', borderRadius: 10,
                  background: '#f8fafc', color: '#0f172a', fontSize: 13,
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = '#93c5fd'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc' }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  width: 18, height: 18, borderRadius: '50%', border: 'none',
                  background: '#cbd5e1', color: '#fff', cursor: 'pointer', fontSize: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
              )}
            </div>
            {/* Role filter chips */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[{ value: 'all', label: 'Todos' }, ...ROLE_OPTIONS.map(r => ({ value: r.value, label: r.label }))].map(opt => {
                const isActive = roleFilter === opt.value
                const meta = ROLE_META[opt.value]
                return (
                  <button key={opt.value} onClick={() => setRoleFilter(opt.value)} style={{
                    padding: '4px 10px', borderRadius: 999, border: `1px solid ${isActive ? (meta?.border ?? '#bfdbfe') : '#e2e8f0'}`,
                    background: isActive ? (meta?.bg ?? '#eff6ff') : 'transparent',
                    color: isActive ? (meta?.color ?? '#1d4ed8') : '#64748b',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>
                    {opt.label}
                    {opt.value !== 'all' && stats.byRole?.[opt.value] ? (
                      <span style={{ marginLeft: 4, opacity: .7 }}>({stats.byRole[opt.value]})</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          {/* User list */}
          <div style={{ maxHeight: 560, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 24, height: 24, border: '2.5px solid #dbeafe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                <span style={{ fontSize: 13, color: '#94a3b8' }}>Carregando usuários...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Nenhum usuário encontrado
              </div>
            ) : filteredUsers.map((user, idx) => {
              const isSelected = user.id === selectedUserId
              const roleMeta = ROLE_META[user.role] ?? ROLE_META.COLABORADOR
              return (
                <button
                  key={user.id}
                  className="ac-user-item"
                  onClick={() => setSelectedUserId(user.id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f8fafc',
                    border: 'none',
                    background: isSelected ? '#f0f9ff' : 'transparent',
                    borderLeft: `3px solid ${isSelected ? '#2563eb' : 'transparent'}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: getGradient(user.full_name),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, color: '#fff',
                    boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,.2)' : 'none',
                  }}>
                    {getInitials(user.full_name)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <strong style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#1e40af' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 140 }}>
                        {user.full_name}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '2px 7px', borderRadius: 999,
                        background: roleMeta.bg, border: `1px solid ${roleMeta.border}`,
                        color: roleMeta.color, fontSize: 10, fontWeight: 700,
                      }}>
                        {roleMeta.label}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatSource(user.auth_source)}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer count */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
              {filteredUsers.length} de {users.length} usuário{users.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ── Right: Edit panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!selectedUser ? (
            <div style={{
              borderRadius: 18, background: '#fff', border: '1px solid #e2e8f0',
              padding: '60px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, background: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16"/><path d="M6 12h12"/><path d="M8 17h8"/>
                </svg>
              </div>
              <strong style={{ fontSize: 15, color: '#475569' }}>Selecione um usuário</strong>
              <span style={{ fontSize: 13, color: '#94a3b8', maxWidth: 280, lineHeight: 1.65 }}>
                Escolha um usuário na lista à esquerda para gerenciar seu nível de acesso.
              </span>
            </div>
          ) : (
            <div className="ac-animated">
              {/* User identity card */}
              <div style={{
                borderRadius: 18, overflow: 'hidden',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 4px rgba(15,23,42,.04)',
                marginBottom: 14,
              }}>
                {/* Header gradient */}
                <div style={{
                  padding: '24px 24px 20px',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 70%, #1d4ed8 100%)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: -40, right: -40, width: 160, height: 160,
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,.2), transparent 70%)',
                    pointerEvents: 'none',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                      background: getGradient(selectedUser.full_name),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 800, color: '#fff',
                      boxShadow: '0 4px 14px rgba(0,0,0,.2)',
                    }}>
                      {getInitials(selectedUser.full_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                        {selectedUser.full_name}
                      </h3>
                      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgba(203,213,225,.85)' }}>{selectedUser.email}</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 11px', borderRadius: 999,
                          background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.16)',
                          color: 'rgba(226,232,240,.9)', fontSize: 11, fontWeight: 700,
                        }}>
                          {formatSource(selectedUser.auth_source)}
                        </span>
                        {currentRoleMeta && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 11px', borderRadius: 999,
                            background: `${currentRoleMeta.color}30`,
                            border: `1px solid ${currentRoleMeta.color}40`,
                            color: currentRoleMeta.color, fontSize: 11, fontWeight: 700,
                          }}>
                            {currentRoleMeta.icon}
                            {currentRoleMeta.label} (atual)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role selector */}
                <div style={{ padding: '20px 24px', background: '#fff' }}>
                  <div style={{ marginBottom: 14 }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'inherit' }}>
                      Nível de acesso
                    </h4>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                      Selecione o papel que define o que este usuário pode ver e fazer no portal.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {ROLE_OPTIONS.map(role => {
                      const isSelected = selectedRole === role.value
                      return (
                        <button
                          key={role.value}
                          className="ac-role-card"
                          onClick={() => setSelectedRole(role.value)}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            padding: '14px 14px',
                            borderRadius: 12,
                            border: `2px solid ${isSelected ? role.color : '#e2e8f0'}`,
                            background: isSelected ? role.bg : '#fafafa',
                            cursor: 'pointer', textAlign: 'left',
                            boxShadow: isSelected ? `0 0 0 3px ${role.color}18` : 'none',
                            position: 'relative',
                          }}
                        >
                          {/* Selected check */}
                          {isSelected && (
                            <div className="ac-check-anim" style={{
                              position: 'absolute', top: 8, right: 8,
                              width: 18, height: 18, borderRadius: '50%',
                              background: role.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            </div>
                          )}
                          <div style={{
                            flexShrink: 0, width: 34, height: 34, borderRadius: 9,
                            background: isSelected ? role.color : '#f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isSelected ? '#fff' : '#94a3b8',
                          }}>
                            {role.icon}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <strong style={{ display: 'block', fontSize: 13, fontWeight: 700, color: isSelected ? role.color : '#334155', marginBottom: 2 }}>
                              {role.label}
                            </strong>
                            <span style={{ fontSize: 11, color: isSelected ? role.color : '#94a3b8', lineHeight: 1.4, opacity: isSelected ? .85 : 1 }}>
                              {role.description}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Change indicator */}
                  {hasChanged && (
                    <div style={{
                      marginTop: 14, padding: '10px 14px', borderRadius: 10,
                      background: '#fffbeb', border: '1px solid #fde68a',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                      </svg>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#d97706' }}>
                        Mudança pendente: <strong>{currentRoleMeta?.label}</strong> → <strong>{selectedRoleMeta?.label}</strong>
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !hasChanged}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '10px 20px', borderRadius: 10,
                        border: 'none',
                        background: !hasChanged ? '#f1f5f9' : saveSuccess ? '#16a34a' : '#0f172a',
                        color: !hasChanged ? '#94a3b8' : '#fff',
                        fontSize: 13, fontWeight: 700,
                        cursor: isSaving || !hasChanged ? 'not-allowed' : 'pointer',
                        transition: 'all .2s ease',
                        minWidth: 160,
                      }}
                    >
                      {isSaving ? (
                        <>
                          <svg width="13" height="13" style={{ animation: 'spin .7s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                          </svg>
                          Salvando...
                        </>
                      ) : saveSuccess ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Salvo!
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17 21 17 13 7 13 7 21"/>
                            <polyline points="7 3 7 8 15 8"/>
                          </svg>
                          {hasChanged ? 'Salvar alterações' : 'Sem alterações'}
                        </>
                      )}
                    </button>

                    {hasChanged && (
                      <button
                        onClick={() => setSelectedRole(selectedUser.role)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '10px 16px', borderRadius: 10,
                          border: '1.5px solid #e2e8f0', background: '#fff',
                          color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Cancelar
                      </button>
                    )}

                    {successMessage && !isSaving && (
                      <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {successMessage}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Role permissions overview */}
              {selectedRoleMeta && (
                <div style={{
                  borderRadius: 14, padding: '16px 18px',
                  background: selectedRoleMeta.bg,
                  border: `1px solid ${selectedRoleMeta.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: selectedRoleMeta.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff',
                    }}>
                      {selectedRoleMeta.icon}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: 13, fontWeight: 700, color: selectedRoleMeta.color }}>{selectedRoleMeta.label}</strong>
                      <span style={{ fontSize: 12, color: selectedRoleMeta.color, opacity: .8 }}>{selectedRoleMeta.description}</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { label: 'Portal collab.', allowed: ['COLABORADOR', 'GESTOR', 'DIRETOR_RAVI', 'RH_ANALISTA', 'RH_PESQUISAS', 'RH_ADMIN'].includes(selectedRole) },
                      { label: 'Aprovações', allowed: ['GESTOR', 'DIRETOR_RAVI', 'RH_ADMIN'].includes(selectedRole) },
                      { label: 'Admissão', allowed: ['RH_ANALISTA', 'RH_ADMIN'].includes(selectedRole) },
                      { label: 'Demissão', allowed: ['RH_ANALISTA', 'RH_ADMIN'].includes(selectedRole) },
                      { label: 'Pesquisas', allowed: ['RH_PESQUISAS', 'RH_ADMIN'].includes(selectedRole) },
                      { label: 'Controle de acesso', allowed: ['RH_ADMIN'].includes(selectedRole) },
                    ].map(p => (
                      <div key={p.label} style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '8px 10px', borderRadius: 8,
                        background: p.allowed ? '#fff' : 'rgba(255,255,255,.4)',
                        border: `1px solid ${p.allowed ? selectedRoleMeta.border : 'transparent'}`,
                        opacity: p.allowed ? 1 : .5,
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                          background: p.allowed ? selectedRoleMeta.color : '#cbd5e1',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {p.allowed ? (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          ) : (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: p.allowed ? selectedRoleMeta.color : '#94a3b8' }}>{p.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}