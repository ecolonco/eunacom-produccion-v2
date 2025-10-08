import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { StudentMetricsCard } from './StudentMetricsCard';
import { StudyRecommendationsCard } from './StudyRecommendationsCard';
import { SpecialtyProgressCard } from './SpecialtyProgressCard';
import { PracticeHub } from '../quiz/PracticeHub';
import { QuickPractice } from '../quiz/QuickPractice';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card';
import {
  UserCircleIcon,
  CreditCardIcon,
  PlayIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

export const StudentDashboard: React.FC = () => {
  const { state, logout } = useAuth();
  const { user } = state;
  const [practiceView, setPracticeView] = useState<'none' | 'hub' | 'specialty' | 'random20' | 'random90'>('none');

  if (!user) return null;

  // If a practice view is open, show it instead of the dashboard
  if (practiceView === 'hub') {
    return <PracticeHub onClose={() => setPracticeView('none')} />;
  }

  if (practiceView === 'specialty') {
    return (
      <QuickPractice
        onClose={() => setPracticeView('none')}
        requireSpecialty
        title="Práctica por Especialidad"
      />
    );
  }

  if (practiceView === 'random20') {
    return (
      <QuickPractice
        onClose={() => setPracticeView('none')}
        maxQuestions={20}
        title="20 Preguntas Aleatorias"
      />
    );
  }

  if (practiceView === 'random90') {
    return (
      <QuickPractice
        onClose={() => setPracticeView('none')}
        maxQuestions={90}
        title="90 Preguntas Aleatorias - Simulacro"
      />
    );
  }

  const quickActions = [
    {
      icon: <PlayIcon className="h-6 w-6" />,
      title: 'Practica ejercicos aleatoriamente',
      description: 'Responde preguntas sueltas sin filtro',
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => setPracticeView('hub'),
    },
    {
      icon: <QuestionMarkCircleIcon className="h-6 w-6" />,
      title: '20 preguntas aleatorias',
      description: 'Completa un bloque de 20 preguntas mixtas',
      color: 'bg-teal-600 hover:bg-teal-700',
      action: () => setPracticeView('random20'),
    },
    {
      icon: <DocumentTextIcon className="h-6 w-6" />,
      title: 'Simulacro EUNACOM',
      description: 'Examen completo de práctica',
      color: 'bg-green-600 hover:bg-green-700',
      action: () => setPracticeView('hub'),
    },
    {
      icon: <ChartBarIcon className="h-6 w-6" />,
      title: 'Ver Progreso Detallado',
      description: 'Análisis completo de tu rendimiento',
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => setPracticeView('hub'),
    },
    {
      icon: <BookOpenIcon className="h-6 w-6" />,
      title: 'Práctica por Especialidad',
      description: 'Entrena una especialidad médica específica',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      action: () => setPracticeView('specialty'),
    },
    {
      icon: <DocumentTextIcon className="h-6 w-6" />,
      title: '90 preguntas - Simulacro completo',
      description: 'Simula un examen EUNACOM real con 90 preguntas',
      color: 'bg-green-600 hover:bg-green-700',
      action: () => setPracticeView('random90'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                ¡Bienvenido, {user.firstName}!
              </h1>
              <p className="text-gray-600 mt-1">
                🎓 Estudiante • {user.credits} créditos disponibles
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setPracticeView('hub')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                🎯 Practica ejercicos aleatoriamente
              </button>
              <button
                onClick={() => setPracticeView('random20')}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition duration-200"
              >
                🔢 Generar 20 preguntas
              </button>
              <button
                onClick={() => setPracticeView('specialty')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200"
              >
                🏥 Practicar por Especialidad
              </button>
              <button
                onClick={() => setPracticeView('random90')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
              >
                📋 Simulacro 90 Preguntas
              </button>
              <button
                onClick={() => logout()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200"
              >
                Cerrar Sesión
              </button>
            </div>
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
                  <div className="text-xs space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="font-semibold text-blue-700">🎲 Ejercicio aleatorio</p>
                      <p className="text-gray-600">1 crédito por pregunta</p>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded p-2">
                      <p className="font-semibold text-indigo-700">🏥 Por especialidad</p>
                      <p className="text-gray-600">1 crédito por pregunta</p>
                    </div>
                    <div className="bg-teal-50 border border-teal-200 rounded p-2">
                      <p className="font-semibold text-teal-700">📦 Paquete 20 preguntas</p>
                      <p className="text-gray-600">15 créditos (25% descuento)</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <p className="font-semibold text-green-700">🎁 Simulacro 90 preguntas</p>
                      <p className="text-gray-600">60 créditos (33% descuento)</p>
                    </div>
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
