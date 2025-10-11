import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://eunacom-backend-v3.onrender.com';

interface QAVariation {
  id: string;
  baseId: string;
  variationNumber: number;
  specialty: string;
  topic: string;
  labels: string[];
  riskLevel: string;
  content: string;
  alternatives: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
  }>;
  explanation: string;
  createdAt: string;
  qaRunId?: string;
  notes?: string[];
}

interface QALabel {
  label: string;
  count: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const QAControlPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [variations, setVariations] = useState<QAVariation[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<Set<string>>(new Set());
  const [availableLabels, setAvailableLabels] = useState<QALabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [filterLabel, setFilterLabel] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    label: '',
    specialty: '',
    topic: ''
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const loadLabels = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-control/labels`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      if (data.success) {
        setAvailableLabels(data.data.labels);
      }
    } catch (error) {
      console.error('Error loading labels:', error);
    }
  };

  const loadVariations = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '100'
      });

      if (appliedFilters.label) params.append('label', appliedFilters.label);
      if (appliedFilters.specialty) params.append('specialty', appliedFilters.specialty);
      if (appliedFilters.topic) params.append('topic', appliedFilters.topic);

      const response = await fetch(`${API_BASE}/api/admin/qa-control/variations?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      const data = await response.json();
      if (data.success) {
        setVariations(data.data.variations);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error loading variations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabels();
  }, []);

  useEffect(() => {
    loadVariations(1);
  }, [appliedFilters]);

  const handleSelectVariation = (variationId: string) => {
    const newSelected = new Set(selectedVariations);
    if (newSelected.has(variationId)) {
      newSelected.delete(variationId);
    } else {
      newSelected.add(variationId);
    }
    setSelectedVariations(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedVariations.size === variations.length) {
      setSelectedVariations(new Set());
    } else {
      setSelectedVariations(new Set(variations.map(v => v.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedVariations.size === 0) return;

    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar ${selectedVariations.size} variaciones? Esta acción no se puede deshacer.`
    );

    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/qa-control/variations`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ variationIds: Array.from(selectedVariations) })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
        setSelectedVariations(new Set());
        loadVariations(pagination.page); // Reload current page
      } else {
        alert(`❌ Error: ${result.message}`);
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    loadVariations(newPage);
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      label: filterLabel,
      specialty: filterSpecialty,
      topic: filterTopic
    });
    setSelectedVariations(new Set()); // Clear selections when filtering
  };

  const handleClearFilters = () => {
    setFilterLabel('');
    setFilterSpecialty('');
    setFilterTopic('');
    setAppliedFilters({
      label: '',
      specialty: '',
      topic: ''
    });
    setSelectedVariations(new Set()); // Clear selections when clearing filters
  };

  if (loading && variations.length === 0) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Cargando variaciones con etiquetas QA...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Control de Calidad QA - Variaciones Etiquetadas</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ← Volver
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 border rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">🔍 Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Etiqueta QA</label>
            <select
              value={filterLabel}
              onChange={(e) => setFilterLabel(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Todas las etiquetas</option>
              {availableLabels.map(label => (
                <option key={label.label} value={label.label}>
                  {label.label} ({label.count})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Especialidad</label>
            <input
              type="text"
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              placeholder="ej: OBSTETRICIA Y GINECOLOGÍA"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tema</label>
            <input
              type="text"
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              placeholder="ej: Ginecología"
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🔍 Filtrar
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Limpiar
            </button>
          </div>
        </div>
        
        {/* Applied Filters Display */}
        {(appliedFilters.label || appliedFilters.specialty || appliedFilters.topic) && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
            <div className="text-sm font-medium text-blue-800 mb-1">Filtros aplicados:</div>
            <div className="flex flex-wrap gap-2">
              {appliedFilters.label && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Etiqueta: {appliedFilters.label}
                </span>
              )}
              {appliedFilters.specialty && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Especialidad: {appliedFilters.specialty}
                </span>
              )}
              {appliedFilters.topic && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Tema: {appliedFilters.topic}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">📊 Estadísticas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium">Total Variaciones</div>
            <div className="text-2xl font-bold text-blue-600">{pagination.total}</div>
          </div>
          <div>
            <div className="font-medium">Página Actual</div>
            <div className="text-2xl font-bold text-blue-600">{pagination.page} / {pagination.totalPages}</div>
          </div>
          <div>
            <div className="font-medium">Por Página</div>
            <div className="text-2xl font-bold text-blue-600">{pagination.limit}</div>
          </div>
          <div>
            <div className="font-medium">Seleccionadas</div>
            <div className="text-2xl font-bold text-orange-600">{selectedVariations.size}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">⚡ Acciones en Lote</h3>
            <p className="text-sm text-gray-600">
              {selectedVariations.size} de {variations.length} variaciones seleccionadas
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {selectedVariations.size === variations.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedVariations.size === 0 || deleting}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              {deleting ? 'Eliminando...' : `🗑️ Eliminar (${selectedVariations.size})`}
            </button>
          </div>
        </div>
      </div>

      {/* Variations List */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b">
          <h3 className="font-semibold">
            📋 Variaciones Etiquetadas ({variations.length})
          </h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {variations.map((variation, index) => (
            <div
              key={variation.id}
              className={`p-4 border-b hover:bg-gray-50 ${
                selectedVariations.has(variation.id) ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedVariations.has(variation.id)}
                  onChange={() => handleSelectVariation(variation.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      #{index + 1} - Variación {variation.variationNumber}/4
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {variation.topic}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      variation.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                      variation.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {variation.riskLevel}
                    </span>
                    <div className="flex gap-1 flex-wrap">
                      {variation.labels.map(label => (
                        <span
                          key={label}
                          className={`text-xs px-2 py-1 rounded ${
                            label.includes('clinica_inconsistente') || label.includes('error_contenido') 
                              ? 'bg-red-100 text-red-800' 
                              : label.includes('sin_') || label.includes('insuficiente')
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {variation.notes && variation.notes.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                      <div className="text-xs font-medium text-yellow-800 mb-1">Notas QA:</div>
                      {variation.notes.map((note, noteIndex) => (
                        <div key={noteIndex} className="text-xs text-yellow-700">• {note}</div>
 