/**
 * Analysis History Component
 *
 * Vista de historial de análisis de IA con insights y tendencias
 */

import React, { useState, useEffect } from 'react';
import marketingAPI, { Analysis } from '../../services/marketing-api.service';

export const AnalysisHistory: React.FC = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [filter, setFilter] = useState<'all' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('all');

  useEffect(() => {
    loadHistory();
  }, [filter]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const type = filter !== 'all' ? filter : undefined;
      const data = await marketingAPI.getAnalysisHistory(30, type);
      setAnalyses(data);
    } catch (err: any) {
      console.error('Error loading analysis history:', err);
      setError(err.response?.data?.error || 'Error cargando historial');
    } finally {
      setLoading(false);
    }
  };

  const handleRunNewAnalysis = async () => {
    if (!confirm('¿Ejecutar un nuevo análisis? Esto puede tardar unos segundos.')) return;

    try {
      setLoading(true);
      await marketingAPI.runAnalysis();
      alert('✅ Análisis completado');
      await loadHistory();
    } catch (err: any) {
      console.error('Error running analysis:', err);
      alert('Error ejecutando análisis: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading && analyses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando historial...</p>
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
          onClick={loadHistory}
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
            <span className="text-3xl">📊</span>
            Historial de Análisis
          </h2>
          <p className="text-gray-600 mt-1">
            {analyses.length} análisis en los últimos 30 días
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadHistory}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            Actualizar
          </button>
          <button
            onClick={handleRunNewAnalysis}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            + Nuevo Análisis
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label="Todos"
        />
        <FilterButton
          active={filter === 'DAILY'}
          onClick={() => setFilter('DAILY')}
          label="Diarios"
        />
        <FilterButton
          active={filter === 'WEEKLY'}
          onClick={() => setFilter('WEEKLY')}
          label="Semanales"
        />
        <FilterButton
          active={filter === 'MONTHLY'}
          onClick={() => setFilter('MONTHLY')}
          label="Mensuales"
        />
      </div>

      {/* Content */}
      {analyses.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No hay análisis disponibles
          </h3>
          <p className="text-gray-600 mb-4">
            Ejecuta tu primer análisis para comenzar
          </p>
          <button
            onClick={handleRunNewAnalysis}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Ejecutar Análisis
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de análisis */}
          <div className="lg:col-span-1 space-y-3">
            {analyses.map((analysis) => (
              <AnalysisCard
                key={analysis.id}
                analysis={analysis}
                selected={selectedAnalysis?.id === analysis.id}
                onClick={() => setSelectedAnalysis(analysis)}
              />
            ))}
          </div>

          {/* Detalle del análisis seleccionado */}
          <div className="lg:col-span-2">
            {selectedAnalysis ? (
              <AnalysisDetail analysis={selectedAnalysis} />
            ) : (
              <div className="bg-gray-50 rounded-lg p-12 text-center h-full flex items-center justify-center">
                <div>
                  <div className="text-5xl mb-4">👈</div>
                  <p className="text-gray-600">
                    Selecciona un análisis para ver los detalles
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Analysis Card Component
// ============================================================================

interface AnalysisCardProps {
  analysis: Analysis;
  selected: boolean;
  onClick: () => void;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis, selected, onClick }) => {
  const typeConfig = {
    DAILY: { color: 'bg-blue-100 text-blue-800', label: 'Diario' },
    WEEKLY: { color: 'bg-purple-100 text-purple-800', label: 'Semanal' },
    MONTHLY: { color: 'bg-green-100 text-green-800', label: 'Mensual' },
  };

  const config = typeConfig[analysis.type];

  const trendEmoji = analysis.predictions?.trend === 'improving' ? '📈' :
                     analysis.predictions?.trend === 'declining' ? '📉' : '➡️';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
          {config.label}
        </span>
        <span className="text-2xl">{trendEmoji}</span>
      </div>

      <p className="text-sm text-gray-900 font-medium line-clamp-2 mb-2">
        {analysis.summary}
      </p>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{analysis.insights.length} insights</span>
        <span>
          {new Date(analysis.createdAt).toLocaleDateString('es-CL', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
    </button>
  );
};

// ============================================================================
// Analysis Detail Component
// ============================================================================

interface AnalysisDetailProps {
  analysis: Analysis;
}

const AnalysisDetail: React.FC<AnalysisDetailProps> = ({ analysis }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-2xl font-bold text-gray-900">Análisis Detallado</h3>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            {analysis.type}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          {new Date(analysis.createdAt).toLocaleString('es-CL')}
        </p>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">📝 Resumen Ejecutivo</h4>
        <p className="text-gray-700">{analysis.summary}</p>
      </div>

      {/* Predictions */}
      {analysis.predictions && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">🔮 Predicciones</h4>
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {analysis.predictions.trend === 'improving' ? '📈' :
               analysis.predictions.trend === 'declining' ? '📉' : '➡️'}
            </span>
            <span className="text-lg font-medium">
              {analysis.predictions.trend === 'improving' ? 'Tendencia al alza' :
               analysis.predictions.trend === 'declining' ? 'Tendencia a la baja' :
               'Tendencia estable'}
            </span>
            <span className="text-sm text-gray-600">
              (Confianza: {(analysis.predictions.confidence * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
      )}

      {/* Insights */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-3">
          💡 Insights ({analysis.insights.length})
        </h4>
        <div className="space-y-3">
          {analysis.insights.map((insight, idx) => (
            <InsightCard key={idx} insight={insight} />
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-3">
            🎯 Recomendaciones ({analysis.recommendations.length})
          </h4>
          <div className="space-y-2">
            {analysis.recommendations.slice(0, 3).map((rec, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">{rec.title}</p>
                <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
              </div>
            ))}
            {analysis.recommendations.length > 3 && (
              <p className="text-sm text-gray-500 text-center py-2">
                + {analysis.recommendations.length - 3} recomendaciones más
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Insight Card Component
// ============================================================================

interface InsightCardProps {
  insight: any;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const typeConfig: Record<string, { bg: string; icon: string }> = {
    positive: { bg: 'bg-green-50 border-green-200', icon: '✅' },
    negative: { bg: 'bg-red-50 border-red-200', icon: '❌' },
    opportunity: { bg: 'bg-blue-50 border-blue-200', icon: '💡' },
    warning: { bg: 'bg-yellow-50 border-yellow-200', icon: '⚠️' },
    neutral: { bg: 'bg-gray-50 border-gray-200', icon: 'ℹ️' },
  };

  const config = typeConfig[insight.type] || typeConfig.neutral;

  return (
    <div className={`border rounded-lg p-4 ${config.bg}`}>
      <div className="flex items-start gap-2">
        <span className="text-xl">{config.icon}</span>
        <div className="flex-1">
          <h5 className="font-semibold text-gray-900 mb-1">{insight.title}</h5>
          <p className="text-sm text-gray-700">{insight.description}</p>
        </div>
      </div>
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
}

const FilterButton: React.FC<FilterButtonProps> = ({ active, onClick, label }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
      }`}
    >
      {label}
    </button>
  );
};

export default AnalysisHistory;
