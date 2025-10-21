import React, { useState, useEffect } from 'react';
import { controlService, ControlPurchase, Control, Specialty } from '../../services/control.service';
import { ControlStore } from './ControlStore';
import { ControlSession } from './ControlSession';
import { ControlResults } from './ControlResults';

type View = 'list' | 'store' | 'session' | 'results';

export const ControlsDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('list');
  const [purchases, setPurchases] = useState<ControlPurchase[]>([]);
  const [myControls, setMyControls] = useState<Control[]>([]);
  const [activeControl, setActiveControl] = useState<Control | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purchasesData, controlsData, specialtiesData] = await Promise.all([
        controlService.getMyPurchases(),
        controlService.listMyControls(),
        controlService.listSpecialties(),
      ]);
      setPurchases(purchasesData);
      setMyControls(controlsData);
      setSpecialties(specialtiesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewControl = async (purchaseId: string) => {
    try {
      console.log('🚀 Iniciando control con purchaseId:', purchaseId);
      console.log('📚 Especialidad seleccionada:', selectedSpecialtyId || 'Todas');
      
      const control = await controlService.startControl(
        purchaseId, 
        selectedSpecialtyId || undefined
      );
      
      console.log('✅ Control creado:', control);
      setActiveControl(control);
      setCurrentView('session');
    } catch (error: any) {
      console.error('❌ Error al iniciar control:', error);
      alert(error.message || 'Error al iniciar el control');
    }
  };

  const handleControlComplete = (control: Control) => {
    setActiveControl(control);
    setCurrentView('results');
    loadData(); // Recargar para actualizar contadores
  };

  const handleViewResults = async (controlId: string) => {
    setActiveControl({ id: controlId } as Control);
    setCurrentView('results');
  };

  const handleBack = () => {
    setCurrentView('list');
    setActiveControl(null);
    loadData();
  };

  if (currentView === 'store') {
    return (
      <div>
        <button
          onClick={handleBack}
          className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ← Volver
        </button>
        <ControlStore onPurchaseSuccess={() => { loadData(); setCurrentView('list'); }} />
      </div>
    );
  }

  if (currentView === 'session' && activeControl) {
    return (
      <ControlSession
        controlId={activeControl.id}
        onComplete={handleControlComplete}
        onCancel={handleBack}
      />
    );
  }

  if (currentView === 'results' && activeControl) {
    return <ControlResults controlId={activeControl.id} onBack={handleBack} />;
  }

  // Vista principal (list)
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  const activePurchases = purchases.filter((p) => p.status === 'ACTIVE' && p.controlsUsed < p.controlsTotal);
  const totalAvailable = activePurchases.reduce((sum, p) => sum + (p.controlsTotal - p.controlsUsed), 0);
  const completedControls = myControls.filter((c) => c.status === 'COMPLETED');
  const avgScore = completedControls.length > 0
    ? Math.round(completedControls.reduce((sum, c) => sum + (c.score || 0), 0) / completedControls.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📝 Controles EUNACOM
        </h1>
        <p className="text-gray-600">
          Evalúa tu conocimiento con controles de 15 preguntas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="text-4xl font-bold text-blue-600 mb-2">{totalAvailable}</div>
          <div className="text-blue-800 font-semibold">Controles Disponibles</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="text-4xl font-bold text-green-600 mb-2">{completedControls.length}</div>
          <div className="text-green-800 font-semibold">Controles Completados</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="text-4xl font-bold text-purple-600 mb-2">{avgScore}%</div>
          <div className="text-purple-800 font-semibold">Promedio de Puntaje</div>
        </div>
      </div>

      {/* Buy Button */}
      {totalAvailable === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-yellow-900 mb-1">
                No tienes controles disponibles
              </h3>
              <p className="text-yellow-700 text-sm">
                Compra un paquete para comenzar a evaluar tu conocimiento
              </p>
            </div>
            <button
              onClick={() => setCurrentView('store')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 whitespace-nowrap"
            >
              🛒 Comprar Controles
            </button>
          </div>
        </div>
      )}

      {/* Selector de Especialidad */}
      {totalAvailable > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-blue-900 mb-3">
            📚 Selecciona una Especialidad
          </h3>
          <select
            value={selectedSpecialtyId}
            onChange={(e) => setSelectedSpecialtyId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">✨ Todas las Especialidades (aleatorio)</option>
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-blue-700 mt-2">
            {selectedSpecialtyId
              ? `Las 15 preguntas serán de: ${specialties.find((s) => s.id === selectedSpecialtyId)?.name}`
              : 'Las 15 preguntas serán aleatorias de todas las especialidades'}
          </p>
        </div>
      )}

      {totalAvailable > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            🎯 Mis Compras Activas
          </h3>
          <div className="space-y-4">
            {activePurchases.map((purchase) => {
              const remaining = purchase.controlsTotal - purchase.controlsUsed;
              return (
                <div
                  key={purchase.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-gray-900">
                      {purchase.package.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      Controles restantes: {remaining} de {purchase.controlsTotal}
                    </div>
                    <div className="text-xs text-gray-500">
                      Comprado el {new Date(purchase.purchasedAt).toLocaleDateString('es-CL')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartNewControl(purchase.id)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                  >
                    ▶ Iniciar Nuevo Control
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <button
              onClick={() => setCurrentView('store')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              + Comprar más controles
            </button>
          </div>
        </div>
      )}

      {/* Recent Controls */}
      {myControls.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            📊 Historial de Controles
          </h3>
          <div className="space-y-3">
            {myControls.slice(0, 10).map((control) => {
              const statusColors = {
                IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                COMPLETED: 'bg-green-100 text-green-800 border-green-300',
                ABANDONED: 'bg-gray-100 text-gray-800 border-gray-300',
              };

              const statusLabels = {
                IN_PROGRESS: 'En Progreso',
                COMPLETED: 'Completado',
                ABANDONED: 'Abandonado',
              };

              return (
                <div
                  key={control.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          statusColors[control.status]
                        }`}
                      >
                        {statusLabels[control.status]}
                      </span>
                      {control.status === 'COMPLETED' && control.score !== undefined && (
                        <span className="text-lg font-bold text-gray-900">
                          {control.score}% ({control.correctAnswers}/{control.totalQuestions})
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Iniciado: {new Date(control.startedAt).toLocaleString('es-CL')}
                    </div>
                    {control.completedAt && (
                      <div className="text-xs text-gray-500">
                        Completado: {new Date(control.completedAt).toLocaleString('es-CL')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {control.status === 'COMPLETED' && (
                      <button
                        onClick={() => handleViewResults(control.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Ver Resultados
                      </button>
                    )}
                    {control.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => {
                          setActiveControl(control);
                          setCurrentView('session');
                        }}
                        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                      >
                        Continuar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

