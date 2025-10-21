import React, { useState } from 'react';
import { QuickPractice } from './QuickPractice';
import { QuizSelection } from './QuizSelection';
import { Card, CardContent } from '../ui/Card';
import {
  PlayIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

type PracticeView = 'home' | 'quick-practice' | 'quiz-selection' | 'quiz-session' | 'review';

interface PracticeHubProps {
  onClose?: () => void;
}

export const PracticeHub: React.FC<PracticeHubProps> = ({ onClose }) => {
  const [currentView, setCurrentView] = useState<PracticeView>('home');
  const [quizSession, setQuizSession] = useState(null);

  const practiceOptions = [
    {
      id: 'quick-practice',
      title: 'Práctica Rápida',
      description: 'Responde preguntas individuales para mejorar tus conocimientos',
      icon: <PlayIcon className="h-8 w-8" />,
      color: 'bg-blue-600 hover:bg-blue-700',
      cost: '1 crédito por pregunta'
    },
    {
      id: 'quiz-selection',
      title: 'Simulacro EUNACOM',
      description: 'Examen completo de práctica con tiempo límite',
      icon: <DocumentTextIcon className="h-8 w-8" />,
      color: 'bg-green-600 hover:bg-green-700',
      cost: '80 créditos por simulacro'
    },
    {
      id: 'review',
      title: 'Revisar Temas',
      description: 'Estudiar especialidades y temas específicos',
      icon: <BookOpenIcon className="h-8 w-8" />,
      color: 'bg-purple-600 hover:bg-purple-700',
      cost: '15 créditos por sesión'
    },
    {
      id: 'progress',
      title: 'Ver Progreso Detallado',
      description: 'Análisis completo de tu rendimiento',
      icon: <ChartBarIcon className="h-8 w-8" />,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      cost: 'Gratis'
    }
  ];

  const handleOptionSelect = (optionId: string) => {
    setCurrentView(optionId as PracticeView);
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setQuizSession(null);
  };

  const handleQuizStart = (session: any) => {
    setQuizSession(session);
    setCurrentView('quiz-session');
  };

  const renderHeader = () => {
    if (currentView === 'home') {
      return (
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            🎯 Centro de Práctica EUNACOM
          </h1>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Volver al Dashboard
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBackToHome}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {currentView === 'quick-practice' && 'Práctica Rápida'}
          {currentView === 'quiz-selection' && 'Seleccionar Simulacro'}
          {currentView === 'quiz-session' && 'Simulacro en Progreso'}
          {currentView === 'review' && 'Revisar Temas'}
        </h1>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'quick-practice':
        return <QuickPractice onClose={handleBackToHome} />;

      case 'quiz-selection':
        return <QuizSelection onQuizStart={handleQuizStart} onClose={handleBackToHome} />;

      case 'quiz-session':
        return (
          <Card>
            <CardContent className="text-center py-12">
              <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Componente de Simulacro en Desarrollo
              </h3>
              <p className="text-gray-600 mb-4">
                El componente para ejecutar simulacros estará disponible próximamente.
              </p>
              <button
                onClick={handleBackToHome}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Volver a Práctica
              </button>
            </CardContent>
          </Card>
        );

      case 'review':
      case 'progress':
        return (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpenIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Funcionalidad en Desarrollo
              </h3>
              <p className="text-gray-600 mb-4">
                Esta funcionalidad estará disponible en una próxima actualización.
              </p>
              <button
                onClick={handleBackToHome}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Volver a Práctica
              </button>
            </CardContent>
          </Card>
        );

      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {practiceOptions.map((option) => (
              <Card
                key={option.id}
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => handleOptionSelect(option.id)}
              >
                <CardContent className="p-6">
                  <div className={`w-16 h-16 ${option.color} rounded-lg flex items-center justify-center text-white mb-4 mx-auto`}>
                    {option.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                    {option.title}
                  </h3>
                  <p className="text-gray-600 text-center mb-4">
                    {option.description}
                  </p>
                  <div className="text-center">
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {option.cost}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {renderHeader()}
        {renderContent()}
      </div>
    </div>
  );
};