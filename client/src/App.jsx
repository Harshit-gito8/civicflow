import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppShell from './components/AppShell';
import ReportIncident from './pages/ReportIncident';
import IncidentExplorer from './pages/IncidentExplorer';
import AdminCommand from './pages/AdminCommand';
import ContractorPortal from './pages/ContractorPortal';
import Analytics from './pages/Analytics';
import AuthPage from './pages/AuthPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-blue-500 font-mono text-xs">
        <span className="animate-pulse">VERIFYING DEPARTMENTAL CREDENTIALS...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto mt-24 p-8 bg-[#111B2B] rounded-xl text-center space-y-4 border border-rose-500/50 shadow-2xl">
        <h3 className="text-sm font-bold text-rose-400 font-mono uppercase tracking-wider">Departmental Authorization Required</h3>
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          Your current persona (<strong>{user.role}</strong>) does not have access permissions for this operational desk.
        </p>
        <p className="text-xs text-blue-400 font-semibold">
          Tip: Use the 1-Click Role Switcher in the top navigation bar to switch to <strong>{allowedRoles.join(' or ')}</strong>.
        </p>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppShell>
            <Routes>
              {/* localhost:5173 opens the login / auth portal directly */}
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/explore" element={<IncidentExplorer />} />
              <Route path="/report" element={<ReportIncident />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminCommand />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contractor"
                element={
                  <ProtectedRoute allowedRoles={['CONTRACTOR', 'ADMIN']}>
                    <ContractorPortal />
                  </ProtectedRoute>
                }
              />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </Routes>
          </AppShell>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
