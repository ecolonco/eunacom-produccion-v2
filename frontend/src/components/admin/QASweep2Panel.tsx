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
  displayCode?: string;
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
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Database report modal
  const [dbReportModalOpen, setDbReportModalOpen] = useState(false);
  const [dbReport, setDbReport] = useState<any>(null);
  const [dbReportLoading, setDbReportLoading] = useState(false);
  const [deletingLowQuality, setDeletingLowQuality] = useState(false);

  // Paginación para resultados
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const resultsPerPage = 25;

  // Preview de variaciones a procesar
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Estados para crear nuevo run
  const [newRun, setNewRun] = useState({
    name: '',
    description: '',
    batchSize: 50,
    maxConcurrency: 3,
    specialty: '',
    topic: '',
    baseQuestionFrom: '',
    baseQuestionTo: '',
    skipTaxonomyClassification: true,  // Por defecto NO clasificar
    maxConfidenceScore: '',  // Filtrar por confidence score máximo (opcional)
    onlyWithoutScore: false  // Filtrar SOLO variaciones sin score (nunca analizadas)
  });

  useEffect(() => {
    loadRuns();
    loadStats();
    loadMetadata();
  }, []);

  // Actualizar preview cuando cambien los filtros
  useEffect(() => {
    if (activeTab === 'create') {
      loadPreview();
    }
  }, [
    newRun.specialty,
    newRun.topic,
    newRun.baseQuestionFrom,
    newRun.baseQuestionTo,
    newRun.maxConfidenceScore,
    newRun.onlyWithoutScore,
    newRun.maxConcurrency,
    activeTab
  ]);

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

  const loadPreview = async () => {
    setPreviewLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-sweep-2/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          specialty: newRun.specialty || undefined,
          topic: newRun.topic || undefined,
          baseQuestionFrom: newRun.baseQuestionFrom || undefined,
          baseQuestionTo: newRun.baseQuestionTo || undefined,
          maxConfidenceScore: newRun.maxConfidenceScore || undefined,
          onlyWithoutScore: newRun.onlyWithoutScore,
          maxConcurrency: newRun.maxConcurrency
        })
      });
      const data = await response.json();
      if (data.success) {
        setPreview(data.data);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setPreviewLoading(false);
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

  const openVariationJson = async (variationId: string) => {
    try {
      const resp = await fetch(`${API_BASE}/api/admin/qa-sweep-2/variations/${variationId}` ,{
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const json = await resp.json();
      if (!json.success) {
        alert(`No se pudo abrir la variación: ${json.message || 'Error desconocido'}`);
        return;
      }
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      alert('Error al abrir variación aplicada');
    }
  };

  const loadRunResults = async (runId: string, page: number = 1) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/qa-sweep-2/runs/${runId}/results?page=${page}&limit=${resultsPerPage}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
      );
      const data = await response.json();
      if (data.success) {
        // Ordenar por fecha de creación (más reciente primero)
        const sortedResults = [...data.data.results].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setResults(sortedResults);
        setSelectedRun(data.data.run);
        setCurrentPage(page);
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error loading run results:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (selectedRun && newPage >= 1 && newPage <= totalPages) {
      loadRunResults(selectedRun.id, newPage);
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
          topic: '',
          baseQuestionFrom: '',
          baseQuestionTo: '',
          skipTaxonomyClassification: true,
          maxConfidenceScore: '',
          onlyWithoutScore: false
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
        alert('✅ Run listo para procesamiento. El worker lo detectará en 3-5 segundos.');
        
        // Auto-refrescar cada 2 segundos para ver cuando el worker lo detecta
        const interval = setInterval(() => {
          loadRuns();
        }, 2000);
        
        // Detener el auto-refresh después de 30 segundos
        setTimeout(() => clearInterval(interval), 30000);
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

  const cancelRun = async (runId: string, runName: string) => {
    if (!confirm(`¿Estás seguro de cancelar el run "${runName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-sweep-2/runs/${runId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Run cancelado exitosamente');
        loadRuns();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error cancelling run:', error);
      alert('Error al cancelar el run');
    }
  };

  const loadDatabaseReport = async () => {
    setDbReportLoading(true);
    setDbReportModalOpen(true);
    setDbReport(null);

    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-sweep-2/database-report`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setDbReport(data.data);
      } else {
        alert(`Error: ${data.message}`);
        setDbReportModalOpen(false);
      }
    } catch (error) {
      console.error('Error loading database report:', error);
      alert('Error al cargar el reporte de base de datos');
      setDbReportModalOpen(false);
    } finally {
      setDbReportLoading(false);
    }
  };

  const generateReport = async (runId: string, regenerate = true) => {
    setReportLoading(true);
    setReportModalOpen(true);
    setCurrentReport(null);

    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-sweep-2/runs/${runId}/generate-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ regenerate })
      });

      const data = await response.json();
      if (data.success) {
        setCurrentReport(data.data);
      } else {
        alert(`Error: ${data.message}`);
        setReportModalOpen(false);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte');
      setReportModalOpen(false);
    } finally {
      setReportLoading(false);
    }
  };

  const deleteLowQualityExercises = async () => {
    // Find the count of "Muy baja" exercises from distribution
    const lowQualityItem = dbReport?.distribution?.find((item: any) =>
      item.categoria.includes('Muy baja') || item.categoria.includes('0%')
    );
    const count = lowQualityItem?.cantidad || 0;

    if (count === 0) {
      alert('No hay ejercicios de muy baja calidad (0%) para eliminar.');
      return;
    }

    const confirmMessage = `⚠️ ADVERTENCIA: Estás a punto de eliminar ${count} variaciones con problemas graves (confidence score = 0%).\n\nEsta acción es IRREVERSIBLE y ocultará permanentemente estas variaciones de la base de datos.\n\n¿Estás seguro de que deseas continuar?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setDeletingLowQuality(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-sweep-2/delete-low-quality`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Eliminadas exitosamente ${data.data.deletedCount} variaciones de baja calidad.`);
        // Reload the database report to show updated stats
        loadDatabaseReport();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error deleting low quality exercises:', error);
      alert('Error al eliminar los ejercicios de baja calidad');
    } finally {
      setDeletingLowQuality(false);
    }
  };

  const getRunNumber = (run: QASweep2Run): number => {
    const sortedRuns = [...runs].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return sortedRuns.findIndex(r => r.id === run.id) + 1;
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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">📊 Estadísticas QA Sweep 2.0</h3>
            <button
              onClick={loadDatabaseReport}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-md hover:from-purple-700 hover:to-blue-700 transition duration-200 flex items-center gap-2"
            >
              📊 Ver Reporte Completo de Base de Datos
            </button>
          </div>
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
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">📋 Rango de Ejercicios Base (opcional)</h4>
              <p className="text-sm text-gray-600 mb-3">
                Especifica el rango de ejercicios a procesar. Por ejemplo: del 40 al 60 = 21 ejercicios × 4 variaciones = 84 variaciones.
                Si no especificas rango, se usará el "Tamaño del Lote" en variaciones sueltas.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Desde Ejercicio #</label>
                  <input
                    type="number"
                    value={newRun.baseQuestionFrom}
                    onChange={(e) => setNewRun({ ...newRun, baseQuestionFrom: e.target.value })}
                    placeholder="Ej: 40"
                    min="1"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hasta Ejercicio #</label>
                  <input
                    type="number"
                    value={newRun.baseQuestionTo}
                    onChange={(e) => setNewRun({ ...newRun, baseQuestionTo: e.target.value })}
                    placeholder="Ej: 60"
                    min="1"
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">⚙️ Configuración de Procesamiento</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tamaño del Lote (variaciones)</label>
                  <input
                    type="number"
                    value={newRun.batchSize}
                    onChange={(e) => setNewRun({ ...newRun, batchSize: parseInt(e.target.value) })}
                    min="1"
                    max="1000"
                    placeholder="Solo si no usas rango"
                    className="w-full p-2 border rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">Ignorado si especificas rango</p>
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
                  <p className="text-xs text-gray-500 mt-1">Procesamiento paralelo (max 5)</p>
                </div>
              </div>
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

          {/* Filtro de Confidence Score */}
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <h4 className="font-semibold mb-3 text-gray-800">📊 Filtro de Calidad (Confidence Score)</h4>
            <p className="text-sm text-gray-600 mb-3">
              Procesa solo variaciones activas con un confidence score igual o menor al especificado.
              <strong className="text-blue-700"> Excluye automáticamente las variaciones "Perfecta (0%)"</strong> para no reprocesarlas.
              Útil para reprocesar ejercicios de baja/media calidad en sweeps iterativos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Confidence Score Máximo (%)</label>
                <input
                  type="number"
                  value={newRun.maxConfidenceScore}
                  onChange={(e) => setNewRun({ ...newRun, maxConfidenceScore: e.target.value })}
                  placeholder="Ej: 33 (solo baja confianza)"
                  min="0"
                  max="100"
                  step="1"
                  className="w-full p-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dejar vacío para procesar todas las variaciones
                </p>
              </div>
              <div className="flex flex-col justify-center">
                <div className="space-y-1 text-sm">
                  <p className="text-gray-700"><strong>Sugerencias:</strong></p>
                  <p className="text-gray-600">• <strong>33%:</strong> Solo variaciones con severidad alta (2-3)</p>
                  <p className="text-gray-600">• <strong>66%:</strong> Incluye severidad media (1-2)</p>
                  <p className="text-gray-600">• <strong>85%:</strong> Incluye variaciones corregidas previamente</p>
                </div>
              </div>
            </div>

            {/* Checkbox para SOLO sin score */}
            <div className="mt-4 flex items-start gap-3">
              <input
                type="checkbox"
                id="onlyWithoutScore"
                checked={newRun.onlyWithoutScore}
                onChange={(e) => setNewRun({ ...newRun, onlyWithoutScore: e.target.checked })}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <label htmlFor="onlyWithoutScore" className="block text-sm font-medium text-gray-900 cursor-pointer">
                  Solo procesar variaciones SIN score (nunca analizadas)
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  {newRun.onlyWithoutScore ? (
                    <span className="text-green-700">
                      <strong>✓ Activado</strong> - Se procesarán SOLO las 1,102 variaciones que nunca han sido analizadas (confidenceScore IS NULL).
                      Este filtro es exacto y excluyente.
                    </span>
                  ) : (
                    <span className="text-gray-700">
                      Filtra EXACTAMENTE las variaciones que no tienen confidence score (nunca analizadas).
                      Útil para el primer sweep de calidad sobre ejercicios nuevos.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Cuadro Resumen de Preview */}
          {preview && (
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg">
              <h4 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
                <span>📊</span>
                <span>Resumen de Variaciones a Procesar</span>
                {previewLoading && <span className="text-sm text-gray-500">(actualizando...)</span>}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna izquierda: Datos */}
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-600">Total variaciones activas:</span>
                    <span className="ml-2 font-bold text-gray-900">{preview.totalActive?.toLocaleString()}</span>
                  </div>

                  {preview.baseQuestionsInRange > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-600">Ejercicios base en rango:</span>
                      <span className="ml-2 font-bold text-blue-700">
                        {preview.baseQuestionsInRange} × 4 = {preview.baseQuestionsInRange * 4} variaciones
                      </span>
                    </div>
                  )}

                  {preview.filters.maxConfidenceScore !== null && (
                    <div className="text-sm">
                      <span className="text-gray-600">Confidence máximo:</span>
                      <span className="ml-2 font-bold text-orange-700">{preview.filters.maxConfidenceScore}%</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-purple-200">
                    <div className="text-lg font-bold text-purple-700">
                      ✨ {preview.matchingFilters.toLocaleString()} variaciones a procesar
                    </div>
                  </div>
                </div>

                {/* Columna derecha: Estimaciones */}
                <div className="space-y-2 bg-white/50 p-3 rounded">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Estimaciones:</div>

                  <div className="text-sm flex justify-between">
                    <span className="text-gray-600">⏱️ Tiempo estimado:</span>
                    <span className="font-semibold text-gray-900">
                      ~{preview.estimations?.minutes || 0} min
                    </span>
                  </div>

                  <div className="text-sm flex justify-between">
                    <span className="text-gray-600">💰 Costo estimado:</span>
                    <span className="font-semibold text-green-700">
                      ${preview.estimations?.costUSD?.toFixed(2) || '0.00'} USD
                    </span>
                  </div>

                  <div className="text-sm flex justify-between">
                    <span className="text-gray-600">🔄 Concurrencia:</span>
                    <span className="font-semibold text-gray-900">
                      {preview.estimations?.concurrency || 3}
                    </span>
                  </div>

                  <div className="text-sm flex justify-between">
                    <span className="text-gray-600">🪙 Tokens estimados:</span>
                    <span className="font-semibold text-gray-900">
                      {preview.estimations?.tokens?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>

              {preview.matchingFilters === 0 && (
                <div className="mt-3 p-2 bg-yellow-100 border border-yellow-400 rounded text-sm text-yellow-800">
                  ⚠️ No hay variaciones que cumplan con los filtros seleccionados.
                </div>
              )}
            </div>
          )}

          {/* Opción de clasificación taxonómica */}
          <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <h4 className="font-semibold mb-3 text-gray-800">🏷️ Clasificación Taxonómica</h4>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="classifyExercises"
                checked={!newRun.skipTaxonomyClassification}
                onChange={(e) => setNewRun({ ...newRun, skipTaxonomyClassification: !e.target.checked })}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <label htmlFor="classifyExercises" className="block text-sm font-medium text-gray-900 cursor-pointer">
                  ¿Quiere que la IA clasifique los ejercicios madre?
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  {newRun.skipTaxonomyClassification ? (
                    <span className="text-green-700">
                      <strong>✓ Desactivado (recomendado)</strong> - La IA solo analizará enunciados, alternativas y explicaciones.
                      La clasificación de especialidad y tópico se mantendrá sin cambios.
                      Ideal para ejercicios de Carga Manual por Tópicos.
                    </span>
                  ) : (
                    <span className="text-orange-700">
                      <strong>⚠️ Activado</strong> - La IA podrá reclasificar la especialidad y tópico del ejercicio madre si detecta errores.
                      Usar solo si sospechas que la clasificación actual es incorrecta.
                    </span>
                  )}
                </p>
              </div>
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
                        <span className="px-2 py-1 text-xs font-bold bg-gray-200 text-gray-700 rounded">
                          #{getRunNumber(run)}
                        </span>
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
                      {run.status === 'COMPLETED' && (
                        <button
                          onClick={() => generateReport(run.id)}
                          className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 flex items-center gap-1"
                          title="Generar reporte con IA"
                        >
                          📊 Reporte IA
                        </button>
                      )}
                      {run.status === 'PENDING' && (
                        <button
                          onClick={() => startAnalysis(run.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center gap-1"
                          title="El worker procesará este run automáticamente"
                        >
                          ▶️ Iniciar Análisis
                        </button>
                      )}
                      {(run.status === 'RUNNING' || run.status === 'PENDING') && (
                        <button
                          onClick={() => cancelRun(run.id, run.name)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
                          title="Cancelar este run"
                        >
                          ⛔ Cancelar
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
                  onClick={() => {
                    setSelectedRun(null);
                    setCurrentPage(1);
                    setResults([]);
                  }}
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
                          <span className="font-mono text-sm bg-blue-100 px-2 py-1 rounded font-semibold">
                            {result.displayCode || result.variationId.slice(-8)}
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

              {/* Paginación */}
              {results.length > 0 && totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 text-sm rounded ${
                        currentPage === 1
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      « Primera
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 text-sm rounded ${
                        currentPage === 1
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      ‹ Anterior
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 text-sm rounded ${
                        currentPage === totalPages
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Siguiente ›
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 text-sm rounded ${
                        currentPage === totalPages
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Última »
                    </button>
                  </div>
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
                          <button className="text-blue-600 underline" onClick={()=>openVariationJson(individualDiagnosis.newVariationId)}>
                            Ver nueva versión (ID: {individualDiagnosis.newVariationId})
                          </button>
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
                            <button className="text-blue-600 underline" onClick={()=>openVariationJson(individualDiagnosis.newVariationId)}>
                              Abrir variación aplicada (ID: {individualDiagnosis.newVariationId})
                            </button>
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

      {/* Modal de Reporte IA */}
      {reportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-2xl font-bold">📊 Reporte IA - Trabajo #{currentReport?.runNumber || '...'}</h3>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {reportLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  <p className="mt-4 text-gray-600">Generando reporte con GPT-5...</p>
                </div>
              ) : currentReport ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-bold text-lg mb-2">{currentReport.runName}</h4>
                    <p className="text-sm text-gray-600">{currentReport.runDescription}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Generado: {new Date(currentReport.generatedAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Resumen Ejecutivo (IA) */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <span>🤖</span>
                      <span>Resumen Ejecutivo (GPT-5)</span>
                    </h4>
                    <p className="text-gray-700 whitespace-pre-line">{currentReport.summary}</p>
                  </div>

                  {/* Estadísticas */}
                  {currentReport.stats && (
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-bold mb-3">📊 Estadísticas del Run</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <div className="text-2xl font-bold text-blue-600">{currentReport.stats.totalProcessed || 0}</div>
                          <div className="text-xs text-gray-600">Variaciones</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <div className="text-2xl font-bold text-green-600">{currentReport.stats.corrected || 0}</div>
                          <div className="text-xs text-gray-600">Corregidas</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <div className="text-2xl font-bold text-purple-600">{currentReport.stats.avgConfidence || 0}%</div>
                          <div className="text-xs text-gray-600">Confianza</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <div className="text-2xl font-bold text-orange-600">${currentReport.stats.estimatedCost || 0}</div>
                          <div className="text-xs text-gray-600">Costo Estimado</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <div className="font-bold text-gray-700">{(currentReport.stats.totalTokensIn || 0).toLocaleString()}</div>
                          <div className="text-xs text-gray-600">Tokens Input</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <div className="font-bold text-gray-700">{(currentReport.stats.totalTokensOut || 0).toLocaleString()}</div>
                          <div className="text-xs text-gray-600">Tokens Output</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded">
                          <div className="font-bold text-gray-700">{currentReport.stats.avgLatency || 0}ms</div>
                          <div className="text-xs text-gray-600">Latencia Promedio</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Casos Severos */}
                  {currentReport.severeCases && currentReport.severeCases.length > 0 && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                      <h4 className="font-bold mb-3 text-red-800 flex items-center gap-2">
                        <span>⚠️</span>
                        <span>Casos de Severidad Alta ({currentReport.severeCases.length})</span>
                      </h4>
                      <div className="space-y-4">
                        {currentReport.severeCases.map((caseData: any, idx: number) => (
                          <div key={idx} className="bg-white p-4 rounded border border-red-300">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold">Ejercicio {caseData.displayCode}</span>
                              <span className="px-2 py-1 bg-red-200 text-red-800 text-xs rounded">
                                Severidad: {caseData.severity}
                              </span>
                            </div>
                            
                            {/* Diagnóstico */}
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-gray-700 mb-1">Diagnóstico:</div>
                              <div className="text-sm text-gray-600">{caseData.recommendation}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Etiquetas: {caseData.labels?.join(', ') || 'N/A'}
                              </div>
                            </div>

                            {/* Comparación lado a lado */}
                            {caseData.original && caseData.corrected && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-xs font-semibold text-gray-700 mb-1 bg-gray-100 px-2 py-1 rounded">
                                    📄 Original
                                  </div>
                                  <div className="text-sm p-2 bg-gray-50 rounded border">
                                    {caseData.original.enunciado?.substring(0, 200)}
                                    {caseData.original.enunciado?.length > 200 && '...'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-700 mb-1 bg-green-100 px-2 py-1 rounded">
                                    ✨ Corregido
                                  </div>
                                  <div className="text-sm p-2 bg-green-50 rounded border border-green-300">
                                    {caseData.corrected.enunciado?.substring(0, 200)}
                                    {caseData.corrected.enunciado?.length > 200 && '...'}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Cambio de Taxonomía */}
                            {caseData.taxonomyChange && (
                              <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-300">
                                <div className="text-xs font-semibold text-yellow-800">📚 Reclasificación:</div>
                                <div className="text-sm mt-1">
                                  <span className="line-through text-gray-500">{caseData.taxonomyChange.from}</span>
                                  {' → '}
                                  <span className="text-green-700 font-semibold">{caseData.taxonomyChange.to}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Análisis de Casos Severos (IA) */}
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <span>🔍</span>
                      <span>Análisis Detallado (GPT-5)</span>
                    </h4>
                    <p className="text-gray-700 whitespace-pre-line">{currentReport.severeAnalysis}</p>
                  </div>

                  {/* Recomendaciones (IA) */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <span>💡</span>
                      <span>Recomendaciones (GPT-5)</span>
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {currentReport.recommendations && currentReport.recommendations.map((rec: string, idx: number) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Footer */}
                  <div className="text-center text-xs text-gray-500 pt-4 border-t">
                    <p>Reporte generado automáticamente por GPT-5</p>
                    <p>EUNACOM QA Sweep 2.0 © 2025</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  No se pudo cargar el reporte
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reporte Completo de Base de Datos */}
      {dbReportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h3 className="text-2xl font-bold">📊 Reporte Completo de Base de Datos</h3>
              <button
                onClick={() => setDbReportModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {dbReportLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  <p className="mt-4 text-gray-600">Cargando reporte...</p>
                </div>
              ) : dbReport ? (
                <div className="space-y-6">
                  {/* Total Variaciones Activas */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
                    <h4 className="text-3xl font-bold text-center text-gray-800 mb-2">
                      {dbReport.totalActive.toLocaleString()}
                    </h4>
                    <p className="text-center text-gray-600 font-semibold">Total Variaciones Activas</p>
                  </div>

                  {/* Distribución por Confidence Score */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                    <h4 className="font-bold text-xl mb-4 text-gray-800">📊 Distribución por Confidence Score</h4>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-2 text-left">Categoría</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Cantidad de Ejercicios</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Porcentaje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dbReport.distribution.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2">{item.categoria}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-semibold">{item.cantidad.toLocaleString()}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{item.porcentaje}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Botón para eliminar ejercicios de baja calidad */}
                    <div className="mt-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                      <h5 className="font-bold text-lg mb-2 text-red-800 flex items-center gap-2">
                        <span>🗑️</span>
                        <span>Eliminar Ejercicios de Baja Calidad</span>
                      </h5>
                      <p className="text-sm text-gray-700 mb-3">
                        Eliminar permanentemente las variaciones con <strong>confidence score = 0% (severidad crítica)</strong>.
                        Esta acción es <strong className="text-red-700">irreversible</strong> y ocultará estas variaciones de la base de datos.
                      </p>
                      <button
                        onClick={deleteLowQualityExercises}
                        disabled={deletingLowQuality}
                        className={`px-6 py-3 rounded-md font-semibold transition duration-200 flex items-center gap-2 ${
                          deletingLowQuality
                            ? 'bg-gray-400 cursor-not-allowed text-gray-700'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        {deletingLowQuality ? (
                          <>
                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Eliminando...</span>
                          </>
                        ) : (
                          <>
                            <span>🗑️</span>
                            <span>Eliminar Ejercicios con Severidad Crítica (0%)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Estadísticas QA Sweep 2.0 */}
                  <div className="bg-white border-2 border-purple-200 rounded-lg p-6">
                    <h4 className="font-bold text-xl mb-4 text-gray-800">🤖 Estadísticas QA Sweep 2.0</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg text-center">
                        <div className="text-3xl font-bold text-blue-600">{dbReport.qaStats.totalAnalisis.toLocaleString()}</div>
                        <div className="text-sm text-gray-600 mt-1">Total Análisis</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <div className="text-3xl font-bold text-green-600">{dbReport.qaStats.variacionesUnicasAnalizadas.toLocaleString()}</div>
                        <div className="text-sm text-gray-600 mt-1">Variaciones Únicas</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg text-center">
                        <div className="text-3xl font-bold text-purple-600">{dbReport.qaStats.correccionesAplicadas.toLocaleString()}</div>
                        <div className="text-sm text-gray-600 mt-1">Correcciones Aplicadas</div>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg text-center">
                        <div className="text-3xl font-bold text-yellow-600">{(dbReport.qaStats.confidencePromedio * 100).toFixed(1)}%</div>
                        <div className="text-sm text-gray-600 mt-1">Confidence Promedio</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg text-center">
                        <div className="text-3xl font-bold text-orange-600">{dbReport.qaStats.totalTokens.toLocaleString()}</div>
                        <div className="text-sm text-gray-600 mt-1">Total Tokens</div>
                      </div>
                      <div className="bg-pink-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-pink-600">
                          {dbReport.qaStats.totalTokensIn.toLocaleString()} → {dbReport.qaStats.totalTokensOut.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Tokens In → Out</div>
                      </div>
                    </div>
                  </div>

                  {/* Runs por Estado */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                    <h4 className="font-bold text-xl mb-4 text-gray-800">🔄 Runs por Estado</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {dbReport.runsByStatus.map((item: any, idx: number) => {
                        const emoji = {
                          RUNNING: '🔄',
                          PENDING: '⏳',
                          COMPLETED: '✅',
                          FAILED: '❌'
                        }[item.status] || '❓';

                        const bgColor = {
                          RUNNING: 'bg-blue-50',
                          PENDING: 'bg-yellow-50',
                          COMPLETED: 'bg-green-50',
                          FAILED: 'bg-red-50'
                        }[item.status] || 'bg-gray-50';

                        const textColor = {
                          RUNNING: 'text-blue-600',
                          PENDING: 'text-yellow-600',
                          COMPLETED: 'text-green-600',
                          FAILED: 'text-red-600'
                        }[item.status] || 'text-gray-600';

                        return (
                          <div key={idx} className={`${bgColor} p-4 rounded-lg text-center`}>
                            <div className="text-xl mb-1">{emoji}</div>
                            <div className={`text-2xl font-bold ${textColor}`}>{item.count}</div>
                            <div className="text-sm text-gray-600 mt-1">{item.status}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Últimos Runs */}
                  <div className="bg-white border-2 border-green-200 rounded-lg p-6">
                    <h4 className="font-bold text-xl mb-4 text-gray-800">🕐 Últimos 5 Runs Creados</h4>
                    <div className="space-y-3">
                      {dbReport.recentRuns.map((run: any, idx: number) => {
                        const emoji = {
                          RUNNING: '🔄',
                          PENDING: '⏳',
                          COMPLETED: '✅',
                          FAILED: '❌'
                        }[run.status] || '❓';

                        return (
                          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{emoji}</span>
                                <span className="font-semibold text-gray-800">{run.name}</span>
                                <span className="text-sm text-gray-600">({run.resultsCount} resultados)</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Creado: {new Date(run.createdAt).toLocaleString('es-CL')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resumen de Calidad */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6">
                    <h4 className="font-bold text-xl mb-4 text-gray-800">✅ Resumen de Calidad</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-orange-600">{dbReport.qualitySummary.needsReview.toLocaleString()}</div>
                        <div className="text-sm text-gray-600 mt-2">⚠️ Variaciones que necesitan revisión</div>
                        <div className="text-xs text-gray-500 mt-1">(sin score o baja confianza)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-green-600">{dbReport.qualitySummary.goodQuality.toLocaleString()}</div>
                        <div className="text-sm text-gray-600 mt-2">✅ Variaciones de buena calidad</div>
                        <div className="text-xs text-gray-500 mt-1">(≥67% confidence)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600">{dbReport.qualitySummary.coveragePercentage}%</div>
                        <div className="text-sm text-gray-600 mt-2">📊 Cobertura QA</div>
                        <div className="text-xs text-gray-500 mt-1">(variaciones analizadas/total)</div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center text-xs text-gray-500 pt-4 border-t">
                    <p>Reporte generado en tiempo real</p>
                    <p>EUNACOM QA Sweep 2.0 © 2025</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  No se pudo cargar el reporte
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
