import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const PaymentReturn: React.FC = () => {
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = React.useState<string>('Procesando pago...');
  const { state } = useAuth();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Token no proporcionado');
      return;
    }

    // Flow notifica el pago vía webhook; aquí solo confirmamos
    setStatus('success');
    setMessage('¡Pago procesado! Tus créditos se acreditarán en breve.');
    
    // Opcional: refrescar saldo del usuario llamando /api/auth/me
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Resultado del pago</h1>
        {status === 'loading' && (
          <p className="text-gray-600">{message}</p>
        )}
        {status === 'success' && (
          <>
            <p className="text-green-700 mb-6">{message}</p>
            <p className="text-sm text-gray-600 mb-4">Redirigiendo al dashboard...</p>
            <a href="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Volver al dashboard</a>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-red-700 mb-6">{message}</p>
            <a href="/" className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Volver</a>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentReturn;

