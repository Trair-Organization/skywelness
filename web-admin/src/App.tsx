import { I18nextProvider } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router-dom';
import i18n from './i18n';
import { AuthProvider } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AllCampaignsPage } from './pages/AllCampaignsPage';
import { AllEventsPage } from './pages/AllEventsPage';
import { AllTrainersPage } from './pages/AllTrainersPage';
import { AllClubsPage } from './pages/AllClubsPage';
import { FeaturedClubsPage } from './pages/FeaturedClubsPage';
import { PublicDiscoverPage } from './pages/PublicDiscoverPage';
import { PublicRegisterPage } from './pages/PublicRegisterPage';
import { PartnerRegisterPage } from './pages/PartnerRegisterPage';
import { ClubProfilePage } from './pages/ClubProfilePage';
import { TrainerProfilePage } from './pages/TrainerProfilePage';
import { EventDetailPage } from './pages/EventDetailPage';
import { CampaignDetailPage } from './pages/CampaignDetailPage';
import { MemberDashboardPage } from './pages/MemberDashboardPage';
import { ServiceTermsPage } from './pages/ServiceTermsPage';
import { BookingSuccessPage } from './pages/BookingSuccessPage';
import { BookingCancelPage } from './pages/BookingCancelPage';
import { EventsPage } from './pages/EventsPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { DiscoveryManagementPage } from './pages/DiscoveryManagementPage';
import { MessagesPage } from './pages/MessagesPage';
import { LeadsPage } from './pages/LeadsPage';
import { MembersPage } from './pages/MembersPage';
import { SpaManagementPage } from './pages/SpaManagementPage';
import { UnifiedSchedulePage } from './pages/UnifiedSchedulePage';
import { PendingMembersPage } from './pages/PendingMembersPage';
import { PendingTrainerApplicationsPage } from './pages/PendingTrainerApplicationsPage';
import { ClubDashboardPage } from './pages/ClubDashboardPage';
import { ClubProfileEditPage } from './pages/ClubProfileEditPage';
import { PushNotificationsPage } from './pages/PushNotificationsPage';
import { CafeProductsPage } from './pages/CafeProductsPage';
import { TrainerEventsPage } from './pages/TrainerEventsPage';
import { TrainerDashboardPage } from './pages/TrainerDashboardPage';
import { TrainerAgendaPage } from './pages/TrainerAgendaPage';
import { TrainerEarningsPage } from './pages/TrainerEarningsPage';
import { TrainerStudentDetailPage } from './pages/TrainerStudentDetailPage';
import { TrainerProfileEditPage } from './pages/TrainerProfileEditPage';
import { TrainerServicesPage } from './pages/TrainerServicesPage';
import { MarketingHomePage } from './pages/MarketingHomePage';
import { MarketingPricingPage } from './pages/MarketingPricingPage';
import { MarketingContactPage } from './pages/MarketingContactPage';
import { MarketingPrivacyPage } from './pages/MarketingPrivacyPage';
import { MarketingTermsPage } from './pages/MarketingTermsPage';
import { TransactionCenterPage } from './pages/TransactionCenterPage';
import { ClubInsightsPage } from './pages/ClubInsightsPage';
import { ClubLogsPage } from './pages/ClubLogsPage';
import { ClubCafeOrdersPage } from './pages/ClubCafeOrdersPage';
import { ClubReservationRequestsPage } from './pages/ClubReservationRequestsPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { PtManagementPage } from './pages/PtManagementPage';
import { ResourceManagementPage } from './pages/ResourceManagementPage';
import { TrainerStudentsPage } from './pages/TrainerStudentsPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { ScheduleSlotsPage } from './pages/ScheduleSlotsPage';
import { ServiceCatalogPage } from './pages/ServiceCatalogPage';
import { SuperAdminEventsPage } from './pages/SuperAdminEventsPage';
import { SuperAdminDashboardPage } from './pages/SuperAdminDashboardPage';
import { SuperAdminTenantsPage } from './pages/SuperAdminTenantsPage';
import { SuperAdminUsersPage } from './pages/SuperAdminUsersPage';
import { SuperAdminTrainersPage } from './pages/SuperAdminTrainersPage';
import { SuperAdminAuditPage } from './pages/SuperAdminAuditPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import './admin.css';
import './public.css';
import './vitrin.css';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicDiscoverPage />} />
      <Route path="/discover" element={<PublicDiscoverPage />} />
      <Route path="/register" element={<PublicRegisterPage />} />
      <Route path="/partner-register" element={<PartnerRegisterPage />} />
      <Route path="/trainer-register" element={<PartnerRegisterPage />} />
      <Route path="/club/:subdomain" element={<ClubProfilePage />} />
      <Route path="/trainer/:trainerId" element={<TrainerProfilePage />} />
      <Route path="/event/:eventId" element={<EventDetailPage />} />
      <Route path="/campaign/:campaignId" element={<CampaignDetailPage />} />
      <Route path="/dashboard" element={<MemberDashboardPage />} />
      <Route path="/marketing" element={<MarketingHomePage />} />
      <Route path="/pricing" element={<MarketingPricingPage />} />
      <Route path="/contact" element={<MarketingContactPage />} />
      <Route path="/privacy" element={<MarketingPrivacyPage />} />
      <Route path="/terms" element={<MarketingTermsPage />} />
      <Route path="/service-terms" element={<ServiceTermsPage />} />
      <Route path="/booking-success" element={<BookingSuccessPage />} />
      <Route path="/booking-cancel" element={<BookingCancelPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/all-campaigns" element={<AllCampaignsPage />} />
      <Route path="/all-events" element={<AllEventsPage />} />
      <Route path="/all-trainers" element={<AllTrainersPage />} />
      <Route path="/all-clubs" element={<AllClubsPage />} />
      <Route path="/featured-clubs" element={<FeaturedClubsPage />} />
      <Route element={<ProtectedRoute allowedRoles={['administrator']} />}>
        <Route path="/club/dashboard" element={<ClubDashboardPage />} />
        <Route path="/club/profile" element={<ClubProfileEditPage />} />
        <Route path="/push-notifications" element={<PushNotificationsPage />} />
        <Route path="/cafe-products" element={<CafeProductsPage />} />
        <Route path="/club/insights" element={<ClubInsightsPage />} />
        <Route path="/club/logs" element={<ClubLogsPage />} />
        <Route path="/club/cafe-orders" element={<ClubCafeOrdersPage />} />
        <Route path="/club/reservation-requests" element={<ClubReservationRequestsPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/members/pending" element={<PendingMembersPage />} />
        <Route path="/trainers" element={<Navigate to="/pt" replace />} />
        <Route path="/therapists" element={<Navigate to="/spa" replace />} />
        <Route path="/pt" element={<PtManagementPage />} />
        <Route path="/schedule" element={<UnifiedSchedulePage />} />
        <Route path="/spa" element={<SpaManagementPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/resource-management" element={<ResourceManagementPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/schedule-slots" element={<ScheduleSlotsPage />} />
        <Route path="/services" element={<ServiceCatalogPage />} />
        <Route path="/transaction-center" element={<TransactionCenterPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['platform_admin']} />}>
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboardPage />} />
        <Route path="/super-admin/tenants" element={<SuperAdminTenantsPage />} />
        <Route path="/super-admin/users" element={<SuperAdminUsersPage />} />
        <Route path="/super-admin/trainers" element={<SuperAdminTrainersPage />} />
        <Route path="/super-admin/audit" element={<SuperAdminAuditPage />} />
        <Route path="/super-admin/push-notifications" element={<PushNotificationsPage />} />
        <Route path="/super-admin/discovery" element={<DiscoveryManagementPage />} />
        <Route path="/super-admin/messages" element={<MessagesPage />} />
        <Route path="/super-admin/leads" element={<LeadsPage />} />
        <Route path="/platform/trainers/pending" element={<PendingTrainerApplicationsPage />} />
        <Route path="/super-admin/events" element={<SuperAdminEventsPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['trainer']} />}>
        <Route path="/trainer/dashboard" element={<TrainerDashboardPage />} />
        <Route path="/trainer/agenda" element={<TrainerAgendaPage />} />
        <Route path="/trainer/earnings" element={<TrainerEarningsPage />} />
        <Route path="/trainer/profile" element={<TrainerProfileEditPage />} />
        <Route path="/trainer/services" element={<TrainerServicesPage />} />
        <Route path="/trainer/push-notifications" element={<PushNotificationsPage />} />
        <Route path="/trainer/students" element={<TrainerStudentsPage />} />
        <Route path="/trainer/students/:userId" element={<TrainerStudentDetailPage />} />
        <Route path="/trainer/messages" element={<MessagesPage />} />
        <Route path="/trainer/events" element={<TrainerEventsPage />} />
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
