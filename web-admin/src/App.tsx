import { I18nextProvider } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router-dom';
import i18n from './i18n';
import { AuthProvider } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { EventsPage } from './pages/EventsPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { PendingMembersPage } from './pages/PendingMembersPage';
import { PendingTrainerApplicationsPage } from './pages/PendingTrainerApplicationsPage';
import { ClubDashboardPage } from './pages/ClubDashboardPage';
import { TrainerDashboardPage } from './pages/TrainerDashboardPage';
import { MarketingHomePage } from './pages/MarketingHomePage';
import { MarketingPricingPage } from './pages/MarketingPricingPage';
import { MarketingContactPage } from './pages/MarketingContactPage';
import { MarketingPrivacyPage } from './pages/MarketingPrivacyPage';
import { MarketingTermsPage } from './pages/MarketingTermsPage';
import { ClubInsightsPage } from './pages/ClubInsightsPage';
import { ClubCafeOrdersPage } from './pages/ClubCafeOrdersPage';
import { ClubReservationRequestsPage } from './pages/ClubReservationRequestsPage';
import { TrainerStudentsPage } from './pages/TrainerStudentsPage';
import { SuperAdminDashboardPage } from './pages/SuperAdminDashboardPage';
import { SuperAdminTenantsPage } from './pages/SuperAdminTenantsPage';
import { SuperAdminUsersPage } from './pages/SuperAdminUsersPage';
import { SuperAdminTrainersPage } from './pages/SuperAdminTrainersPage';
import { SuperAdminAuditPage } from './pages/SuperAdminAuditPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import './admin.css';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MarketingHomePage />} />
      <Route path="/pricing" element={<MarketingPricingPage />} />
      <Route path="/contact" element={<MarketingContactPage />} />
      <Route path="/privacy" element={<MarketingPrivacyPage />} />
      <Route path="/terms" element={<MarketingTermsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute allowedRoles={['administrator']} />}>
        <Route path="/club/dashboard" element={<ClubDashboardPage />} />
        <Route path="/club/insights" element={<ClubInsightsPage />} />
        <Route path="/club/cafe-orders" element={<ClubCafeOrdersPage />} />
        <Route path="/club/reservation-requests" element={<ClubReservationRequestsPage />} />
        <Route path="/members/pending" element={<PendingMembersPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['platform_admin']} />}>
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboardPage />} />
        <Route path="/super-admin/tenants" element={<SuperAdminTenantsPage />} />
        <Route path="/super-admin/users" element={<SuperAdminUsersPage />} />
        <Route path="/super-admin/trainers" element={<SuperAdminTrainersPage />} />
        <Route path="/super-admin/audit" element={<SuperAdminAuditPage />} />
        <Route path="/platform/trainers/pending" element={<PendingTrainerApplicationsPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['trainer']} />}>
        <Route path="/trainer/dashboard" element={<TrainerDashboardPage />} />
        <Route path="/trainer/students" element={<TrainerStudentsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </I18nextProvider>
  );
}
