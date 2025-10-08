import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PracticeHub } from '../quiz/PracticeHub';
import { QuickPractice } from '../quiz/QuickPractice';

// Sistema de créditos v2 - Oct 2025
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

        {/* Simple dashboard - solo información esencial */}
      </div>
    </div>
  );
};
