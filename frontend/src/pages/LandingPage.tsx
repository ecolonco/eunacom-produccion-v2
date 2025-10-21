import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { LoginForm } from '../components/LoginForm';

export const LandingPage: React.FC = () => {
  const { state } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Redirect authenticated users
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      if (state.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [state.isAuthenticated, state.user, navigate]);

  // Check for payment success parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      setShowPaymentSuccess(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8" role="banner">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">
            EUNACOM Test
          </h1>
          <p className="text-2xl text-gray-600 mb-4">
            Plataforma de Preparación
          </p>
          <p className="text-xl text-gray-600 mb-6">
            Prepárate para el EUNACOM practicando con ejercicios explicados y contenido curado
          </p>

          {/* Auth Buttons */}
          <div className="flex flex-wrap justify-center items-center gap-4 mb-8">
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

        <main role="main">
          <div className="max-w-4xl mx-auto">

          {/* Login Form Section */}
          <section id="login" aria-labelledby="login-title" className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 id="login-title" className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Iniciar Sesión
            </h2>
            <div className="max-w-md mx-auto">
              <LoginForm 
                onSuccess={() => {}}
                onSwitchToRegister={() => setShowAuthModal(true)}
              />
            </div>
          </section>

          </div>
        </main>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200" role="contentinfo">
          <div className="max-w-4xl mx-auto text-center">
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
    </>
  );
};
