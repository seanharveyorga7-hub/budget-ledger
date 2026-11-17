import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import { ProtectedRoute, RequireRole } from './components/RoleGuards';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Indicators from './pages/Indicators';
import Ledger from './pages/Ledger';
import Settings from './pages/Settings';
import { ROLES } from './utils/constants';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="indicators" element={<Indicators />} />
              <Route path="ledger" element={<Ledger />} />
              <Route
                path="settings"
                element={
                  <RequireRole role={ROLES.SYS_ADMIN}>
                    <Settings />
                  </RequireRole>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
