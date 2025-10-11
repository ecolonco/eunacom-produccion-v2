import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://eunacom-backend-v3.onrender.com';

interface QASweep2Run {
  id: string;
  name: string;
  description?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  _count?: {
    results: number;
  };
}

interface QASweep2Result {
  id: string;
  variationId: string;
  diagnosis: any;
  corrections?: any;
  finalLabels: string[];
  status: 'ANALYZED' | 'CORRECTED' | 'REVIEWED' | 'APPLIED';
  aiModelUsed: string;
  confidenceScore: number;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  createdAt: string;
}

interface QASweep2Stats {
  totalRuns: number;
  completedRuns: number;
  runningRuns: number;
  failedRuns: number;
  totalVariations: number;
}

interface Metadata {
  specialties: string[];
  topics: string[];
}

export const QASweep2Panel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'runs' | 'create' | 'individual' | 'stats'>('runs');
  const [runs, setRuns] = useState<QASweep2Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<QASweep2Run | null>(null);
  const [results, setResults] = useState<QASweep2Result[]>([]);
  const [stats, setStats] = useState<QASweep2Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [individualDiagnosis, setIndividualDiagnosis] = useState<any>(null);
  const [autoApply, setAutoApply] = useState(true);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [variationIdInput, setVariationIdInput] = useState('');

  // Estados para crear nuevo run
  const [newRun, setNewRun] = useState({
    name: '',
    description: '',
    batchSize: 50,
    maxConcurrency: 3,
    specialty: '',
    topic: ''
  });

  useEffect(() => {
    loadRuns();
    loadStats();
    loadMetadata();
  }, []);

  const loadRuns = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-sweep-2/runs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      if (data.success) {
        setRuns(data.data);
      }
    } catch (error) {
      console.error('Error loading runs:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-sweep-2/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadMetadata = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-sweep-2/metadata`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      if (data.success) {
        setMetadata(data.data);
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  };

  const diagnoseIndividual = async () => {
    if (!variationIdInput.trim()) {
      alert('Por favor ingresa un ID de variación');
      return;
    }

    setDiagnosisLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-sweep-2/diagnose-individual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ variationId: variationIdInput.trim(), autoApply })
      });

      const data = await response.json();
      if (data.success) {
        setIndividualDiagnosis(data.data);
        setShowDiagnosisModal(true);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error in individual diagnosis:', error);
      alert('Error al diagnosticar ejercicio individual');
    } finally {
      setDiagnosisLoading(false);
    }
  };

  const loadRunResults = async (runId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-sweep-2/runs/${runId}/results`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      if (data.success) {
        setResults(data.data.results);
        setSelectedRun(data.data.run);
      }
    } catch (error) {
      console.error('Error loading run results:', error);
    }
  };

  const createRun = async () => {
    setCreating(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-sweep-2/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRun)
      });

      const data = await response.json();
      if (data.success) {
        alert('Run creado exitosamente');
        setNewRun({
          name: '',
          description: '',
          batchSize: 50,
          maxConcurrency: 3,
          specialty: '',
          topic: ''
        });
        loadRuns();
        setActiveTab('runs');
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error creating run:', error);
      alert('Error al crear el run');
    } finally {
      setCreating(false);
    }
  };

  const startAnalysis = async (runId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-sweep-2/runs/${runId}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        alert('Análisis iniciado. Los resultados estarán disponibles en unos minutos.');
        loadRuns();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error starting analysis:', error);
      alert('Error al iniciar el análisis');
    }
  };

  const applyCorrection = async (resultId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-sweep-2/results/${resultId}/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      const data = await response.json();
      if (data.success) {
        alert('Corrección aplicada exitosamente');
        if (selectedRun) {
          loadRunResults(selectedRun.id);
        }
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error applying correction:', error);
      alert('Error al aplicar la corrección');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'RUNNING': return 'bg-blue-100 text-blue-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultStatusColor = (status: string) => {
    switch (status) {
      case 'APPLIED': return 'bg-green-100 text-green-800';
      case 'CORRECTED': return 'bg-yellow-100 text-yellow-800';
      case 'ANALYZED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">🤖 QA Sweep 2.0 - IA Avanzada</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition duration-200"
        >
          ← Volver
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('runs')}
          className={`px-4 py-2 rounded-md transition duration-200 ${
            activeTab === 'runs' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          📋 Runs
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded-md transition duration-200 ${
            activeTab === 'create' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          ➕ Crear Run
        </button>
        <button
          onClick={() => setActiveTab('individual')}
          className={`px-4 py-2 rounded-md transition duration-200 ${
            activeTab === 'individual' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          🔍 Diagnóstico Individual
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-md transition duration-200 ${
            activeTab === 'stats' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          📊 Estadísticas
        </button>
      </div>

      {/* Diagnóstico Individual Tab */}
      {activeTab === 'individual' && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">🔍 Diagnóstico Individual · v2.0.1</h3>
          <p className="text-gray-600 mb-4">
            Ingresa el ID de una variación para diagnosticarla individualmente con IA.
          </p>
          
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              value={variationIdInput}
              onChange={(e) => setVariationIdInput(e.target.value)}
              placeholder="ID de variación (ej: 505.1)"
              className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={diagnoseIndividual}
              disabled={diagnosisLoading}
              className={`px-6 py-3 rounded-md font-semibold transition duration-200 ${
                diagnosisLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {diagnosisLoading ? 'Analizando...' : 'Diagnosticar'}
            </button>
          </div>

          <div className="text-sm text-gray-500">
            <p><strong>💡 Tip:</strong> Usa el formato numérico (ej: 505.1) o el ID interno. Puedes obtener IDs desde "Runs" → "Ver Resultados"</p>
          </div>

          <div className="mt-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={autoApply} onChange={(e)=>setAutoApply(e.target.checked)} />
              Aplicar automáticamente las correcciones como nueva versión (oculta original)
            </label>
          </div>
        </div>
      )}

      {/* Estadísticas Tab */}
      {activeTab === 'stats' && stats && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">📊 Estadísticas QA Sweep 2.0</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalRuns}</div>
              <div className="text-sm text-gray-600">Total Runs</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.completedRuns}</div>
              <div className="text-sm text-gray-600">Completados</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.runningRuns}</div>
              <div className="text-sm text-gray-600">En Progreso</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.failedRuns}</div>
              <div className="text-sm text-gray-600">Fallidos</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.totalVariations}</div>
              <div className="text-sm text-gray-600">Variaciones</div>
            </div>
          </div>
        </div>
      )}

      {/* Crear Run Tab */}
      {activeTab === 'create' && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">➕ Crear Nuevo Run QA Sweep 2.0</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del Run</label>
              <input
                type="text"
                value={newRun.name}
                onChange={(e) => setNewRun({ ...newRun, name: e.target.value })}
                placeholder="ej: Análisis Obstetricia Q1 2025"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <input
                type="text"
                value={newRun.description}
                onChange={(e) => setNewRun({ ...newRun, description: e.target.value })}
                placeholder="Descripción opcional"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tamaño del Lote</label>
              <input
                type="number"
                value={newRun.batchSize}
                onChange={(e) => setNewRun({ ...newRun, batchSize: parseInt(e.target.value) })}
                min="1"
                max="200"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Concurrencia Máxima</label>
              <input
                type="number"
                value={newRun.maxConcurrency}
                onChange={(e) => setNewRun({ ...newRun, maxConcurrency: parseInt(e.target.value) })}
                min="1"
                max="10"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Especialidad (opcional)</label>
              <select
                value={newRun.specialty}
                onChange={(e) => setNewRun({ ...newRun, specialty: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="">Todas las especialidades</option>
                {metadata?.specialties.map((specialty, index) => (
                  <option key={index} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tema (opcional)</label>
              <select
                value={newRun.topic}
                onChange={(e) => setNewRun({ ...newRun, topic: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="">Todos los temas</option>
                {metadata?.topics.map((topic, index) => (
                  <option key={index} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={createRun}
              disabled={!newRun.name || creating}
              className={`px-6 py-2 rounded-md transition duration-200 ${
                !newRun.name || creating
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {creating ? 'Creando...' : '🚀 Crear Run'}
            </button>
          </div>
        </div>
      )}

      {/* Runs Tab */}
      {activeTab === 'runs' && (
        <div className="space-y-6">
          {/* Lista de Runs */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4">📋 Runs de QA Sweep 2.0</h3>
            {runs.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No hay runs creados aún.</p>
            ) : (
              <div className="space-y-3">
                {runs.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{run.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(run.status)}`}>
                          {run.status}
                        </span>
                        {run._count && (
                          <span className="text-sm text-gray-600">
                            {run._count.results} variaciones
                          </span>
                        )}
                      </div>
                      {run.description && (
                        <p className="text-sm text-gray-600 mb-1">{run.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Creado: {new Date(run.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadRunResults(run.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Ver Resultados
                      </button>
                      {run.status === 'PENDING' && (
                        <button
                          onClick={() => startAnalysis(run.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Iniciar Análisis
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resultados del Run Seleccionado */}
          {selectedRun && (
            <div className="bg-white shadow-md rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  📊 Resultados: {selectedRun.name}
                </h3>
                <button
                  onClick={() => setSelectedRun(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {results.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No hay resultados disponibles.</p>
              ) : (
                <div className="space-y-4">
                  {results.map((result) => (
                    <div key={result.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {result.variationId.slice(-8)}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${getResultStatusColor(result.status)}`}>
                            {result.status}
                          </span>
                          <span className="text-sm text-gray-600">
                            Confianza: {(result.confidenceScore * 100).toFixed(1)}%
                          </span>
                        </div>
                        {result.corrections && result.status !== 'APPLIED' && (
                          <button
                            onClick={() => applyCorrection(result.id)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Aplicar Corrección
                          </button>
                        )}
                      </div>
                      
                      {/* Diagnóstico */}
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-800 mb-1">🔍 Diagnóstico:</h5>
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
                            {result.diagnosis.scorecard && Object.entries(result.diagnosis.scorecard).map(([key, value]) => (
                              <div key={key} className="text-center">
                                <div className="text-xs text-gray-600 capitalize">{key.replace('_', ' ')}</div>
                                <div className={`font-bold ${
                                  (value as number) === 0 ? 'text-green-600' :
                                  (value as number) === 1 ? 'text-yellow-600' :
                                  (value as number) === 2 ? 'text-orange-600' : 'text-red-600'
                                }`}>
                                  {value as number}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="text-sm">
                            <strong>Severidad Global:</strong> {result.diagnosis.severidad_global}
                            <br />
                            <strong>Recomendación:</strong> {result.diagnosis.recomendacion}
                          </div>
                        </div>
                      </div>

                      {/* Etiquetas */}
                      {result.finalLabels.length > 0 && (
                        <div className="mb-3">
                          <h5 className="font-medium text-gray-800 mb-1">🏷️ Etiquetas:</h5>
                          <div className="flex gap-1 flex-wrap">
                            {result.finalLabels.map((label, index) => (
                              <span
                                key={index}
                                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Métricas */}
                      <div className="text-xs text-gray-500">
                        Modelo: {result.aiModelUsed} | 
                        Tokens: {result.tokensIn}→{result.tokensOut} | 
                        Latencia: {result.latencyMs}ms
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de Diagnóstico Individual */}
      {showDiagnosisModal && individualDiagnosis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">🔍 Resultado del Diagnóstico Individual</h3>
                <button
                  onClick={() => setShowDiagnosisModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Información del ejercicio */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">📝 Ejercicio Analizado</h4>
                  <p><strong>ID Interno:</strong> {individualDiagnosis.variationId}</p>
                  <p><strong>Display Code:</strong> {individualDiagnosis.exercise.displayCode || 'N/A'}</p>
                  <p><strong>Especialidad:</strong> {individualDiagnosis.exercise.especialidad}</p>
                  <p><strong>Tema:</strong> {individualDiagnosis.exercise.tema}</p>
                  <p><strong>Nivel:</strong> {individualDiagnosis.exercise.nivel}</p>
                </div>

                {/* Comparativa Original vs Corregido */}
                <div className="bg-white p-4 rounded-lg border" data-test="comparativa-block">
                  <h4 className="font-semibold mb-3">🧪 Comparativa</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">Enunciado Original</h5>
                      <p className="p-2 bg-gray-50 rounded border">{individualDiagnosis.exercise.enunciado}</p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Enunciado Corregido</h5>
                      <p className="p-2 bg-green-50 rounded border">{individualDiagnosis.correction?.enunciado_corregido || '—'}</p>
                      {individualDiagnosis.newVariationId && (
                        <div className="text-xs mt-1">
                          <a className="text-blue-600 underline" href={`${API_BASE}/api/admin/qa-sweep-2/variations/${individualDiagnosis.newVariationId}`} target="_blank" rel="noreferrer">
                            Ver nueva versión (ID: {individualDiagnosis.newVariationId})
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">Explicación Original</h5>
                      <p className="p-2 bg-gray-50 rounded border">{individualDiagnosis.exercise.explicacion_global || '—'}</p>
                      <p className="text-xs text-gray-600 mt-1">Taxonomía original: {individualDiagnosis.exercise.especialidad} / {individualDiagnosis.exercise.tema}</p>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Explicación Corregida</h5>
                      <p className="p-2 bg-green-50 rounded border">{individualDiagnosis.correction?.explicacion_global || '—'}</p>
                      {(individualDiagnosis.appliedTaxonomy || individualDiagnosis.diagnosis?.specialty_sugerida || individualDiagnosis.diagnosis?.tema_sugerido) && (
                        <p className="text-xs text-gray-600 mt-1">
                          Taxonomía {(individualDiagnosis.appliedTaxonomy ? 'aplicada' : 'sugerida')}: { (individualDiagnosis.appliedTaxonomy?.specialty) || individualDiagnosis.diagnosis?.specialty_sugerida || individualDiagnosis.exercise.especialidad } / { (individualDiagnosis.appliedTaxonomy?.topic) || individualDiagnosis.diagnosis?.tema_sugerido || individualDiagnosis.exercise.tema }
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <h5 className="font-medium mb-2">Alternativas</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h6 className="text-sm text-gray-600 mb-2">Original</h6>
                        {Object.entries(individualDiagnosis.exercise.alternativas || {}).map(([letter, text]: any) => (
                          <div key={`orig-${letter}`} className="mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold w-6">{letter}.</span>
                              <span className="flex-1 p-2 bg-gray-50 rounded border">{text}</span>
                            </div>
                            {individualDiagnosis.exercise.explicaciones?.[letter] && (
                              <div className="ml-8 mt-1 text-xs text-gray-600">
                                {individualDiagnosis.exercise.explicaciones[letter]}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div>
                        <h6 className="text-sm text-gray-600 mb-2">Corregidas</h6>
                        {individualDiagnosis.correction?.alternativas && Object.entries(individualDiagnosis.correction.alternativas).map(([letter, text]: any) => (
                          <div key={`fix-${letter}`} className="mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold w-6">{letter}.</span>
                              <span className="flex-1 p-2 bg-green-50 rounded border">{text as string}</span>
                            </div>
                            {individualDiagnosis.correction?.explicaciones?.[letter] && (
                              <div className="ml-8 mt-1 text-xs text-gray-600">
                                {individualDiagnosis.correction.explicaciones[letter]}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {individualDiagnosis.newVariationId && (
                        <div className="text-xs mt-1">
                            <a className="text-blue-600 underline" href={`${API_BASE}/api/admin/qa-sweep-2/variations/${individualDiagnosis.newVariationId}`} target="_blank" rel="noreferrer">
                            Abrir variación aplicada (ID: {individualDiagnosis.newVariationId})
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Diagnóstico */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">🔍 Diagnóstico</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    {individualDiagnosis.diagnosis.scorecard && Object.entries(individualDiagnosis.diagnosis.scorecard).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="text-xs text-gray-600 capitalize">{key.replace('_', ' ')}</div>
                        <div className={`font-bold text-lg ${
                          (value as number) === 0 ? 'text-green-600' :
                          (value as number) === 1 ? 'text-yellow-600' :
                          (value as number) === 2 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {value as number}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>Severidad Global:</strong> {individualDiagnosis.diagnosis.severidad_global}</p>
                    <p><strong>Recomendación:</strong> {individualDiagnosis.diagnosis.recomendacion}</p>
                    <p><strong>Etiquetas:</strong> {individualDiagnosis.diagnosis.etiquetas?.join(', ') || 'Ninguna'}</p>
                  </div>
                </div>

                {/* Corrección (si existe) */}
                {individualDiagnosis.correction && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">✨ Corrección Sugerida</h4>
                    <div className="space-y-3">
                      <div>
                        <strong>Enunciado Corregido:</strong>
                        <p className="mt-1 p-2 bg-white rounded border">{individualDiagnosis.correction.enunciado_corregido}</p>
                      </div>
                      <div>
                        <strong>Explicación Global:</strong>
                        <p className="mt-1 p-2 bg-white rounded border">{individualDiagnosis.correction.explicacion_global}</p>
                      </div>
                      {individualDiagnosis.correction.alternativas && (
                        <div>
                          <strong>Alternativas Corregidas:</strong>
                          <div className="mt-2 space-y-2">
                            {Object.entries(individualDiagnosis.correction.alternativas).map(([letter, text]) => (
                              <div key={letter} className="flex items-center gap-2">
                                <span className="font-bold w-6">{letter}.</span>
                                <span className="flex-1 p-2 bg-white rounded border">{text as string}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Métricas */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">📊 Métricas</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <strong>Confianza:</strong> {(individualDiagnosis.confidenceScore * 100).toFixed(1)}%
                    </div>
                    <div>
                      <strong>Tokens In:</strong> {individualDiagnosis.tokensIn}
                    </div>
                    <div>
                      <strong>Tokens Out:</strong> {individualDiagnosis.tokensOut}
                    </div>
                    <div>
                      <strong>Latencia:</strong> {individualDiagnosis.latencyMs}ms
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
