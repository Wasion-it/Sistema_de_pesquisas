import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth/AuthProvider'
import { AdminAccessButton } from './components/AdminAccessButton'
import { AdminLayout } from './components/AdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminSurveyDetailPage } from './pages/AdminSurveyDetailPage'
import { AdminSurveysPage } from './pages/AdminSurveysPage'
import { HomePage } from './pages/HomePage'
import { PublicCampaignPage } from './pages/PublicCampaignPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAccessButton />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/campaigns/:campaignId" element={<PublicCampaignPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="surveys" element={<AdminSurveysPage />} />
            <Route path="surveys/:surveyId" element={<AdminSurveyDetailPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
