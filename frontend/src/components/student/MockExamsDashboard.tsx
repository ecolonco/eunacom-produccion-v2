import React, { useState, useEffect } from 'react';
import { mockExamService, MockExamPurchase, MockExam } from '../../services/mock-exam.service';
import { MockExamStore } from './MockExamStore';
import { MockExamSession } from './MockExamSession';
import { MockExamResults } from './MockExamResults';

interface MockExamsDashboardProps {
  onBack: () => void;
}

type ViewType = 'list' | 'store' | 'session' | 'results';

export const MockExamsDashboard: React.FC<MockExamsDashboardProps> = ({ onBack }) => {
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [purchases, setPurchases] = useState<MockExamPurchase[]>([]);
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [currentMockExamId, setCurrentMockExamId] = useState<string | null>(null);
  const [currentMockExam, setCurrentMockExam] = useState<MockExam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [purchasesData, mockExamsData] = await Promise.all([
        mockExamService.getMyPurchases(),
        mockExamService.listUserMockExams(),
      ]);
      setPurchases(purchasesData);
      setMockExams(mockExamsData);
    } catch (error) {
      console.error('Error loading mock exams data:', error);
      alert('Error al cargar datos de ensayos');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewMockExam = async () => {
    console.log('🎯 handleStartNewMockExam called');

    const activePurchase = purchases.find(
      (p) => p.status === 'ACTIVE' && p.mockExamsUsed < p.mockExamsTotal
    );

    if (!activePurchase) {
      alert('No tienes ensayos disponibles. Por favor compra un paquete.');
      setCurrentView('store');
      return;
    }

    console.log('📦 Active purchase found:', activePurchase);

    try {
      console.log(`🚀 Starting mock exam with purchaseId: ${activePurchase.id}`);
      const newMockExam = await mockExamService.startMockExam(activePurchase.id);
      console.log('✅ Mock exam started:', newMockExam);
      setCurrentMockExamId(newMockExam.id);
      setCurrentView('session');
      await loadData();
    } catch (error: any) {
      console.error('❌ Error starting mock exam:', error);
      alert(error.message || 'Error al iniciar ensayo');
    }
  };

  const handleContinueMockExam = (mockExamId: string) => {
    console.log('🔄 Continuing mock exam:', mockExamId);
    setCurrentMockExamId(mockExamId);
    setCurrentView('session');
  };

  const handleMockExamComplete = (mockExam: MockExam) => {
    console.log('✅ Mock exam completed:', mockExam);
    setCurrentMockExam(mockExam);
    setCurrentView('results');
    loadData();
  };

  const handleViewResults = async (mockExamId: string) => {
    try {
      const mockExamData = await mockExamService.getResults(mockExamId);
      setCurrentMockExam(mockExamData);
      setCurrentView('results');
    } catch (error) {
      console.error('Error loading mock exam results:', error);
      alert('Error al cargar resultados');
    }
  };

  const handleCloseResults = () => {
    setCurrentMockExam(null);
    setCurrentView('list');
    loadData();
  };

  if (currentView === 'session' && currentMockExamId) {
    return (
      <MockExamSession
        mockExamId={currentMockExamId}
        onComplete={handleMockExamComplete}
        onCancel={() => {
          setCurrentView('list');
          loadData();
        }}
      />
    );
  }

  if (currentView === 'results' && currentMockExam) {
    return <MockExamResults mockExam={currentMockExam} onClose={handleCloseResults} />;
  }

  if (currentView === 'store') {
    return (
      <div>
        <button
          onClick={() => setCurrentView('list')}
          className="mb-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          ← Volver
        </button>
        <MockExamStore
          onPurchase={() => {
            loadData();
            setCurrentView('list');
          }}
        />
      </div>
    );
  }

  // Vista: Lista principal
  const activePurchases = purchases.filter((p) => p.status === 'ACTIVE');
  const totalMockExamsAvailable = activePurchases.reduce(
    (sum, p) => sum + (p.mockExamsTotal - p.mockExamsUsed),
    0
  );
  const inProgressMockExams = mockExams.filter((e) => e.status === 'IN_PROGRESS');
  const completedMockExams = mockExams.filter((e) => e.status === 'COMPLETED');
  const avgScore =
    completedMockExams.length > 0
      ? Math.round(
          completedMockExams.reduce((sum, e) => sum + (e.score || 0), 0) / completedMockExams.length
        )
      : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
      >
        ← Volver al Dashboard
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 Ensayos EUNACOM</h1>
      <p className="text-gray-600 mb-8">
        Simulación completa del examen EUNACOM con 180 preguntas
      </p>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-green-600 text-4xl font-bold mb-2">{totalMockExamsAvailable}</div>
          <div className="text-green-900 font-medium">Ensayos Disponibles</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-blue-600 text-4xl font-bold mb-2">{completedMockExams.length}</div>
          <div className="text-blue-900 font-medium">Ensayos Completados</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="text-purple-600 text-4xl font-bold mb-2">{avgScore}%</div>
          <div className="text-purple-900 font-medium">Promedio de Puntaje</div>
        </div>
      </div>

      {/* Ensayos en Progreso */}
      {inProgressMockExams.length > 0 && (
        <div className="bg-orange-50 border border-orange-300 rounded-lg p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">⏳</span>
            Ensayos en Progreso
          </h2>
          <div className="space-y-3">
            {inProgressMockExams.map((exam) => {
              const answeredCount = exam.answers?.length || 0;
              const progressPercentage = Math.round((answeredCount / exam.totalQuestions) * 100);

              return (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                        En Progreso
                      </span>
                      <span className="text-sm text-gray-600">
                        {answeredCount} de {exam.totalQuestions} respondidas ({progressPercentage}%)
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Iniciado: {new Date(exam.startedAt).toLocaleString()}
                    </div>
                    {/* Barra de progreso */}
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleContinueMockExam(exam.id)}
                    className="ml-4 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                  >
                    ▶ Continuar Ensayo
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mis compras activas */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🎯</span>
          Mis Compras Activas
        </h2>

        {activePurchases.length > 0 ? (
          <div className="space-y-4">
            {activePurchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div>
                  <div className="font-semibold text-gray-900">{purchase.package.name}</div>
                  <div className="text-sm text-gray-600">
                    Ensayos restantes: {purchase.mockExamsTotal - purchase.mockExamsUsed} de{' '}
                    {purchase.mockExamsTotal}
                  </div>
                  <div className="text-xs text-gray-500">
                    Comprado el {new Date(purchase.purchasedAt).toLocaleDateString()}
                  </div>
                </div>

                {purchase.mockExamsUsed < purchase.mockExamsTotal && (
                  <button
                    onClick={handleStartNewMockExam}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    ▶ Iniciar Nuevo Ensayo
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No tienes ensayos disponibles</p>
            <button
              onClick={() => setCurrentView('store')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              + Comprar más ensayos
            </button>
          </div>
        )}

        {activePurchases.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setCurrentView('store')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              + Comprar más ensayos
            </button>
          </div>
        )}
      </div>

      {/* Historial de pruebas */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">📊</span>
          Historial de Ensayos
        </h2>

        {completedMockExams.length > 0 ? (
          <div className="space-y-3">
            {completedMockExams.map((exam) => {
              const percentage = exam.score || 0;
              const scoreColor =
                percentage >= 80
                  ? 'bg-green-100 text-green-700'
                  : percentage >= 60
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700';

              return (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${scoreColor}`}
                      >
                        {percentage}% ({exam.correctAnswers}/{exam.totalQuestions})
                      </span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        Completado
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      Iniciado: {new Date(exam.startedAt).toLocaleString()}
                      {exam.completedAt && (
                        <span className="ml-3">
                          Completado: {new Date(exam.completedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewResults(exam.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Ver Resultados
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No has completado ningún ensayo todavía
          </div>
        )}
      </div>
    </div>
  );
};

