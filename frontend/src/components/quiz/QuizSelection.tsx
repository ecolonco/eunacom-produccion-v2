import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card';
import { LoadingCard } from '../ui/LoadingSpinner';
import { useAvailableQuizzes, useStartSimulation } from '../../hooks/useQuiz';
import { useAuth } from '../../contexts/AuthContext';
import {
  DocumentTextIcon,
  ClockIcon,
  AcademicCapIcon,
  CreditCardIcon,
  TrophyIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface QuizSelectionProps {
  onQuizStart?: (session: any) => void;
  onClose?: () => void;
}

export const QuizSelection: React.FC<QuizSelectionProps> = ({ onQuizStart, onClose }) => {
  const { state } = useAuth();
  const { user } = state;

  const { data: quizzes, isLoading, error } = useAvailableQuizzes();
  const { mutate: startSimulation, isLoading: isStarting, error: startError } = useStartSimulation();

  const handleStartQuiz = (quizId: string, creditsRequired: number) => {
    if (!user || user.credits < creditsRequired) {
      return;
    }

    startSimulation(quizId, {
      onSuccess: (session) => {
        onQuizStart?.(session);
      }
    });
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600">Debes iniciar sesión para acceder a los simulacros</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <LoadingCard>Cargando simulacros disponibles...</LoadingCard>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600">Error al cargar los simulacros</p>
          <p className="text-sm text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-green-500" />
              Simulacros EUNACOM
            </CardTitle>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCardIcon className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">Tu Saldo de Créditos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-900">{user.credits}</span>
              <span className="text-sm text-blue-600">créditos disponibles</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quiz List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes?.map((quiz) => {
          const canAfford = user.credits >= quiz.creditsRequired;
          const cardClass = canAfford
            ? "border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200"
            : "border-gray-200 bg-gray-50 opacity-75";

          return (
            <Card key={quiz.id} className={cardClass}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-gray-900 mb-2">
                      {quiz.title}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                      <AcademicCapIcon className="h-4 w-4" />
                      <span>{quiz.specialty}</span>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    canAfford ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {quiz.creditsRequired} créditos
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {quiz.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      <DocumentTextIcon className="h-4 w-4" />
                      Preguntas
                    </span>
                    <span className="font-medium">{quiz.questionCount}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      <ClockIcon className="h-4 w-4" />
                      Tiempo límite
                    </span>
                    <span className="font-medium">{formatTime(quiz.timeLimit)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      <TrophyIcon className="h-4 w-4" />
                      Puntaje mínimo
                    </span>
                    <span className="font-medium">{quiz.passingScore}%</span>
                  </div>
                </div>

                <button
                  onClick={() => handleStartQuiz(quiz.id, quiz.creditsRequired)}
                  disabled={!canAfford || isStarting}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-colors ${
                    canAfford
                      ? 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <PlayIcon className="h-4 w-4" />
                  {isStarting ? 'Iniciando...' : canAfford ? 'Comenzar Simulacro' : 'Créditos Insuficientes'}
                </button>

                {!canAfford && (
                  <p className="text-xs text-red-600 mt-2 text-center">
                    Necesitas {quiz.creditsRequired - user.credits} créditos más
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No quizzes available */}
      {quizzes?.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay simulacros disponibles
            </h3>
            <p className="text-gray-600">
              Pronto habrá más simulacros disponibles para practicar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Start Error */}
      {startError && (
        <Card>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 font-medium">Error al iniciar simulacro</p>
              <p className="text-red-600 text-sm mt-1">
                {startError instanceof Error ? startError.message : 'Error desconocido'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📋 Instrucciones para Simulacros</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Los simulacros son exámenes completos que simulan el EUNACOM real</li>
            <li>• Cada simulacro tiene un tiempo límite específico</li>
            <li>• Las preguntas son seleccionadas aleatoriamente de la base de datos</li>
            <li>• Al finalizar, recibirás un reporte detallado de tu rendimiento</li>
            <li>• Los créditos se descuentan al iniciar el simulacro (no se reembolsan)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};