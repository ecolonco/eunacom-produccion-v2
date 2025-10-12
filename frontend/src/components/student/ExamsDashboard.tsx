import React, { useState, useEffect } from 'react';
import { examService, ExamPurchase, Exam } from '../../services/exam.service';
import { ExamStore } from './ExamStore';
import { ExamSession } from './ExamSession';
import { ExamResults } from './ExamResults';

interface ExamsDashboardProps {
  onBack: () => void;
}

type ViewType = 'list' | 'store' | 'session' | 'results';

export const ExamsDashboard: React.FC<ExamsDashboardProps> = ({ onBack }) => {
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [purchases, setPurchases] = useState<ExamPurchase[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [purchasesData, examsData] = await Promise.all([
        examService.getMyPurchases(),
        examService.listUserExams(),
      ]);
      setPurchases(purchasesData);
      setExams(examsData);
    } catch (error) {
      console.error('Error loading exams data:', error);
      alert('Error al cargar datos de pruebas');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewExam = async () => {
    console.log('🎯 handleStartNewExam called');
    
    // Buscar una compra activa con pruebas disponibles
    const activePurchase = purchases.find(
      (p) => p.status === 'ACTIVE' && p.examsUsed < p.examsTotal
    );

    if (!activePurchase) {
      alert('No tienes pruebas disponibles. Por favor compra un paquete.');
      setCurrentView('store');
      return;
    }

    console.log('📦 Active purchase found:', activePurchase);

    try {
      console.log(`🚀 Starting exam with purchaseId: ${activePurchase.id}`);
      const newExam = await examService.startExam(activePurchase.id);
      console.log('✅ Exam started:', newExam);
      setCurrentExamId(newExam.id);
      setCurrentView('session');
      await loadData(); // Refrescar datos
    } catch (error: any) {
      console.error('❌ Error starting exam:', error);
      alert(error.message || 'Error al iniciar prueba');
    }
  };

  const handleExamComplete = (exam: Exam) => {
    console.log('✅ Exam completed:', exam);
    setCurrentExam(exam);
    setCurrentView('results');
    loadData(); // Refrescar datos
  };

  const handleViewResults = async (examId: string) => {
    try {
      const examData = await examService.getResults(examId);
      setCurrentExam(examData);
      setCurrentView('results');
    } catch (error) {
      console.error('Error loading exam results:', error);
      alert('Error al cargar resultados');
    }
  };

  const handleCloseResults = () => {
    setCurrentExam(null);
    setCurrentView('list');
    loadData();
  };

  // Vista: Sesión de prueba activa
  if (currentView === 'session' && currentExamId) {
    return (
      <ExamSession
        examId={currentExamId}
        onComplete={handleExamComplete}
        onCancel={() => {
          setCurrentView('list');
          loadData();
        }}
      />
    );
  }

  // Vista: Resultados
  if (currentView === 'results' && currentExam) {
    return <ExamResults exam={currentExam} onClose={handleCloseResults} />;
  }

  // Vista: Tienda
  if (currentView === 'store') {
    return (
      <div>
        <button
          onClick={() => setCurrentView('list')}
          className="mb-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          ← Volver
        </button>
        <ExamStore
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
  const totalExamsAvailable = activePurchases.reduce(
    (sum, p) => sum + (p.examsTotal - p.examsUsed),
    0
  );
  const completedExams = exams.filter((e) => e.status === 'COMPLETED');
  const avgScore =
    completedExams.length > 0
      ? Math.round(
          completedExams.reduce((sum, e) => sum + (e.score || 0), 0) / completedExams.length
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

      <h1 className="text-3xl font-bold text-gray-900 mb-2">🎓 Pruebas EUNACOM</h1>
      <p className="text-gray-600 mb-8">
        Evaluaciones completas de 45 preguntas para medir tu preparación
      </p>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-blue-600 text-4xl font-bold mb-2">{totalExamsAvailable}</div>
          <div className="text-blue-900 font-medium">Pruebas Disponibles</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-green-600 text-4xl font-bold mb-2">{completedExams.length}</div>
          <div className="text-green-900 font-medium">Pruebas Completadas</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="text-purple-600 text-4xl font-bold mb-2">{avgScore}%</div>
          <div className="text-purple-900 font-medium">Promedio de Puntaje</div>
        </div>
      </div>

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
                    Pruebas restantes: {purchase.examsTotal - purchase.examsUsed} de{' '}
                    {purchase.examsTotal}
                  </div>
                  <div className="text-xs text-gray-500">
                    Comprado el {new Date(purchase.purchasedAt).toLocaleDateString()}
                  </div>
                </div>

                {purchase.examsUsed < purchase.examsTotal && (
                  <button
                    onClick={handleStartNewExam}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    ▶ Iniciar Nueva Prueba
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No tienes pruebas disponibles</p>
            <button
              onClick={() => setCurrentView('store')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              + Comprar más pruebas
            </button>
          </div>
        )}

        {activePurchases.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setCurrentView('store')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              + Comprar más pruebas
            </button>
          </div>
        )}
      </div>

      {/* Historial de pruebas */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">📊</span>
          Historial de Pruebas
        </h2>

        {completedExams.length > 0 ? (
          <div className="space-y-3">
            {completedExams.map((exam) => {
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
            No has completado ninguna prueba todavía
          </div>
        )}
      </div>
    </div>
  );
};

