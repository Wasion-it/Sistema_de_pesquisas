import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

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
          <span className="eyebrow">Portal Administrativo</span>
          <h1>Sistema de Pesquisas</h1>
          <p>Operacao interna do RH para pesquisas organizacionais.</p>
        </div>

        <nav className="admin-nav">
          <NavLink className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`} end to="/admin">
            Dashboard
          </NavLink>
          <NavLink className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`} to="/admin/surveys">
            Pesquisas
          </NavLink>
        </nav>

        <div className="admin-user-card">
          <strong>{user?.full_name}</strong>
          <span>{user?.role}</span>
          <span>{user?.email}</span>
          <button className="secondary-button" onClick={handleSignOut} type="button">
            Sair
          </button>
        </div>
      </aside>

      <section className="admin-content">
        <Outlet />
      </section>
    </main>
  )
}
