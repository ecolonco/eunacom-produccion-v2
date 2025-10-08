import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!formData.email || !formData.password) {
      setError('Por favor completa todos los campos');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.message || 'Error al iniciar sesión');
      }
    } catch (error) {
      setError('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = (type: 'admin' | 'student') => {
    if (type === 'admin') {
      setFormData({
        email: 'admin@eunacom.local',
        password: 'admin123',
      });
    } else {
      setFormData({
        email: 'estudiante@eunacom.local',
        password: 'admin123',
      });
    }
    setError('');
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Iniciar Sesión
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Correo Electrónico
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
        >
          {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
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

      {onSwitchToRegister && (
        <p className="mt-6 text-center text-sm text-gray-600">
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Regístrate aquí
          </button>
        </p>
      )}
    </div>
  );
};