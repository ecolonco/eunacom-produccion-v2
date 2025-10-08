import React, { useState } from 'react';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PracticeExercises from './PracticeExercises';

// Simple Login Modal Component
const SimpleLoginModal: React.FC<{
  onClose: () => void;
  mode: 'login' | 'register';
}> = ({ onClose, mode }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('estudiante@eunacom.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error en el login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        width: '400px',
        maxWidth: '90vw'
      }}>
        <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>
          {mode === 'login' ? '🔑 Iniciar Sesión' : '📝 Registrarse'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '5px'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '5px'
              }}
              required
            />
          </div>

          {error && (
            <div style={{ color: 'red', marginBottom: '15px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: loading ? '#ccc' : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Cargando...' : (mode === 'login' ? 'Entrar' : 'Registrar')}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px', color: '#666' }}>
          Credenciales de prueba ya completadas
        </p>
      </div>
    </div>
  );
};

// App Content Component
const AppContent: React.FC = () => {
  const { state, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'register'>('login');
  const [showPractice, setShowPractice] = useState(false);

  console.log('Auth State:', {
    isAuthenticated: state.isAuthenticated,
    hasUser: !!state.user,
    isLoading: state.isLoading,
    userRole: state.user?.role
  });

  // If user is authenticated and wants to practice
  if (state.isAuthenticated && state.user && showPractice) {
    return <PracticeExercises onBack={() => setShowPractice(false)} />;
  }

  // If user is authenticated
  if (state.isAuthenticated && state.user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e8f5e8 0%, #f0fff0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '500px',
          width: '90vw'
        }}>
          <h1 style={{
            color: '#2e7d32',
            marginBottom: '20px',
            fontSize: '28px'
          }}>
            ✅ ¡Bienvenido, {state.user.firstName}!
          </h1>

          <p style={{
            color: '#666',
            marginBottom: '30px',
            fontSize: '16px'
          }}>
            Has iniciado sesión correctamente como <strong>{state.user.role}</strong>.
          </p>

          <div style={{ marginBottom: '15px' }}>
            <button
              onClick={() => setShowPractice(true)}
              style={{
                width: '100%',
                padding: '15px 25px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              🎯 Practicar Ejercicios
            </button>
          </div>

          <div>
            <button
              onClick={logout}
              style={{
                width: '100%',
                padding: '12px 25px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Landing page
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '20px'
          }}>
            🩺 EUNACOM Learning Platform
          </h1>

          <p style={{
            fontSize: '20px',
            color: '#666',
            marginBottom: '40px'
          }}>
            Plataforma de preparación EUNACOM con IA
          </p>

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setModalMode('login');
                setShowModal(true);
              }}
              style={{
                padding: '15px 30px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              🔑 Iniciar Sesión
            </button>

            <button
              onClick={() => {
                setModalMode('register');
                setShowModal(true);
              }}
              style={{
                padding: '15px 30px',
                backgroundColor: '#388e3c',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(56, 142, 60, 0.3)',
                transition: 'all 0.2s'
              }}
            >
              📝 Registrarse
            </button>
          </div>
        </header>

        {state.isLoading && (
          <div style={{ marginTop: '20px' }}>
            <p style={{ color: '#1976d2', fontSize: '18px' }}>🔄 Cargando...</p>
          </div>
        )}

        {showModal && (
          <SimpleLoginModal
            mode={modalMode}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </div>
  );
};

// Main Functional App Component
const FunctionalApp: React.FC = () => {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryProvider>
  );
};

export default FunctionalApp;