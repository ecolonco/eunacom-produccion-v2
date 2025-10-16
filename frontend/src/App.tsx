import React, { useState } from 'react';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { LoginForm } from './components/LoginForm';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import ExerciseFactory from './ExerciseFactory';
import TaxonomyInventory from './components/TaxonomyInventory';
import TaxonomyAdmin from './components/TaxonomyAdmin';
import AdminUsersTable from './components/admin/AdminUsersTable';
import ExerciseManagement from './components/admin/ExerciseManagement';
import PaymentsTable from './components/admin/PaymentsTable';
import { QAControlPanel } from './components/admin/QAControlPanel';
import { QASweep2Panel } from './components/admin/QASweep2Panel';
import './App.css';

// Main App Content Component - Deploy trigger
const AppContent: React.FC = () => {
  const { state, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const [apiData, setApiData] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'exercise-factory'>('dashboard');
  const [adminView, setAdminView] = useState<'menu' | 'factory' | 'taxonomyInventory' | 'taxonomyAdmin' | 'exerciseManagement' | 'adminUsers' | 'payments' | 'qaControl' | 'qaSweep2'>('menu');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Debug logging
  React.useEffect(() => {
    console.log('Auth State Changed:', {
      isAuthenticated: state.isAuthenticated,
      hasUser: !!state.user,
      isLoading: state.isLoading,
      userId: state.user?.id
    });
  }, [state.isAuthenticated, state.user, state.isLoading]);

  // Debug modal state
  React.useEffect(() => {
    console.log('showAuthModal changed:', showAuthModal, 'authMode:', authMode);
  }, [showAuthModal, authMode]);

  // Check for payment success parameter
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      setShowPaymentSuccess(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  React.useEffect(() => {
    // Test API connection
    const testAPI = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';
        const response = await fetch(`${API_BASE}/`);
        if (response.ok) {
          const data = await response.json();
          setApiData(data);
          setApiStatus('✅ Connected');
        } else {
          setApiStatus('❌ Error connecting');
        }
      } catch (error) {
        setApiStatus('❌ Backend not available');
        console.error('API Error:', error);
      }
    };

    testAPI();
  }, []);

  // Show Exercise Factory if selected
  if (state.isAuthenticated && state.user && currentView === 'exercise-factory') {
    return <ExerciseFactory onBack={() => setCurrentView('dashboard')} />;
  }

  // Show dashboard if user is authenticated
  if (state.isAuthenticated && state.user) {
    console.log('Showing Dashboard for user:', state.user.firstName, 'Role:', state.user.role);
    
    // Show StudentDashboard ONLY for students
    if (state.user.role === 'STUDENT') {
      return <StudentDashboard />;
    }
    
    // Panel completo para ADMIN/otros roles
    if (adminView === 'factory') {
      return <ExerciseFactory onBack={() => setAdminView('menu')} />;
    }
    if (adminView === 'taxonomyInventory') {
      return <TaxonomyInventory onBack={() => setAdminView('menu')} />;
    }
    if (adminView === 'taxonomyAdmin') {
      return <TaxonomyAdmin onBack={() => setAdminView('menu')} />;
    }
    if (adminView === 'exerciseManagement') {
      return <ExerciseManagement onBack={() => setAdminView('menu')} />;
    }
    if (adminView === 'adminUsers') {
      return <AdminUsersTable onBack={() => setAdminView('menu')} />;
    }
    if (adminView === 'payments') {
      return <PaymentsTable onBack={() => setAdminView('menu')} />;
    }

    if (adminView === 'qaControl') {
      return <QAControlPanel onBack={() => setAdminView('menu')} />;
    }
    if (adminView === 'qaSweep2') {
      return <QASweep2Panel onBack={() => setAdminView('menu')} />;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-8">
        <div className="bg-white shadow-md rounded-lg p-8 max-w-lg w-full text-center">
          <h2 className="text-2xl font-bold mb-2">Panel Administrativo</h2>
          <p className="text-gray-600 mb-6">Bienvenido, {state.user.firstName}.</p>
          <div className="space-y-3 text-left">
            <button className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700" onClick={() => setAdminView('factory')}>🏭 Fábrica de Ejercicios</button>
            <button className="w-full px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700" onClick={() => setAdminView('adminUsers')}>👥 Gestión de Usuarios</button>
            <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={() => setAdminView('payments')}>💳 Pagos y Transacciones</button>
            <button className="w-full px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700" onClick={() => setAdminView('qaControl')}>🔍 Control QA - Variaciones</button>
            <button className="w-full px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700" onClick={() => setAdminView('qaSweep2')}>🤖 QA Sweep 2.0 - IA Avanzada</button>
            <button className="w-full px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700" onClick={() => setAdminView('taxonomyInventory')}>📊 Inventario de Taxonomía</button>
            <button className="w-full px-6 py-3 bg-amber-600 text-white rounded-md hover:bg-amber-700" onClick={() => setAdminView('taxonomyAdmin')}>⚙️ Gestión de Taxonomía</button>
            <button className="w-full px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700" onClick={() => setAdminView('exerciseManagement')}>📋 Listado de Ejercicios</button>
            <button className="w-full px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700" onClick={logout}>🚪 Cerrar Sesión</button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading spinner
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando EUNACOM...</p>
        </div>
      </div>
    );
  }

  // Show landing page with auth buttons
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🩺 EUNACOM Learning Platform
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Prepárate para el EUNACOM practicando con ejercicios explicados y contenido curado
          </p>

          {/* Auth Buttons */}
          <div className="flex flex-wrap justify-center items-center gap-4 mb-8">
            <button
              onClick={() => {
                console.log('Login button clicked');
                setAuthMode('login');
                setShowAuthModal(true);
                console.log('Modal should be open now');
              }}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200 shadow-md"
            >
              🔑 Iniciar Sesión
            </button>
            <button
              onClick={() => {
                console.log('Register button clicked');
                setAuthMode('register');
                setShowAuthModal(true);
                console.log('Modal should be open now');
              }}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-200 shadow-md"
            >
              📝 Registrarse
            </button>
            <a
              href="/faq.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition duration-200 shadow-md"
            >
              ❓ Preguntas Frecuentes
            </a>
          </div>
          {/* Benefits */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6 border border-blue-100">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Por qué prepararte aquí</h2>
              <ul className="text-left text-gray-700 space-y-2 list-disc list-inside">
                <li>Más de <strong>10.000 ejercicios</strong> con <strong>explicación</strong> clara.</li>
                <li><strong>Prueba gratis</strong>: accede a <strong>1 control de 15 preguntas</strong> sin costo.</li>
                <li><strong>Sólo prepago</strong>: sin contratos ni planes mensuales.</li>
                <li>Progreso y recomendaciones para optimizar tu estudio.</li>
              </ul>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
                  className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-200 shadow-md"
                >
                  🚀 Probar 1 control gratis
                </button>
                <button
                  onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200 shadow-md"
                >
                  🔑 Ya tengo cuenta
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto">

          {/* Features Overview */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🎯 Beneficios clave
            </h2>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 border-2 border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">📘 Ejercicios explicados</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• +10.000 ejercicios con explicación</li>
                  <li>• Dificultades y especialidades médicas</li>
                  <li>• Revisión y actualización continua</li>
                </ul>
              </div>

              <div className="p-4 border-2 border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">🆓 Prueba gratis</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 1 control de 15 preguntas gratis para evaluar la plataforma</li>
                  <li>• Sin tarjeta para probar</li>
                  <li>• Empieza en minutos</li>
                </ul>
              </div>

              <div className="p-4 border-2 border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">💳 Prepago flexible</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Sólo pagas por lo que usas</li>
                  <li>• Sin contratos ni mensualidades</li>
                  <li>• Control de créditos y consumo</li>
                </ul>
              </div>
            </div>
          </div>

          {/* FAQ Link - Subtle text link after benefits */}
          <div className="text-center mb-6">
            <a
              href="/faq.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 underline text-sm font-medium"
            >
              ¿Tienes dudas? Consulta nuestras Preguntas Frecuentes →
            </a>
          </div>

          {/* Login Form Section */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              🔐 Iniciar Sesión
            </h2>
            <div className="max-w-md mx-auto">
              <LoginForm 
                onSuccess={() => {
                  // Login handled by AuthContext
                }}
                onSwitchToRegister={() => setShowAuthModal(true)}
              />
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-gray-200">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex flex-wrap justify-center gap-6 mb-4">
                <a
                  href="/faq.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-purple-600 transition duration-200"
                >
                  Preguntas Frecuentes
                </a>
                <a
                  href="mailto:contacto@eunacom.cl"
                  className="text-gray-600 hover:text-purple-600 transition duration-200"
                >
                  Contacto
                </a>
                <a
                  href="/terminos.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-purple-600 transition duration-200"
                >
                  Términos y Condiciones
                </a>
              </div>
              <p className="text-sm text-gray-500">
                © 2025 EUNACOM Learning Platform. Todos los derechos reservados.
              </p>
            </div>
          </footer>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />

      {/* Payment Success Modal */}
      {showPaymentSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-600 mb-4">
                ¡Pago Exitoso!
              </h2>
              <p className="text-gray-700 mb-6">
                Tu pago ha sido procesado correctamente. Los créditos han sido acreditados a tu cuenta.
              </p>
              <button
                onClick={() => setShowPaymentSuccess(false)}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component with Providers
function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;