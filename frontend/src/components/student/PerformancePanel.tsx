import React, { useState, useEffect } from 'react';
import { controlService, Control } from '../../services/control.service';
import { examService, Exam } from '../../services/exam.service';
import { mockExamService, MockExam } from '../../services/mock-exam.service';
import { aiAnalysisService, EvolutionaryAnalysis } from '../../services/ai-analysis.service';

interface PerformanceStats {
  total: number;
  completed: number;
  correctAnswers: number;
  totalQuestions: number;
  avgScore: number;
  avgTimeMinutes: number;
}

export const PerformancePanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [controls, setControls] = useState<Control[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'all' | 'controls' | 'exams' | 'mockExams'>('all');

  // Estado para análisis evolutivo IA
  const [evolutionaryAnalysis, setEvolutionaryAnalysis] = useState<EvolutionaryAnalysis | null>(null);
  const [loadingEvolutionary, setLoadingEvolutionary] = useState<boolean>(false);
  const [evolutionaryError, setEvolutionaryError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [controlsData, examsData, mockExamsData] = await Promise.all([
        controlService.listUserControls(),
        examService.listUserExams(),
        mockExamService.listUserMockExams(),
      ]);

      const completedMockExams = mockExamsData.filter((m) => m.status === 'COMPLETED');

      setControls(controlsData.filter((c) => c.status === 'COMPLETED'));
      setExams(examsData.filter((e) => e.status === 'COMPLETED'));
      setMockExams(completedMockExams);

      // Cargar análisis evolutivo si hay ensayos completados
      if (completedMockExams.length > 0) {
        loadEvolutionaryAnalysis();
      }
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvolutionaryAnalysis = async () => {
    try {
      setLoadingEvolutionary(true);
      setEvolutionaryError(null);

      // Intentar obtener análisis existente
      let analysis = await aiAnalysisService.getEvolutionaryAnalysis();

      // Si no existe, generar uno nuevo
      if (!analysis) {
        analysis = await aiAnalysisService.generateEvolutionaryAnalysis();
      }

      setEvolutionaryAnalysis(analysis);
    } catch (error: any) {
      console.error('Error loading evolutionary analysis:', error);
      setEvolutionaryError(error.message || 'Error al cargar análisis evolutivo');
    } finally {
      setLoadingEvolutionary(false);
    }
  };

  const handleRegenerateAnalysis = async () => {
    try {
      setLoadingEvolutionary(true);
      setEvolutionaryError(null);

      const analysis = await aiAnalysisService.generateEvolutionaryAnalysis();
      setEvolutionaryAnalysis(analysis);
    } catch (error: any) {
      console.error('Error regenerating evolutionary analysis:', error);
      setEvolutionaryError(error.message || 'Error al regenerar análisis');
    } finally {
      setLoadingEvolutionary(false);
    }
  };

  const calculateStats = (items: any[]): PerformanceStats => {
    if (items.length === 0) {
      return {
        total: 0,
        completed: 0,
        correctAnswers: 0,
        totalQuestions: 0,
        avgScore: 0,
        avgTimeMinutes: 0,
      };
    }

    const correctAnswers = items.reduce((sum, item) => sum + (item.correctAnswers || 0), 0);
    const totalQuestions = items.reduce((sum, item) => sum + (item.totalQuestions || 0), 0);
    const totalScore = items.reduce((sum, item) => sum + (item.score || 0), 0);
    const totalTime = items.reduce((sum, item) => sum + (item.timeSpentSecs || 0), 0);

    return {
      total: items.length,
      completed: items.length,
      correctAnswers,
      totalQuestions,
      avgScore: items.length > 0 ? Math.round(totalScore / items.length) : 0,
      avgTimeMinutes: items.length > 0 ? Math.round(totalTime / items.length / 60) : 0,
    };
  };

  const controlStats = calculateStats(controls);
  const examStats = calculateStats(exams);
  const mockExamStats = calculateStats(mockExams);

  // Estadísticas consolidadas
  const consolidatedStats: PerformanceStats = {
    total: controls.length + exams.length + mockExams.length,
    completed: controls.length + exams.length + mockExams.length,
    correctAnswers: controlStats.correctAnswers + examStats.correctAnswers + mockExamStats.correctAnswers,
    totalQuestions: controlStats.totalQuestions + examStats.totalQuestions + mockExamStats.totalQuestions,
    avgScore: 0,
    avgTimeMinutes: 0,
  };

  // Calcular promedio ponderado de score
  if (consolidatedStats.total > 0) {
    const totalScore = 
      (controlStats.avgScore * controls.length) +
      (examStats.avgScore * exams.length) +
      (mockExamStats.avgScore * mockExams.length);
    consolidatedStats.avgScore = Math.round(totalScore / consolidatedStats.total);
  }

  // Calcular promedio de tiempo
  if (consolidatedStats.total > 0) {
    const totalTime = 
      (controlStats.avgTimeMinutes * controls.length) +
      (examStats.avgTimeMinutes * exams.length) +
      (mockExamStats.avgTimeMinutes * mockExams.length);
    consolidatedStats.avgTimeMinutes = Math.round(totalTime / consolidatedStats.total);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Cargando estadísticas...</div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700 border-green-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  const renderStatsCard = (title: string, stats: PerformanceStats, icon: string, color: string) => (
    <div className={`bg-white border-2 ${color} rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{icon} {title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-3xl font-bold text-gray-900">{stats.completed}</div>
          <div className="text-sm text-gray-600">Completadas</div>
        </div>

        <div>
          <div className={`text-3xl font-bold px-3 py-1 rounded-lg inline-block ${getScoreColor(stats.avgScore)}`}>
            {stats.avgScore}%
          </div>
          <div className="text-sm text-gray-600 mt-1">Promedio</div>
        </div>

        <div>
          <div className="text-2xl font-bold text-green-600">
            {stats.correctAnswers}
          </div>
          <div className="text-sm text-gray-600">Correctas</div>
        </div>

        <div>
          <div className="text-2xl font-bold text-red-600">
            {stats.totalQuestions - stats.correctAnswers}
          </div>
          <div className="text-sm text-gray-600">Incorrectas</div>
        </div>

        <div className="col-span-2 border-t border-gray-200 pt-3 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">⏱️ Tiempo promedio:</span>
            <span className="font-semibold text-gray-900">{stats.avgTimeMinutes} min</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHistoryList = () => {
    let items: any[] = [];

    if (selectedView === 'all') {
      items = [
        ...controls.map((c) => ({ ...c, type: 'Control', questions: 15 })),
        ...exams.map((e) => ({ ...e, type: 'Prueba', questions: 45 })),
        ...mockExams.map((m) => ({ ...m, type: 'Ensayo', questions: 180 })),
      ].sort((a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime());
    } else if (selectedView === 'controls') {
      items = controls.map((c) => ({ ...c, type: 'Control', questions: 15 }));
    } else if (selectedView === 'exams') {
      items = exams.map((e) => ({ ...e, type: 'Prueba', questions: 45 }));
    } else if (selectedView === 'mockExams') {
      items = mockExams.map((m) => ({ ...m, type: 'Ensayo', questions: 180 }));
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No hay evaluaciones completadas aún
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item, index) => {
          const percentage = item.score || 0;
          const timeMinutes = Math.round((item.timeSpentSecs || 0) / 60);
          const scoreColor = getScoreColor(percentage);

          return (
            <div
              key={`${item.type}-${item.id}-${index}`}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {item.type}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-sm font-bold ${scoreColor}`}>
                      {percentage}% ({item.correctAnswers}/{item.totalQuestions})
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    📅 {new Date(item.completedAt || item.startedAt).toLocaleString('es-CL')}
                  </div>
                  <div className="text-sm text-gray-600">
                    ⏱️ Tiempo: {timeMinutes} minutos
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Volver al Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Mi Rendimiento</h1>
        <p className="text-gray-600 mb-8">
          Estadísticas detalladas de tu desempeño en Controles, Pruebas y Ensayos EUNACOM
        </p>

        {/* Análisis Evolutivo IA (solo si hay ensayos completados) */}
        {mockExams.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-2 border-indigo-300 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <span className="text-3xl mr-3">📈</span>
                Análisis de tu Evolución
              </h2>
              {evolutionaryAnalysis && !loadingEvolutionary && (
                <button
                  onClick={handleRegenerateAnalysis}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                  title="Actualizar análisis con tus últimos ensayos"
                >
                  🔄 Actualizar
                </button>
              )}
            </div>

            {loadingEvolutionary ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <span className="ml-4 text-gray-600">Analizando tu evolución...</span>
              </div>
            ) : evolutionaryError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">⚠️ {evolutionaryError}</p>
                <button
                  onClick={loadEvolutionaryAnalysis}
                  className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : evolutionaryAnalysis ? (
              <div>
                {/* Resumen principal */}
                <div className="bg-white rounded-lg p-6 border-2 border-indigo-200 shadow-sm mb-4">
                  <p className="text-gray-800 leading-relaxed text-lg">
                    {evolutionaryAnalysis.summary}
                  </p>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <span>📊 Ensayos analizados: <strong>{evolutionaryAnalysis.examsAnalyzed}</strong></span>
                    {evolutionaryAnalysis.createdAt && (
                      <span>🕒 Última actualización: {new Date(evolutionaryAnalysis.createdAt).toLocaleDateString('es-CL')}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">✨ Análisis generado por IA</span>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-700 text-sm mb-3">
                  💡 Genera un análisis de tu evolución a través de todos tus ensayos EUNACOM
                </p>
                <button
                  onClick={loadEvolutionaryAnalysis}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Generar Análisis
                </button>
              </div>
            )}
          </div>
        )}

        {/* Estadísticas Consolidadas */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl p-8 mb-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="mr-3">🎯</span>
            Rendimiento General
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-4xl font-bold">{consolidatedStats.completed}</div>
              <div className="text-purple-100">Evaluaciones</div>
            </div>
            <div>
              <div className="text-4xl font-bold">{consolidatedStats.avgScore}%</div>
              <div className="text-purple-100">Promedio</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-200">{consolidatedStats.correctAnswers}</div>
              <div className="text-purple-100">Correctas</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-200">
                {consolidatedStats.totalQuestions - consolidatedStats.correctAnswers}
              </div>
              <div className="text-purple-100">Incorrectas</div>
            </div>
          </div>
        </div>

        {/* Estadísticas por Tipo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {renderStatsCard('Controles', controlStats, '📝', 'border-blue-300')}
          {renderStatsCard('Pruebas', examStats, '🎓', 'border-purple-300')}
          {renderStatsCard('Ensayos EUNACOM', mockExamStats, '🎯', 'border-green-300')}
        </div>

        {/* Historial */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📚 Historial de Evaluaciones</h2>

          {/* Filtros */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedView('all')}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
                selectedView === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Todas ({consolidatedStats.completed})
            </button>
            <button
              onClick={() => setSelectedView('controls')}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
                selectedView === 'controls'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📝 Controles ({controls.length})
            </button>
            <button
              onClick={() => setSelectedView('exams')}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
                selectedView === 'exams'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🎓 Pruebas ({exams.length})
            </button>
            <button
              onClick={() => setSelectedView('mockExams')}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
                selectedView === 'mockExams'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🎯 Ensayos ({mockExams.length})
            </button>
          </div>

          {renderHistoryList()}
        </div>
      </div>
    </div>
  );
};

