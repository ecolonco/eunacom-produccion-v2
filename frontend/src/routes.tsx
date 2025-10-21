import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Components
import { VerifyEmail } from './components/VerifyEmail';
import { PaymentReturn } from './components/PaymentReturn';

// Lazy load for code splitting
const LandingPage = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const StudentDashboard = React.lazy(() => import('./components/dashboard/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel').then(m => ({ default: m.AdminPanel })));

// Loading fallback
const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Cargando...</p>
    </div>
  </div>
);

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = false,
  requireAdmin = false
}) => {
  const { state } = useAuth();

  if (state.isLoading) {
    return <LoadingFallback />;
  }

  if (requireAuth && !state.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && state.user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Main Router Component
export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/payment/return" element={<PaymentReturn />} />

        {/* Student Dashboard Routes */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute requireAuth={true}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requireAuth={true} requireAdmin={true}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
