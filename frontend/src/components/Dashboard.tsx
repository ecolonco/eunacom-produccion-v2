import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import TaxonomyInventory from './TaxonomyInventory';
import { ControlsDashboard } from './student/ControlsDashboard';

export const Dashboard: React.FC = () => {
  const { state, logout } = useAuth();
  const { user } = state;
  const [showTaxonomyInventory, setShowTaxonomyInventory] = useState(false);
  const [showControls, setShowControls] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'ADMIN';

  // Show taxonomy inventory if requested
  if (showTaxonomyInventory) {
    return <TaxonomyInventory onBack={() => setShowTaxonomyInventory(false)} />;
  }

  // Show controls dashboard if requested
  if (showControls) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => setShowControls(false)}
            className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ← Volver al Dashboard
          </button>
          <ControlsDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header with user info and logout */}
        <header className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                ¡Bienvenido, {user.firstName}!
              </h1>
              <p className="text-gray-600 mt-1">
                {isAdmin ? '👨‍⚕️ Administrador' : '🎓 Estudiante'} • {user.credits} créditos disponibles
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200"
            >
              Cerrar Sesión
            </button>
          </div>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📋 Tu Perfil
            </h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Nombre:</strong> {user.firstName} {user.lastName}</p>
              <p><strong>Rol:</strong> {user.role}</p>
              <p><strong>ID:</strong> {user.id}</p>
            </div>
          </div>

          {/* Credits Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              💰 Sistema de Créditos
            </h2>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {user.credits}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Créditos disponibles
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Pregunta individual: 1 crédito</p>
                <p>• Simulacro completo: 80 créditos</p>
                <p>• Revisión de tema: 15 créditos</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              🚀 Acciones Rápidas
            </h2>
            <div className="space-y-3">
              <button 
                onClick={() => setShowControls(true)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
              >
                📝 Controles (15 preguntas)
              </button>
              <button className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-200">
                🧠 Práctica Individual
              </button>
              <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition duration-200">
                📊 Ver Progreso
              </button>
            </div>
          </div>

          {/* Admin Panel - Only show for admins */}
          {isAdmin && (
            <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2 lg:col-span-3">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                ⚙️ Panel de Administración
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                <button className="bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition duration-200">
                  👥 Gestionar Usuarios
                </button>
                <button className="bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 transition duration-200">
                  ❓ Gestionar Preguntas
                </button>
                <button
                  onClick={() => setShowTaxonomyInventory(true)}
                  className="bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition duration-200"
                >
                  📊 Inventario Taxonomía
                </button>
                <button className="bg-teal-600 text-white py-3 px-4 rounded-md hover:bg-teal-700 transition duration-200">
                  📈 Ver Estadísticas
                </button>
                <button className="bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition duration-200">
                  🔧 Configuración
                </button>
              </div>
            </div>
          )}

          {/* Stats Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📊 Estadísticas
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Preguntas respondidas:</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Promedio de aciertos:</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tiempo de estudio:</span>
                <span className="font-semibold">0h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Racha actual:</span>
                <span className="font-semibold">0 días</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📝 Actividad Reciente
            </h2>
            <div className="text-center text-gray-500 py-8">
              <p className="text-4xl mb-2">🌟</p>
              <p>¡Empieza tu primera sesión de práctica!</p>
              <p className="text-sm mt-2">
                Tu historial de actividades aparecerá aquí
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            🎯 Sistema EUNACOM
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Base de Conocimientos</h3>
              <p className="text-gray-600">
                • 3 Especialidades médicas<br />
                • 2 Temas de estudio<br />
                • 2 Preguntas de práctica<br />
                • 1 Quiz disponible
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Funcionalidades</h3>
              <p className="text-gray-600">
                • Sistema de créditos<br />
                • Seguimiento de progreso<br />
                • Repetición espaciada<br />
                • Simulacros EUNACOM
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Tu Cuenta</h3>
              <p className="text-gray-600">
                • Cuenta verificada: ✅<br />
                • Plan: Gratuito<br />
                • Miembro desde: Hoy<br />
                • Estado: Activo ✅
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};