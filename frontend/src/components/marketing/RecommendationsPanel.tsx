/**
 * Recommendations Panel
 *
 * Panel interactivo para visualizar y gestionar recomendaciones de IA
 */

import React, { useState, useEffect } from 'react';
import marketingAPI, { Recommendation } from '../../services/marketing-api.service';

export const RecommendationsPanel: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadRecommendations();
  }, [filter]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = filter !== 'all' ? { priority: filter } : {};
      const data = await marketingAPI.getRecommendations(params);
      setRecommendations(data);
    } catch (err: any) {
      console.error('Error loading recommendations:', err);
      setError(err.response?.data?.error || 'Error cargando recomendaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (id: string) => {
    if (!confirm('¿Estás seguro de aplicar esta recomendación?')) return;

    try {
      await marketingAPI.applyRecommendation(id, 'Aplicada desde dashboard');
      await loadRecommendations();
      alert('✅ Recomendación aplicada exitosamente');
    } catch (err: any) {
      console.error('Error applying recommendation:', err);
      alert('Error aplicando recomendación: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDismiss = async (id: string) => {
    const reason = prompt('¿Por qué descartas esta recomendación? (opcional)');
    if (reason === null) return; // Cancelado

    try {
      await marketingAPI.dismissRecommendation(id, reason || undefined);
      await loadRecommendations();
      alert('✅ Recomendación descartada');
    } catch (err: any) {
      console.error('Error dismissing recommendation:', err);
      alert('Error descartando recomendación: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (categoryFilter === 'all') return true;
    return rec.category === categoryFilter;
  });

  const categories = Array.from(new Set(recommendations.map(r => r.category)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando recomendaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadRecommendations}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-3xl">🤖</span>
            Recomendaciones de IA
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredRecommendations.length} recomendación{filteredRecommendations.length !== 1 ? 'es' : ''} pendiente{filteredRecommendations.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={loadRecommendations}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        {/* Priority Filter */}
        <div className="flex gap-2">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="Todas"
          />
          <FilterButton
            active={filter === 'critical'}
            onClick={() => setFilter('critical')}
            label="Críticas"
            color="red"
          />
          <FilterButton
            active={filter === 'high'}
            onClick={() => setFilter('high')}
            label="Altas"
            color="orange"
          />
          <FilterButton
            active={filter === 'medium'}
            onClick={() => setFilter('medium')}
            label="Medias"
            color="yellow"
          />
          <FilterButton
            active={filter === 'low'}
            onClick={() => setFilter('low')}
            label="Bajas"
            color="blue"
          />
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {getCategoryLabel(cat)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Recommendations List */}
      {filteredRecommendations.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            ¡Todo al día!
          </h3>
          <p className="text-gray-600">
            No hay recomendaciones pendientes en este momento.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onApply={handleApply}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Filter Button Component
// ============================================================================

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  active,
  onClick,
  label,
  color = 'blue',
}) => {
  const colorClasses = {
    red: active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100',
    orange: active ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100',
    yellow: active ? 'bg-yellow-600 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
    blue: active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${colorClasses[color as keyof typeof colorClasses]}`}
    >
      {label}
    </button>
  );
};

// ============================================================================
// Recommendation Card Component
// ============================================================================

interface RecommendationCardProps {
  recommendation: Recommendation;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onApply,
  onDismiss,
}) => {
  const [expanded, setExpanded] = useState(false);

  const priorityConfig = {
    critical: {
      color: 'border-red-500 bg-red-50',
      badge: 'bg-red-600 text-white',
      icon: '🚨',
    },
    high: {
      color: 'border-orange-500 bg-orange-50',
      badge: 'bg-orange-600 text-white',
      icon: '⚠️',
    },
    medium: {
      color: 'border-yellow-500 bg-yellow-50',
      badge: 'bg-yellow-600 text-white',
      icon: '💡',
    },
    low: {
      color: 'border-blue-500 bg-blue-50',
      badge: 'bg-blue-600 text-white',
      icon: 'ℹ️',
    },
  };

  const config = priorityConfig[recommendation.priority];

  return (
    <div className={`border-l-4 rounded-lg shadow-md p-6 ${config.color}`}>
      <div className="flex items-start justify-between">
        {/* Left side - Content */}
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">{config.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {recommendation.title}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.badge}`}>
                  {recommendation.priority.toUpperCase()}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                  {getCategoryLabel(recommendation.category)}
                </span>
                {recommendation.aiConfidence && (
                  <span className="text-xs text-gray-600">
                    Confianza: {(recommendation.aiConfidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              <p className="text-gray-700 mb-3">{recommendation.description}</p>

              {expanded && (
                <div className="space-y-3 mt-4">
                  <div className="bg-white bg-opacity-60 rounded-lg p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-2">
                      📋 Acción recomendada:
                    </p>
                    <p className="text-sm text-gray-700">{recommendation.action}</p>
                  </div>

                  {recommendation.estimatedImpact && (
                    <div className="bg-green-100 bg-opacity-60 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        📈 Impacto estimado:
                      </p>
                      <p className="text-sm text-gray-700">
                        {recommendation.estimatedImpact}
                      </p>
                    </div>
                  )}

                  {recommendation.campaign && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Campaña:</span>{' '}
                      {recommendation.campaign.name} ({recommendation.campaign.status})
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Creada: {new Date(recommendation.createdAt).toLocaleString('es-CL')}
                  </div>
                </div>
              )}

              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
              >
                {expanded ? '▲ Ver menos' : '▼ Ver más detalles'}
              </button>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={() => onApply(recommendation.id)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium whitespace-nowrap"
            title="Aplicar recomendación"
          >
            ✓ Aplicar
          </button>
          <button
            onClick={() => onDismiss(recommendation.id)}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm font-medium whitespace-nowrap"
            title="Descartar recomendación"
          >
            ✕ Descartar
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Helper Functions
// ============================================================================

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    budget: 'Presupuesto',
    targeting: 'Segmentación',
    creative: 'Creativos',
    bidding: 'Pujas',
    keywords: 'Keywords',
    schedule: 'Programación',
    general: 'General',
  };
  return labels[category] || category;
}

export default RecommendationsPanel;
