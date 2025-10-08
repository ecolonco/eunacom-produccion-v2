import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PracticeHub } from '../quiz/PracticeHub';
import { QuickPractice } from '../quiz/QuickPractice';

// Sistema de créditos v2 - Oct 2025
export const StudentDashboard: React.FC = () => {
  const { state, logout } = useAuth();
  const { user } = state;
  const [practiceView, setPracticeView] = useState<'none' | 'hub' | 'random' | 'specialty' | 'random20' | 'random90'>('none');

  if (!user) return null;

  // If a practice view is open, show it instead of the dashboard
  if (practiceView === 'hub') {
    return <PracticeHub onClose={() => setPracticeView('none')} />;
  }

  if (practiceView === 'random') {
    return (
      <QuickPractice
        onClose={() => setPracticeView('none')}
        title="Práctica Aleatoria"
      />
    );
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              ¡Bienvenido, {user.firstName}!
            </h1>
            <p className="text-gray-600 mt-1">
              🎓 Estudiante • {user.credits} créditos disponibles
            </p>
          </div>
          
          <div className="space-y-3 max-w-md mx-auto">
            <button
              onClick={() => setPracticeView('random')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 font-medium"
            >
              🎯 Practica ejercicios aleatoriamente (1 crédito)
            </button>
            <button
              onClick={() => setPracticeView('random20')}
              className="w-full px-6 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition duration-200 font-medium"
            >
              🔢 20 Preguntas aleatoriamente (15 créditos)
            </button>
            <button
              onClick={() => setPracticeView('specialty')}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200 font-medium"
            >
              🏥 Practicar por Especialidad (1 crédito)
            </button>
            <button
              onClick={() => setPracticeView('random90')}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 font-medium"
            >
              📋 90 preguntas tipo Eunacom (60 créditos)
            </button>
            <button
              onClick={() => logout()}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 font-medium"
            >
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* Simple dashboard - solo información esencial */}
      </div>
    </div>
  );
};
