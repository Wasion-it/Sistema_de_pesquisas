import { Link } from 'react-router-dom'

export function AdminAccessButton() {
  return (
    <Link className="admin-access-button" to="/admin/login">
      Acesso Administrativo
    </Link>
  )
}
