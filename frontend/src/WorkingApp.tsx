import React, { useState } from 'react';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';

// Simple App Content Component without complex logic
const AppContent: React.FC = () => {
  const { state } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  console.log('Auth State:', {
    isAuthenticated: state.isAuthenticated,
    hasUser: !!state.user,
    isLoading: state.isLoading
  });

  // If user is authenticated, show simple success message
  if (state.isAuthenticated && state.user) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-3xl font-bold text-green-600 mb-4">
            ✅ ¡Bienvenido, {state.user.firstName}!
          </h1>
          <p className="text-gray-600 mb-6">
            Has iniciado sesión correctamente como {state.user.role}.
          </p>
          <div className="space-y-4">
            <button
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={() => alert('Aquí irían los ejercicios de práctica')}
            >
              🎯 Practicar Ejercicios
            </button>
            <button
              className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              onClick={() => window.location.reload()}
            >
              🚪 Cerrar Sesión
            </button>
          </div>
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
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200 shadow-md"
            >
              🔑 Iniciar Sesión
            </button>
            <button
              onClick={() => {
                setAuthMode('register');
                setShowAuthModal(true);
              }}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-200 shadow-md"
            >
              📝 Registrarse
            </button>
          </div>
        </header>

        {/* Loading indicator */}
        {state.isLoading && (
          <div className="text-center">
            <p className="text-blue-600">Cargando...</p>
          </div>
        )}

        {/* Auth Modal */}
        {showAuthModal && (
          <AuthModal
            mode={authMode}
            onClose={() => setShowAuthModal(false)}
            onSwitchMode={(mode) => setAuthMode(mode)}
          />
        )}
      </div>
    </div>
  );
};

// Main App Component
const WorkingApp: React.FC = () => {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryProvider>
  );
};

export default WorkingApp;