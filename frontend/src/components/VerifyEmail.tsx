import React from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const VerifyEmail: React.FC = () => {
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = React.useState<string>('Verificando...');

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Token no proporcionado');
      return;
    }

    const verify = async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/auth/verify?token=${encodeURIComponent(token)}`);
        const data = await resp.json();
        if (data.success) {
          setStatus('success');
          setMessage('Email verificado correctamente. Ya puedes iniciar sesión.');
        } else {
          setStatus('error');
          setMessage(data.message || 'No se pudo verificar el email');
        }
      } catch (e) {
        setStatus('error');
        setMessage('Error de red al verificar el email');
      }
    };

    verify();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Verificación de correo</n>
        {status === 'loading' && (
          <p className="text-gray-600">{message}</p>
        )}
        {status === 'success' && (
          <>
            <p className="text-green-700 mb-6">{message}</p>
            <a href="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Ir a iniciar sesión</a>
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

export default VerifyEmail;


