import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth/AuthProvider'
import { AdminLayout } from './components/AdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminCampaignKpisPage } from './pages/AdminCampaignKpisPage'
import { AdminCampaignResponsesPage } from './pages/AdminCampaignResponsesPage'
import { AdminDepartmentsPage } from './pages/AdminDepartmentsPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminDashboardPesquisasPage } from './pages/AdminDashboardPesquisasPage'
import { AdminDashboardAdmissaoPage } from './pages/AdminDashboardAdmissaoPage'
import { AdminRequestsPage } from './pages/AdminRequestsPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminJobTitlesPage } from './pages/AdminJobTitlesPage'
import { AdminAdmissionRequestsPage } from './pages/AdminAdmissionRequestsPage'
import { AdminAdmissionChecklistPage } from './pages/AdminAdmissionChecklistPage'
import { AdminDismissalRequestsPage } from './pages/AdminDismissalRequestsPage'
import { MyRequestsPage } from './pages/MyRequestsPage'
import { AdminSurveyDetailPage } from './pages/AdminSurveyDetailPage'
import { AdminSurveysPage } from './pages/AdminSurveysPage'
import { AdminHomePage } from './pages/AdminHomePage'
import { AdminApprovalsPage } from './pages/AdminApprovalsPage'
import { HomePage } from './pages/HomePage'
import { AdmissaoFormPage } from './pages/AdmissaoFormPage'
import { RequestsPage } from './pages/RequestsPage'
import { DemissaoFormPage } from './pages/DemissaoFormPage'
import { SurveysPage } from './pages/SurveysPage'
import { PublicCampaignPage } from './pages/PublicCampaignPage'
import { PublicCampaignThankYouPage } from './pages/PublicCampaignThankYouPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/solicitacoes"
            element={
              <ProtectedRoute>
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/solicitacoes/admissao"
            element={
              <ProtectedRoute>
                <AdmissaoFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/solicitacoes/demissao"
            element={
              <ProtectedRoute>
                <DemissaoFormPage />
              </ProtectedRoute>
            }
          />
          <Route path="/pesquisas" element={<SurveysPage />} />
          <Route path="/campaigns/:campaignId" element={<PublicCampaignPage />} />
          <Route path="/campaigns/:campaignId/thank-you" element={<PublicCampaignThankYouPage />} />
          <Route
            path="/my-requests"
            element={
              <ProtectedRoute>
                <MyRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminHomePage />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="dashboard/pesquisas" element={<AdminDashboardPesquisasPage />} />
            <Route path="dashboard/admissao" element={<AdminDashboardAdmissaoPage />} />
            <Route path="requests" element={<AdminRequestsPage />} />
            <Route path="approvals" element={<AdminApprovalsPage />} />
            <Route path="departments" element={<AdminDepartmentsPage />} />
            <Route path="job-titles" element={<AdminJobTitlesPage />} />
            <Route path="admission-requests" element={<AdminAdmissionRequestsPage />} />
            <Route path="admission-checklist" element={<AdminAdmissionChecklistPage />} />
            <Route path="dismissal-requests" element={<AdminDismissalRequestsPage />} />
            <Route path="surveys" element={<AdminSurveysPage />} />
            <Route path="campaigns/:campaignId/kpis" element={<AdminCampaignKpisPage />} />
            <Route path="campaigns/:campaignId/responses" element={<AdminCampaignResponsesPage />} />
            <Route path="surveys/:surveyId" element={<AdminSurveyDetailPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
