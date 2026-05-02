import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from './auth/AuthProvider'
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
import { AdminDismissalChecklistPage } from './pages/AdminDismissalChecklistPage'
import { AdminDismissalRequestsPage } from './pages/AdminDismissalRequestsPage'
import { AdminAccessControlPage } from './pages/AdminAccessControlPage'
import { AdminAuditLogsPage } from './pages/AdminAuditLogsPage'
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
import { hasAdminSectionAccess, hasModuleAccess } from './utils/accessControl'

function AdminModuleRoute({ children, moduleName }) {
  const { user } = useAuth()
  const canAccess = hasModuleAccess(user, moduleName)

  if (!canAccess) {
    return <Navigate replace to="/admin" />
  }

  return children
}

function AdminSectionRoute({ children, sectionName }) {
  const { user } = useAuth()
  const canAccess = hasAdminSectionAccess(user, sectionName)

  if (!canAccess) {
    return <Navigate replace to="/admin" />
  }

  return children
}

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
          <Route
            path="/solicitacoes/approvals"
            element={
              <Navigate replace to="/admin/approvals" />
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
            <Route path="dashboard" element={<AdminModuleRoute moduleName="DASHBOARD"><AdminDashboardPage /></AdminModuleRoute>} />
            <Route path="dashboard/pesquisas" element={<AdminModuleRoute moduleName="SURVEYS"><AdminDashboardPesquisasPage /></AdminModuleRoute>} />
            <Route path="dashboard/admissao" element={<AdminModuleRoute moduleName="DASHBOARD"><AdminDashboardAdmissaoPage /></AdminModuleRoute>} />
            <Route path="requests" element={<AdminModuleRoute moduleName="ADMISSION"><AdminRequestsPage /></AdminModuleRoute>} />
            <Route path="approvals" element={<AdminModuleRoute moduleName="APPROVALS"><AdminApprovalsPage /></AdminModuleRoute>} />
            <Route path="departments" element={<AdminSectionRoute sectionName="DEPARTMENTS"><AdminDepartmentsPage /></AdminSectionRoute>} />
            <Route path="job-titles" element={<AdminSectionRoute sectionName="JOB_TITLES"><AdminJobTitlesPage /></AdminSectionRoute>} />
            <Route path="admission-requests" element={<AdminModuleRoute moduleName="ADMISSION"><AdminAdmissionRequestsPage /></AdminModuleRoute>} />
            <Route path="admission-checklist" element={<AdminModuleRoute moduleName="ADMISSION"><AdminAdmissionChecklistPage /></AdminModuleRoute>} />
            <Route path="dismissal-requests" element={<AdminModuleRoute moduleName="DISMISSAL"><AdminDismissalRequestsPage /></AdminModuleRoute>} />
            <Route path="dismissal-checklist" element={<AdminModuleRoute moduleName="DISMISSAL"><AdminDismissalChecklistPage /></AdminModuleRoute>} />
            <Route path="surveys" element={<AdminModuleRoute moduleName="SURVEYS"><AdminSurveysPage /></AdminModuleRoute>} />
            <Route path="campaigns/:campaignId/kpis" element={<AdminModuleRoute moduleName="SURVEYS"><AdminCampaignKpisPage /></AdminModuleRoute>} />
            <Route path="campaigns/:campaignId/responses" element={<AdminModuleRoute moduleName="SURVEYS"><AdminCampaignResponsesPage /></AdminModuleRoute>} />
            <Route path="surveys/:surveyId" element={<AdminModuleRoute moduleName="SURVEYS"><AdminSurveyDetailPage /></AdminModuleRoute>} />
            <Route path="access-control" element={<AdminSectionRoute sectionName="ACCESS_CONTROL"><AdminAccessControlPage /></AdminSectionRoute>} />
            <Route path="audit-logs" element={<AdminSectionRoute sectionName="AUDIT_LOGS"><AdminAuditLogsPage /></AdminSectionRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
