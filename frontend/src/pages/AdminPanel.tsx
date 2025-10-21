import React, { Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Lazy load admin components
const ExerciseFactory = React.lazy(() => import('../ExerciseFactory'));
const TaxonomyInventory = React.lazy(() => import('../components/TaxonomyInventory'));
const TaxonomyAdmin = React.lazy(() => import('../components/TaxonomyAdmin'));
const AdminUsersTable = React.lazy(() => import('../components/admin/AdminUsersTable'));
const ExerciseManagement = React.lazy(() => import('../components/admin/ExerciseManagement'));
const PaymentsTable = React.lazy(() => import('../components/admin/PaymentsTable'));
const QAControlPanel = React.lazy(() => import('../components/admin/QAControlPanel').then(m => ({ default: m.QAControlPanel })));
const QASweep2Panel = React.lazy(() => import('../components/admin/QASweep2Panel').then(m => ({ default: m.QASweep2Panel })));
const MockExamPercentageManager = React.lazy(() => import('../components/admin').then(m => ({ default: m.MockExamPercentageManager })));
const ManualTopicUpload = React.lazy(() => import('../components/admin/ManualTopicUpload'));

const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Cargando componente...</p>
    </div>
  </div>
);

export const AdminPanel: React.FC = () => {
  const { state, logout } = useAuth();
  const navigate = useNavigate();

  if (!state.user || state.user.role !== 'ADMIN') {
    return null;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/factory" element={<ExerciseFactory onBack={() => navigate('/admin')} />} />
        <Route path="/manual-upload" element={<ManualTopicUpload onBack={() => navigate('/admin')} />} />
        <Route path="/taxonomy-inventory" element={<TaxonomyInventory onBack={() => navigate('/admin')} />} />
        <Route path="/taxonomy-admin" element={<TaxonomyAdmin onBack={() => navigate('/admin')} />} />
        <Route path="/exercises" element={<ExerciseManagement onBack={() => navigate('/admin')} />} />
        <Route path="/users" element={<AdminUsersTable onBack={() => navigate('/admin')} />} />
        <Route path="/payments" element={<PaymentsTable onBack={() => navigate('/admin')} />} />
        <Route path="/qa-control" element={<QAControlPanel onBack={() => navigate('/admin')} />} />
        <Route path="/qa-sweep2" element={<QASweep2Panel onBack={() => navigate('/admin')} />} />
        <Route path="/mock-exam-percentages" element={<MockExamPercentageManager onBack={() => navigate('/admin')} />} />
        
        {/* Default admin menu */}
        <Route path="/" element={
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-8">
            <div className="bg-white shadow-md rounded-lg p-8 max-w-lg w-full text-center">
              <h2 className="text-2xl font-bold mb-2">Panel Administrativo</h2>
              <p className="text-gray-600 mb-6">Bienvenido, {state.user.firstName}.</p>
              <div className="space-y-3 text-left">
                <button className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700" onClick={() => navigate('/admin/factory')}>🏭 Fábrica de Ejercicios</button>
                <button className="w-full px-6 py-3 bg-lime-600 text-white rounded-md hover:bg-lime-700" onClick={() => navigate('/admin/manual-upload')}>🎯 Carga Manual por Tópico</button>
                <button className="w-full px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700" onClick={() => navigate('/admin/users')}>👥 Gestión de Usuarios</button>
                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={() => navigate('/admin/payments')}>💳 Pagos y Transacciones</button>
                <button className="w-full px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700" onClick={() => navigate('/admin/qa-control')}>🔍 Control QA - Variaciones</button>
                <button className="w-full px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700" onClick={() => navigate('/admin/qa-sweep2')}>🤖 QA Sweep 2.0 - IA Avanzada</button>
                <button className="w-full px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700" onClick={() => navigate('/admin/taxonomy-inventory')}>📊 Inventario de Taxonomía</button>
                <button className="w-full px-6 py-3 bg-amber-600 text-white rounded-md hover:bg-amber-700" onClick={() => navigate('/admin/taxonomy-admin')}>⚙️ Gestión de Taxonomía</button>
                <button className="w-full px-6 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700" onClick={() => navigate('/admin/mock-exam-percentages')}>📊 Distribución de Ensayos EUNACOM</button>
                <button className="w-full px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700" onClick={() => navigate('/admin/exercises')}>📋 Listado de Ejercicios</button>
                <button className="w-full px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700" onClick={logout}>🚪 Cerrar Sesión</button>
              </div>
            </div>
          </div>
        } />
      </Routes>
    </Suspense>
  );
};
