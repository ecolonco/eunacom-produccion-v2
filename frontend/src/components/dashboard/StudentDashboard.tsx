import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PracticeHub } from '../quiz/PracticeHub';
import { QuickPractice } from '../quiz/QuickPractice';
import { ControlsDashboard } from '../student/ControlsDashboard';
import { ExamsDashboard } from '../student/ExamsDashboard';
import { MockExamsDashboard } from '../student/MockExamsDashboard';
import { PerformancePanel } from '../student/PerformancePanel';

// Sistema de créditos v2 - Oct 2025
export const StudentDashboard: React.FC = () => {
  const { state, logout } = useAuth();
  const { user } = state;
  const [practiceView, setPracticeView] = useState<'none' | 'hub' | 'specialty' | 'controls' | 'exams' | 'mock-exams' | 'performance'>('none');

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

  if (practiceView === 'controls') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => setPracticeView('none')}
            className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ← Volver al Dashboard
          </button>
          <ControlsDashboard />
        </div>
      </div>
    );
  }

  if (practiceView === 'exams') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
        <div className="container mx-auto px-4 py-8">
          <ExamsDashboard onBack={() => setPracticeView('none')} />
        </div>
      </div>
    );
  }

  if (practiceView === 'mock-exams') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100">
        <div className="container mx-auto px-4 py-8">
          <MockExamsDashboard onBack={() => setPracticeView('none')} />
        </div>
      </div>
    );
  }

  if (practiceView === 'performance') {
    return <PerformancePanel onBack={() => setPracticeView('none')} />;
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
              onClick={() => setPracticeView('controls')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 font-medium"
            >
              📝 Controles (15 preguntas) - Sin créditos
            </button>
            <button
              onClick={() => setPracticeView('exams')}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition duration-200 font-medium"
            >
              🎓 Pruebas (45 preguntas) - Sin créditos
            </button>
            <button
              onClick={() => setPracticeView('mock-exams')}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 font-medium"
            >
              🎯 Ensayos EUNACOM (180 preguntas) - Sin créditos
            </button>
            <button
              onClick={() => setPracticeView('performance')}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 transition duration-200 font-medium"
            >
              📊 Mi Rendimiento - Ver estadísticas
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
