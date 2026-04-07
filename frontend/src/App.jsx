import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AdminAccessButton } from './components/AdminAccessButton'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { HomePage } from './pages/HomePage'

export default function App() {
  return (
    <BrowserRouter>
      <AdminAccessButton />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
      </Routes>
    </BrowserRouter>
  )
}
