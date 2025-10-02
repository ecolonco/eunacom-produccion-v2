import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { StudentMetricsCard } from './StudentMetricsCard';
import { StudyRecommendationsCard } from './StudyRecommendationsCard';
import { SpecialtyProgressCard } from './SpecialtyProgressCard';
import { PracticeHub } from '../quiz/PracticeHub';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card';
import {
  UserCircleIcon,
  CreditCardIcon,
  PlayIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

export const StudentDashboard: React.FC = () => {
  const { state, logout } = useAuth();
  const { user } = state;
  const [showPracticeHub, setShowPracticeHub] = useState(false);

  if (!user) return null;

  // If practice hub is open, show it instead of dashboard
  if (showPracticeHub) {
    return <PracticeHub onClose={() => setShowPracticeHub(false)} />;
  }

  const quickActions = [
    {
      icon: <PlayIcon className="h-6 w-6" />,
      title: 'Práctica Rápida',
      description: 'Responde preguntas aleatorias',
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => setShowPracticeHub(true),
    },
    {
      icon: <DocumentTextIcon className="h-6 w-6" />,
      title: 'Simulacro EUNACOM',
      description: 'Examen completo de práctica',
      color: 'bg-green-600 hover:bg-green-700',
      action: () => setShowPracticeHub(true),
    },
    {
      icon: <ChartBarIcon className="h-6 w-6" />,
      title: 'Ver Progreso Detallado',
      description: 'Análisis completo de tu rendimiento',
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => setShowPracticeHub(true),
    },
    {
      icon: <BookOpenIcon className="h-6 w-6" />,
      title: 'Revisar Temas',
      description: 'Estudiar especialidades específicas',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      action: () => setShowPracticeHub(true),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                ¡Bienvenido, {user.firstName}!
              </h1>
              <p className="text-gray-600 mt-1">
                🎓 Estudiante • {user.credits} créditos disponibles
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Student Metrics */}
            <StudentMetricsCard />

            {/* Specialty Progress */}
            <SpecialtyProgressCard />
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircleIcon className="h-5 w-5 text-gray-600" />
                  Tu Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Nombre:</strong> {user.firstName} {user.lastName}</p>
                  <p><strong>Rol:</strong> {user.role}</p>
                  <p><strong>ID:</strong> {user.id}</p>
                </div>
              </CardContent>
            </Card>

            {/* Credits Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5 text-green-600" />
                  Sistema de Créditos
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>🚀 Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className={`w-full ${action.color} text-white p-3 rounded-md transition duration-200 flex items-start gap-3 text-left`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {action.icon}
                      </div>
                      <div>
                        <div className="font-medium">{action.title}</div>
                        <div className="text-sm opacity-90">{action.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Row - Study Recommendations */}
        <div className="mt-6">
          <StudyRecommendationsCard />
        </div>

        {/* Footer Info */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            🎯 Sistema EUNACOM
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Base de Conocimientos</h3>
              <p className="text-gray-600">
                • Especialidades médicas completas<br />
                • Temas actualizados<br />
                • Preguntas tipo EUNACOM<br />
                • Simulacros reales
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Funcionalidades</h3>
              <p className="text-gray-600">
                • Dashboard personalizado<br />
                • Recomendaciones IA<br />
                • Seguimiento detallado<br />
                • Análisis de especialidades
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Tu Cuenta</h3>
              <p className="text-gray-600">
                • Cuenta verificada: ✅<br />
                • Plan: Gratuito<br />
                • Dashboard: Activo ✅<br />
                • Datos en tiempo real: ✅
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};