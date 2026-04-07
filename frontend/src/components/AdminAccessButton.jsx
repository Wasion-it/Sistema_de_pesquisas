import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'

export function AdminAccessButton() {
  const { isAuthenticated } = useAuth()

  return (
    <Link className="admin-access-button" to={isAuthenticated ? '/admin' : '/admin/login'}>
      {isAuthenticated ? 'Portal Administrativo' : 'Acesso Administrativo'}
    </Link>
  )
}
