import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

export function AdminAccessButton() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (isAuthenticated && location.pathname.startsWith('/admin')) {
    return null
  }

  return (
    <Link className="admin-access-button" to={isAuthenticated ? '/admin' : '/admin/login'}>
      {isAuthenticated ? 'Portal Administrativo' : 'Acesso Administrativo'}
    </Link>
  )
}
