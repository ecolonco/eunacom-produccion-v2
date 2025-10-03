import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  PencilIcon, 
  FunnelIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Exercise {
  id: string;
  sequence_number: number;
  content: string;
  specialty: string;
  topic: string;
  created_at: string;
  qa_review_count: number;
  status: string;
}

interface FilterOptions {
  specialties: string[];
  topics: { specialty: string; topic: string }[];
  statuses: string[];
  qaReviewRanges: { label: string; value: string }[];
}

interface Filters {
  specialty: string;
  topic: string;
  status: string;
  qaReviewRange: string;
  searchTerm: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd
}

interface ExerciseManagementProps {
  onBack?: () => void;
}

const ExerciseManagement: React.FC<ExerciseManagementProps> = ({ onBack }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const [filters, setFilters] = useState<Filters>({
    specialty: '',
    topic: '',
    status: '',
    qaReviewRange: '',
    searchTerm: '',
    startDate: todayStr,
    endDate: todayStr
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    specialties: [],
    topics: [],
    statuses: [],
    qaReviewRanges: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editData, setEditData] = useState<any | null>(null);

  const itemsPerPage = 100;
  // API base para producción (Vercel)
  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';

  useEffect(() => {
    fetchExercises();
    fetchFilterOptions();
  }, [currentPage, filters]);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await fetch(`${API_BASE}/api/exercise-management/list?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();

      // Normalizar respuesta para evitar crash si la API cambia el shape
      const normalizedExercises: Exercise[] = Array.isArray(data?.exercises)
        ? data.exercises
        : (Array.isArray(data?.data?.exercises) ? data.data.exercises : []);

      const normalizedPages: number = Number(
        data?.pagination?.pages ?? data?.data?.pagination?.pages ?? 1
      );

      setExercises(normalizedExercises);
      setTotalPages(isFinite(normalizedPages) && normalizedPages > 0 ? normalizedPages : 1);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await fetch(`${API_BASE}/api/exercise-management/filters`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();

      const fo = data?.filters ?? data?.data?.filters ?? {};
      setFilterOptions({
        specialties: Array.isArray(fo.specialties) ? fo.specialties : [],
        topics: Array.isArray(fo.topics) ? fo.topics : [],
        statuses: Array.isArray(fo.statuses) ? fo.statuses : [],
        qaReviewRanges: Array.isArray(fo.qaReviewRanges) ? fo.qaReviewRanges : []
      });
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      specialty: '',
      topic: '',
      status: '',
      qaReviewRange: '',
      searchTerm: '',
      startDate: todayStr,
      endDate: todayStr
    });
    setCurrentPage(1);
  };

  const getStatusBadgeConfig = (status: string) => {
    const configs = {
      'PENDING': { 
        colors: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
        label: 'Pendiente'
      },
      'REVIEW_REQUIRED': { 
        colors: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white',
        label: 'Revisión Requerida'
      },
      'APPROVED': { 
        colors: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
        label: 'Aprobado'
      },
      'REJECTED': { 
        colors: 'bg-gradient-to-r from-red-500 to-pink-500 text-white',
        label: 'Rechazado'
      },
      'ARCHIVED': { 
        colors: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white',
        label: 'Archivado'
      }
    };
    return configs[status as keyof typeof configs] || { colors: 'bg-gray-500 text-white', label: status };
  };

  const getQAReviewBadgeConfig = (count: number) => {
    if (count === 0) return { colors: 'bg-gray-500 text-white', label: 'Sin Revisión' };
    if (count === 1) return { colors: 'bg-blue-500 text-white', label: '1 Revisión' };
    if (count === 2) return { colors: 'bg-green-500 text-white', label: '2 Revisiones' };
    return { colors: 'bg-purple-500 text-white', label: `${count} Revisiones` };
  };

  const handleEditExercise = async (exercise: Exercise) => {
    console.log('Editar ejercicio clic:', exercise);
    setSelectedExercise(exercise);
    setShowEditModal(true);
    setEditLoading(true);
    setEditError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch(`${API_BASE}/api/exercise-management/exercise/${exercise.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'No se pudo cargar el ejercicio');
      }
      setEditData(json.data);
    } catch (e: any) {
      console.error('Error loading exercise detail:', e);
      setEditError(e?.message || 'Error cargando ejercicio');
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedExercise || !editData) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch(`${API_BASE}/api/exercise-management/exercise/${selectedExercise.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          content: editData.content,
          variations: editData.variations.map((v: any) => ({
            id: v.id,
            content: v.content,
            explanation: v.explanation,
            alternatives: v.alternatives.map((a: any) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect }))
          }))
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'No se pudo guardar');
      setShowEditModal(false);
      setSelectedExercise(null);
      setEditData(null);
      fetchExercises();
    } catch (e: any) {
      alert(e?.message || 'Error al guardar');
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedExercise(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando ejercicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📋 Gestión de Ejercicios
              </h1>
              <p className="text-gray-600">
                {exercises.length} ejercicios • Página {currentPage} de {totalPages}
              </p>
            </div>
            <div className="flex gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                  Volver
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FunnelIcon className="h-5 w-5" />
                Filtros {Object.values(filters).some(v => v !== '') && '(Activos)'}
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Especialidad
                  </label>
                  <select
                    value={filters.specialty}
                    onChange={(e) => handleFilterChange('specialty', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas</option>
                    {filterOptions.specialties.map(specialty => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tema
                  </label>
                  <select
                    value={filters.topic}
                    onChange={(e) => handleFilterChange('topic', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    {filterOptions.topics
                      .filter(t => !filters.specialty || t.specialty === filters.specialty)
                      .map(topic => (
                        <option key={`${topic.specialty}-${topic.topic}`} value={topic.topic}>
                          {topic.topic}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    {filterOptions.statuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Revisiones QA
                  </label>
                  <select
                    value={filters.qaReviewRange}
                    onChange={(e) => handleFilterChange('qaReviewRange', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas</option>
                    {filterOptions.qaReviewRanges.map(range => (
                      <option key={range.value} value={range.value}>{range.label}</option>
                    ))}
                  </select>
                </div>
              </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Exercises Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Especialidad</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Tema</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">QA Reviews</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Fecha</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {exercises.map((exercise, index) => (
                  <tr key={exercise.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">
                      #{exercise.sequence_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {exercise.specialty}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {exercise.topic}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const config = getStatusBadgeConfig(exercise.status);
                        return (
                          <span className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-bold shadow-lg ${config.colors}`}>
                            {config.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const config = getQAReviewBadgeConfig(exercise.qa_review_count);
                        return (
                          <span className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-bold ${config.colors} shadow-lg`}>
                            {config.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(exercise.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleEditExercise(exercise)}
                        className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Anterior
              </button>

              <span className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Siguiente
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && createPortal((
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Editar Ejercicio {selectedExercise ? `#${selectedExercise.sequence_number}` : ''}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {editLoading ? (
              <div className="text-center text-gray-500">Cargando ejercicio...</div>
            ) : editError ? (
              <div className="text-red-600 text-sm">{editError}</div>
            ) : editData ? (
              <div className="space-y-6">
                {/* Base question content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ejercicio madre</label>
                  <textarea
                    value={editData.content || ''}
                    onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                {/* Variations */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Variaciones</h3>
                  {editData.variations?.map((v: any, idx: number) => (
                    <div key={v.id} className="border rounded-lg p-4 space-y-3">
                      <div className="text-sm text-gray-600 font-medium">Variación #{v.variationNumber || idx + 1}</div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Enunciado</label>
                        <textarea
                          value={v.content || ''}
                          onChange={(e) => {
                            const nv = [...editData.variations]; nv[idx] = { ...nv[idx], content: e.target.value }; setEditData({ ...editData, variations: nv });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Explicación</label>
                        <textarea
                          value={v.explanation || ''}
                          onChange={(e) => {
                            const nv = [...editData.variations]; nv[idx] = { ...nv[idx], explanation: e.target.value }; setEditData({ ...editData, variations: nv });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-gray-600 font-medium">Alternativas</div>
                        {v.alternatives?.map((a: any, aidx: number) => (
                          <div key={a.id} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={!!a.isCorrect}
                              onChange={(e) => {
                                const nv = [...editData.variations];
                                const alts = [...nv[idx].alternatives];
                                alts[aidx] = { ...alts[aidx], isCorrect: e.target.checked };
                                nv[idx] = { ...nv[idx], alternatives: alts };
                                setEditData({ ...editData, variations: nv });
                              }}
                            />
                            <input
                              type="text"
                              value={a.text || ''}
                              onChange={(e) => {
                                const nv = [...editData.variations];
                                const alts = [...nv[idx].alternatives];
                                alts[aidx] = { ...alts[aidx], text: e.target.value };
                                nv[idx] = { ...nv[idx], alternatives: alts };
                                setEditData({ ...editData, variations: nv });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Guardar (Demo)
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
};

export default ExerciseManagement;
