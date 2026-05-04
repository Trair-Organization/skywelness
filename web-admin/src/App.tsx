import { I18nextProvider } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router-dom';
import i18n from './i18n';
import { AuthProvider } from './auth/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { EventsPage } from './pages/EventsPage';
import { PendingMembersPage } from './pages/PendingMembersPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import './admin.css';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/members/pending" element={<PendingMembersPage />} />
        <Route path="/events" element={<EventsPage />} />
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
