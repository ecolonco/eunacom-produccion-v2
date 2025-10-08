import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../ui/Card';
import { LoadingCard } from '../ui/LoadingSpinner';
import { useStudyRecommendations, useGenerateRecommendations, useCompleteRecommendation } from '../../hooks/useDashboard';
import {
  LightBulbIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  ArrowPathIcon,
  ClockIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface StudyRecommendationsCardProps {
  userId?: string;
}

export const StudyRecommendationsCard: React.FC<StudyRecommendationsCardProps> = ({ userId }) => {
  const { data: recommendations, isLoading, error } = useStudyRecommendations(userId);
  const generateMutation = useGenerateRecommendations();
  const completeMutation = useCompleteRecommendation();

  if (isLoading) {
    return <LoadingCard>Cargando recomendaciones...</LoadingCard>;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600">Error al cargar recomendaciones</p>
          <p className="text-sm text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleGenerateRecommendations = () => {
    generateMutation.mutate();
  };

  const handleCompleteRecommendation = (recommendationId: string) => {
    completeMutation.mutate(recommendationId);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'weak_area':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'next_topic':
        return <BookOpenIcon className="h-5 w-5 text-blue-500" />;
      case 'review':
        return <ArrowPathIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <LightBulbIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'weak_area':
        return 'Área débil';
      case 'next_topic':
        return 'Próximo tema';
      case 'review':
        return 'Repaso';
      default:
        return 'Recomendación';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'text-red-600 bg-red-50 border-red-200';
    if (priority >= 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const formatEstimatedTime = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `~${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `~${hours}h ${remainingMinutes}m` : `~${hours}h`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LightBulbIcon className="h-5 w-5 text-yellow-500" />
              Recomendaciones de Estudio
            </CardTitle>
            <CardDescription>
              Sugerencias personalizadas basadas en tu progreso
            </CardDescription>
          </div>
          <button
            onClick={handleGenerateRecommendations}
            disabled={generateMutation.isPending}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generateMutation.isPending ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              'Generar Nuevas'
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {!recommendations || recommendations.length === 0 ? (
          <div className="text-center py-8">
            <LightBulbIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No hay recomendaciones disponibles</p>
            <p className="text-sm text-gray-400">
              Genera recomendaciones basadas en tu progreso actual
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations
              .sort((a, b) => b.priority - a.priority)
              .slice(0, 5) // Show top 5 recommendations
              .map((recommendation) => (
                <div
                  key={recommendation.id}
                  className={`p-4 rounded-lg border-2 ${getPriorityColor(recommendation.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(recommendation.type)}
                        <span className="text-sm font-medium">
                          {getTypeName(recommendation.type)}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                          Prioridad {recommendation.priority}/5
                        </span>
                      </div>

                      <h4 className="font-medium text-gray-900 mb-1">
                        {recommendation.specialty}
                      </h4>

                      <p className="text-sm text-gray-700 mb-2">
                        {recommendation.reason}
                      </p>

                      {recommendation.estimatedTime && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <ClockIcon className="h-3 w-3" />
                          <span>{formatEstimatedTime(recommendation.estimatedTime)}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleCompleteRecommendation(recommendation.id)}
                      disabled={completeMutation.isPending}
                      className="ml-4 p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="Marcar como completada"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

            {recommendations.length > 5 && (
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  +{recommendations.length - 5} recomendaciones más
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};