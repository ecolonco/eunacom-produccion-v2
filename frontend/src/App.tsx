import React, { useState } from 'react';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { LoginForm } from './components/LoginForm';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import ExerciseFactory from './ExerciseFactory';
import './App.css';

// Main App Content Component
const AppContent: React.FC = () => {
  const { state } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const [apiData, setApiData] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'exercise-factory'>('dashboard');

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
    
    // Vista simple para ADMIN/otros roles (evitar reload infinito)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white shadow-md rounded-lg p-8 max-w-lg w-full text-center">
          <h2 className="text-2xl font-bold mb-4">Panel Administrativo (temporal)</h2>
          <p className="text-gray-600 mb-6">Bienvenido, {state.user.firstName}. Esta es una vista provisional para administradores.</p>
          <div className="space-y-3">
            <button
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={() => setCurrentView('exercise-factory')}
            >
              Ir a Exercise Factory
            </button>
            <button
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              onClick={() => alert('Más secciones de administración próximamente')}
            >
              Próximamente: Gestión de contenido
            </button>
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
            Plataforma de preparación EUNACOM con IA
          </p>

          {/* Auth Buttons */}
          <div className="flex justify-center gap-4 mb-8">
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
          </div>
        </header>

        <div className="max-w-4xl mx-auto">
          {/* MVP Status Card */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🚀 Estado del MVP
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Backend API</span>
                  <span className="text-sm">{apiStatus}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Frontend React</span>
                  <span className="text-sm">✅ Running</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Database</span>
                  <span className="text-sm">✅ PostgreSQL + Redis</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">Authentication</span>
                  <span className="text-sm">✅ Fully Functional</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">API Information</h3>
                {apiData && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <pre className="text-sm text-gray-600">
                      {JSON.stringify(apiData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Features Overview */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🎯 Funcionalidades del MVP
            </h2>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 border-2 border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">👤 Gestión de Usuarios</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Registro y autenticación ✅</li>
                  <li>• Perfiles de estudiante ✅</li>
                  <li>• Sistema de créditos ✅</li>
                </ul>
              </div>

              <div className="p-4 border-2 border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">📚 Base de Conocimientos</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Especialidades médicas ✅</li>
                  <li>• Taxonomía de temas ✅</li>
                  <li>• Preguntas EUNACOM ✅</li>
                </ul>
              </div>

              <div className="p-4 border-2 border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">🧠 Sistema de Práctica</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Quizzes adaptativos ✅</li>
                  <li>• Simulacros EUNACOM ✅</li>
                  <li>• Seguimiento de progreso ✅</li>
                </ul>
              </div>
            </div>
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

          {/* Test Credentials */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🔐 Credenciales de Prueba
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Administrador</h3>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Email:</strong> admin@eunacom.local
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Password:</strong> admin123
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Estudiante Demo</h3>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Email:</strong> estudiante@eunacom.local
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Password:</strong> admin123
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
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