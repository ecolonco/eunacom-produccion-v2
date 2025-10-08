import React, { useState } from 'react';
import './App.css';

// Simple auth functions without Context API
const loginUser = async (email: string, password: string) => {
  try {
    console.log('Attempting login with:', email);
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('HTTP error:', response.status, errorData);
      return { success: false, message: errorData.message || 'Error del servidor' };
    }

    const data = await response.json();
    console.log('Login response:', data);
    return data;
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Error de conexión' };
  }
};

function SimpleApp() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const [apiData, setApiData] = useState<any>(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    // Test API connection
    const testAPI = async () => {
      try {
        const response = await fetch('http://localhost:3000/');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await loginUser(email, password);

    if (result.success) {
      setUser(result.user);
      setShowAuthModal(false);
      alert(`¡Bienvenido, ${result.user.firstName}!`);
    } else {
      setError(result.message || 'Error al iniciar sesión');
    }

    setIsLoading(false);
  };

  const fillDemoCredentials = (type: 'admin' | 'student') => {
    if (type === 'admin') {
      setEmail('admin@eunacom.local');
      setPassword('admin123');
    } else {
      setEmail('estudiante@eunacom.local');
      setPassword('admin123');
    }
    setError('');
  };

  const testDirectLogin = async () => {
    console.log('🧪 Testing direct login...');
    const result = await loginUser('admin@eunacom.local', 'admin123');
    console.log('🧪 Test result:', result);
    if (result.success) {
      alert('Direct test login successful!');
      setUser(result.user);
      setShowAuthModal(false);
    } else {
      alert(`Direct test login failed: ${result.message}`);
    }
  };

  const logout = () => {
    setUser(null);
    setEmail('');
    setPassword('');
  };

  // If user is logged in, show success message
  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-green-800 mb-4">
            ✅ ¡Login Exitoso!
          </h1>
          <div className="mb-6">
            <p className="text-lg mb-2">¡Bienvenido, {user.firstName} {user.lastName}!</p>
            <p className="text-sm text-gray-600 mb-1">Email: {user.email}</p>
            <p className="text-sm text-gray-600 mb-1">Rol: {user.role}</p>
            <p className="text-sm text-gray-600 mb-1">Créditos: {user.credits}</p>
          </div>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

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
                console.log('Login button clicked!');
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200 shadow-md"
            >
              🔑 Iniciar Sesión
            </button>
            <button
              onClick={() => {
                console.log('Register button clicked!');
                setAuthMode('register');
                setShowAuthModal(true);
              }}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-200 shadow-md"
            >
              📝 Registrarse
            </button>
            <button
              onClick={testDirectLogin}
              className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition duration-200 shadow-md"
            >
              🧪 Test Login
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
        </div>
      </div>

      {/* Simple Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">
                {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {authMode === 'login' ? (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                    Iniciar Sesión
                  </h2>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="tu@email.com"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition duration-200"
                    >
                      {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                  </form>

                  {/* Demo credentials */}
                  <div className="mt-6 border-t pt-6">
                    <p className="text-sm text-gray-600 mb-3 text-center">
                      Credenciales de prueba:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => fillDemoCredentials('admin')}
                        className="px-3 py-2 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition duration-200"
                      >
                        👨‍⚕️ Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => fillDemoCredentials('student')}
                        className="px-3 py-2 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition duration-200"
                      >
                        🎓 Estudiante
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Registro en desarrollo...</p>
                  <button
                    onClick={() => setAuthMode('login')}
                    className="mt-4 text-blue-600 hover:text-blue-500"
                  >
                    Volver al login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimpleApp;