import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card';
import { LoadingCard } from '../ui/LoadingSpinner';
import { useStudentMetrics } from '../../hooks/useDashboard';
import { AcademicCapIcon, ClockIcon, TrophyIcon, FireIcon } from '@heroicons/react/24/outline';

interface StudentMetricsCardProps {
  userId?: string;
}

export const StudentMetricsCard: React.FC<StudentMetricsCardProps> = ({ userId }) => {
  const { data: metrics, isLoading, error } = useStudentMetrics(userId);

  if (isLoading) {
    return <LoadingCard>Cargando métricas...</LoadingCard>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600">Error al cargar las métricas</p>
          <p className="text-sm text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">No hay métricas disponibles</p>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrophyIcon className="h-5 w-5 text-yellow-500" />
          Resumen de Progreso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Questions Answered */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <AcademicCapIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">
              {metrics.questionsAnswered}
            </div>
            <div className="text-sm text-gray-600">Preguntas</div>
          </div>

          {/* Success Rate */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <TrophyIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">
              {metrics.correctPercentage}%
            </div>
            <div className="text-sm text-gray-600">Aciertos</div>
          </div>

          {/* Study Streak */}
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <FireIcon className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-600">
              {metrics.studyStreak}
            </div>
            <div className="text-sm text-gray-600">Días seguidos</div>
          </div>

          {/* Study Time */}
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <ClockIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">
              {formatTime(metrics.totalStudyTime)}
            </div>
            <div className="text-sm text-gray-600">Tiempo total</div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Última actividad:</span>
              <span className="ml-2 font-medium">
                {formatDate(metrics.lastActivity)}
              </span>
            </div>
            {metrics.averageScore && (
              <div>
                <span className="text-gray-600">Promedio general:</span>
                <span className="ml-2 font-medium text-green-600">
                  {metrics.averageScore}%
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};