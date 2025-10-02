import React from 'react';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider } from './contexts/AuthContext';

const TestSimpleLogin: React.FC = () => {
  return (
    <QueryProvider>
      <AuthProvider>
        <div style={{ padding: '40px', backgroundColor: '#e3f2fd', minHeight: '100vh' }}>
          <h1 style={{ color: '#1976d2', fontSize: '36px', textAlign: 'center' }}>
            🩺 EUNACOM Learning Platform
          </h1>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button
              style={{
                padding: '15px 30px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                cursor: 'pointer',
                marginRight: '20px'
              }}
              onClick={() => alert('Login clicked!')}
            >
              🔑 Iniciar Sesión
            </button>
            <button
              style={{
                padding: '15px 30px',
                backgroundColor: '#388e3c',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                cursor: 'pointer'
              }}
              onClick={() => alert('Register clicked!')}
            >
              📝 Registrarse
            </button>
          </div>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '16px', color: '#666' }}>
            Simplified login interface for testing
          </p>
        </div>
      </AuthProvider>
    </QueryProvider>
  );
};

export default TestSimpleLogin;