import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../ui/Card';
import { LoadingCard } from '../ui/LoadingSpinner';
import { useSpecialtyProgress } from '../../hooks/useDashboard';
import {
  AcademicCapIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface SpecialtyProgressCardProps {
  userId?: string;
}

export const SpecialtyProgressCard: React.FC<SpecialtyProgressCardProps> = ({ userId }) => {
  const { data: specialties, isLoading, error } = useSpecialtyProgress(userId);

  if (isLoading) {
    return <LoadingCard>Cargando progreso por especialidad...</LoadingCard>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600">Error al cargar el progreso por especialidad</p>
          <p className="text-sm text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!specialties || specialties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AcademicCapIcon className="h-5 w-5 text-blue-500" />
            Progreso por Especialidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AcademicCapIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No hay progreso registrado</p>
            <p className="text-sm text-gray-400">
              Comienza a practicar para ver tu progreso por especialidad
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getProgressIcon = (percentage: number) => {
    if (percentage >= 80) return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    if (percentage >= 60) return <TrophyIcon className="h-5 w-5 text-yellow-500" />;
    return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
  };

  const formatDate = (dateString: string | null): string => {
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
          <AcademicCapIcon className="h-5 w-5 text-blue-500" />
          Progreso por Especialidad
        </CardTitle>
        <CardDescription>
          Tu rendimiento en cada área de conocimiento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {specialties
            .sort((a, b) => b.correctPercentage - a.correctPercentage)
            .map((specialty) => (
              <div
                key={specialty.id}
                className={`p-4 rounded-lg border-2 ${getProgressColor(specialty.correctPercentage)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getProgressIcon(specialty.correctPercentage)}
                    <h4 className="font-medium text-gray-900">
                      {specialty.specialtyName}
                    </h4>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {specialty.correctPercentage}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {specialty.questionsAnswered} preguntas
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        specialty.correctPercentage >= 80
                          ? 'bg-green-500'
                          : specialty.correctPercentage >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${specialty.correctPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Last Practiced */}
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                  <ClockIcon className="h-3 w-3" />
                  <span>Última práctica: {formatDate(specialty.lastPracticed)}</span>
                </div>

                {/* Strengths and Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {specialty.strengths.length > 0 && (
                    <div>
                      <div className="font-medium text-green-700 mb-1">Fortalezas:</div>
                      <ul className="text-green-600 space-y-1">
                        {specialty.strengths.slice(0, 3).map((strength, index) => (
                          <li key={index} className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {specialty.weaknesses.length > 0 && (
                    <div>
                      <div className="font-medium text-red-700 mb-1">Debilidades:</div>
                      <ul className="text-red-600 space-y-1">
                        {specialty.weaknesses.slice(0, 3).map((weakness, index) => (
                          <li key={index} className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Recommended Actions */}
                {specialty.recommendedActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="font-medium text-gray-700 mb-2">Acciones recomendadas:</div>
                    <ul className="text-gray-600 space-y-1">
                      {specialty.recommendedActions.slice(0, 2).map((action, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="w-1 h-1 bg-blue-500 rounded-full mt-2"></span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};