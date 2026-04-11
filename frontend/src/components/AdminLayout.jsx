import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export function AdminLayout() {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()

  function handleSignOut() {
    signOut()
    navigate('/admin/login')
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand-block">
          <div className="admin-brand-logo">RH</div>
          <span className="admin-brand-name">Sistema de Pesquisas</span>
        </div>

        <nav className="admin-nav">
          <NavLink className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`} end to="/admin">
            <svg className="nav-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <rect height="9" rx="1.5" width="9" x="3" y="3" />
              <rect height="9" rx="1.5" width="9" x="14" y="3" />
              <rect height="9" rx="1.5" width="9" x="3" y="14" />
              <rect height="9" rx="1.5" width="9" x="14" y="14" />
            </svg>
            Início
          </NavLink>
          <NavLink className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`} to="/admin/dashboard">
            <svg className="nav-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 13l4-4 4 4 6-6 4 4" />
              <path d="M21 7v6h-6" />
            </svg>
            Indicadores
          </NavLink>
          <NavLink className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`} to="/admin/approvals">
            <svg className="nav-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 6h16" />
              <path d="M4 12h10" />
              <path d="M4 18h7" />
            </svg>
            Aprovações
          </NavLink>
          <NavLink className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`} to="/admin/surveys">
            <svg className="nav-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="3" x2="21" y1="6" y2="6" />
              <line x1="3" x2="21" y1="12" y2="12" />
              <line x1="3" x2="15" y1="18" y2="18" />
            </svg>
            Pesquisas
          </NavLink>
          <NavLink className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`} to="/admin/departments">
            <svg className="nav-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 21h16" />
              <path d="M6 21V7l6-4 6 4v14" />
              <path d="M9 10h.01" />
              <path d="M15 10h.01" />
              <path d="M9 14h.01" />
              <path d="M15 14h.01" />
            </svg>
            Departamentos
          </NavLink>
          <NavLink className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`} to="/admin/admission-requests">
            <svg className="nav-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M8 6h13" />
              <path d="M8 12h13" />
              <path d="M8 18h13" />
              <path d="M3 6h.01" />
              <path d="M3 12h.01" />
              <path d="M3 18h.01" />
            </svg>
            Admissão
          </NavLink>
          <NavLink className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`} to="/admin/dismissal-requests">
            <svg className="nav-icon" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M8 6h13" />
              <path d="M8 12h13" />
              <path d="M8 18h13" />
              <path d="M3 6h.01" />
              <path d="M3 12h.01" />
              <path d="M3 18h.01" />
            </svg>
            Demissão
          </NavLink>
        </nav>

        <div className="admin-user-card">
          <div className="admin-user-avatar">{getInitials(user?.full_name)}</div>
          <div className="admin-user-info">
            <strong>{user?.full_name}</strong>
            <span>{user?.email}</span>
          </div>
          <button aria-label="Sair da conta" className="admin-signout-button" onClick={handleSignOut} title="Sair" type="button">
            <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      <section className="admin-content">
        <Outlet />
      </section>
    </main>
  )
}
