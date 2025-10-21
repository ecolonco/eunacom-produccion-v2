import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PencilIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';

interface Exercise {
  id: string;
  sequence_number: number;
  content: string;
  specialty: string | null;
  topic: string | null;
  created_at: string;
  qa_review_count: number;
  status: string;
}

interface FilterOptions {
  specialties: string[];
  topics: { specialty: string | null; topic: string }[];
}

interface Filters {
  specialty: string;
  topic: string;
  searchTerm: string;
  qaReviewRange: string;
}

interface ExerciseManagementProps {
  onBack?: () => void;
}

const INITIAL_FILTERS: Filters = {
  specialty: '',
  topic: '',
  searchTerm: '',
  qaReviewRange: '',
};

const ITEMS_PER_PAGE = 100;

const ExerciseManagement: React.FC<ExerciseManagementProps> = ({ onBack }) => {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    specialties: [],
    topics: [],
  });
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editData, setEditData] = useState<any | null>(null);

  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';

  const filteredTopics = useMemo(() => {
    if (!filters.specialty) {
      return filterOptions.topics;
    }
    return filterOptions.topics.filter((topic) => topic.specialty === filters.specialty);
  }, [filterOptions.topics, filters.specialty]);

  const allSelected = exercises.length > 0 && exercises.every((exercise) => selectedIds.has(exercise.id));
  const selectedCount = selectedIds.size;

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [currentPage, filters]);

  useEffect(() => {
    // Clear selection when the list changes
    setSelectedIds(new Set());
  }, [filters, currentPage]);

  const mergeFilterOptions = useCallback(
    (
      specialtiesInput: (string | null | undefined)[],
      topicsInput: { specialty: string | null; topic: string | null | undefined }[],
    ) => {
      setFilterOptions((prev) => {
        const specialtySet = new Set(prev.specialties);
        specialtiesInput
          .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
          .forEach((name) => specialtySet.add(name.trim()));

        const topicMap = new Map<string, { specialty: string | null; topic: string }>();
        prev.topics.forEach((topic) => {
          const key = `${topic.specialty ?? 'null'}|${topic.topic}`;
          topicMap.set(key, topic);
        });
        topicsInput
          .filter((topic) => topic.topic && topic.topic.trim().length > 0)
          .forEach((topic) => {
            const normalizedTopic = topic.topic!.trim();
            const key = `${topic.specialty ?? 'null'}|${normalizedTopic}`;
            if (!topicMap.has(key)) {
              topicMap.set(key, {
                specialty: topic.specialty ?? null,
                topic: normalizedTopic,
              });
            }
          });

        return {
          specialties: Array.from(specialtySet).sort((a, b) => a.localeCompare(b)),
          topics: Array.from(topicMap.values()).sort((a, b) => {
            const specialtyCompare = (a.specialty ?? '').localeCompare(b.specialty ?? '');
            if (specialtyCompare !== 0) return specialtyCompare;
            return a.topic.localeCompare(b.topic);
          }),
        };
      });
    },
    [],
  );

  const fetchExercises = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await fetch(`${API_BASE}/api/exercise-management/list?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const payload = await response.json();
      const data = payload?.data ?? payload;
      const items: Exercise[] = Array.isArray(data?.exercises)
        ? data.exercises
        : Array.isArray(data?.items)
          ? data.items
          : [];
      const pages = Number(data?.pagination?.pages ?? payload?.pagination?.pages ?? 1);

      setExercises(items);
      setTotalPages(Number.isFinite(pages) && pages > 0 ? pages : 1);

      // Merge filter options based on the current dataset for a reliable fallback.
      const specialtiesFromData = items.map((item) => item.specialty).filter(Boolean);
      const topicsFromData = items
        .filter((item) => item.topic && item.topic.trim().length > 0)
        .map((item) => ({
          specialty: item.specialty ?? null,
          topic: item.topic,
        }));
      mergeFilterOptions(specialtiesFromData, topicsFromData);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const fetchManagementFilters = async () => {
      const response = await fetch(`${API_BASE}/api/exercise-management/filters`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const data = payload?.data ?? payload ?? {};
      const specialties = Array.isArray(data?.specialties)
        ? data.specialties.filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0)
        : [];
      const topics = Array.isArray(data?.topics)
        ? data.topics.map((topic: any) => ({
            specialty: topic.specialty ?? topic.specialtyName ?? null,
            topic: topic.topic ?? topic.name ?? '',
          }))
        : [];

      return { specialties, topics };
    };

    const fetchTaxonomyInventory = async () => {
      const response = await fetch(`${API_BASE}/api/taxonomy-inventory/full`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const data = payload?.data ?? payload ?? {};
      const inventory = Array.isArray(data?.inventory) ? data.inventory : [];

      const specialties: string[] = [];
      const topics: { specialty: string | null; topic: string }[] = [];

      inventory.forEach((specialty: any) => {
        const specialtyName = specialty.name ?? specialty.specialty ?? specialty.specialtyName ?? null;
        if (specialtyName && typeof specialtyName === 'string') {
          specialties.push(specialtyName);
        }

        const specialtyTopics = Array.isArray(specialty.topics) ? specialty.topics : [];
        specialtyTopics.forEach((topic: any) => {
          const topicName = topic.name ?? topic.topic ?? '';
          if (topicName && typeof topicName === 'string') {
            topics.push({ specialty: specialtyName, topic: topicName });
          }
        });
      });

      return { specialties, topics };
    };

    try {
      const { specialties, topics } = await fetchManagementFilters();
      mergeFilterOptions(specialties, topics);
      const taxonomyFallback = await fetchTaxonomyInventory();
      mergeFilterOptions(taxonomyFallback.specialties, taxonomyFallback.topics);
    } catch (error) {
      console.error('Error fetching filter options:', error);
      try {
        const taxonomyFallback = await fetchTaxonomyInventory();
        mergeFilterOptions(taxonomyFallback.specialties, taxonomyFallback.topics);
      } catch (taxonomyError) {
        console.error('Error fetching taxonomy inventory for filters:', taxonomyError);
      }
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'specialty' ? { topic: '' } : null),
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    setCurrentPage(1);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(exercises.map((exercise) => exercise.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const performBulkStatusUpdate = async (status: string) => {
    if (selectedIds.size === 0) return;
    const confirmation = window.confirm(
      `¿Confirma que desea marcar ${selectedIds.size} ejercicios como ${status}?`,
    );
    if (!confirmation) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await fetch(`${API_BASE}/api/exercise-management/bulk-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ids: Array.from(selectedIds), status }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || 'No se pudo actualizar el estado');
      }
      setSelectedIds(new Set());
      fetchExercises();
    } catch (error: any) {
      alert(error?.message || 'Error al actualizar el estado');
    }
  };

  const performBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmation = window.confirm(
      `¿Confirma que desea eliminar ${selectedIds.size} ejercicios? Esta acción no se puede deshacer.`,
    );
    if (!confirmation) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await fetch(`${API_BASE}/api/exercise-management/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || 'No se pudieron eliminar los ejercicios');
      }
      setSelectedIds(new Set());
      fetchExercises();
    } catch (error: any) {
      alert(error?.message || 'Error al eliminar los ejercicios');
    }
  };

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
  };

  const statusBadge = (status: string) => {
    const baseClass =
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide';
    switch (status) {
      case 'APPROVED':
        return <span className={`${baseClass} bg-emerald-100 text-emerald-700`}>Aprobado</span>;
      case 'ARCHIVED':
        return <span className={`${baseClass} bg-slate-200 text-slate-700`}>Archivado</span>;
      case 'REVIEW_REQUIRED':
        return <span className={`${baseClass} bg-blue-100 text-blue-700`}>Revisión requerida</span>;
      case 'PENDING':
      default:
        return <span className={`${baseClass} bg-amber-100 text-amber-700`}>Pendiente</span>;
    }
  };

  const handleEditExercise = async (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setShowEditModal(true);
    setEditLoading(true);
    setEditError('');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch(`${API_BASE}/api/exercise-management/exercise/${exercise.id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'No se pudo cargar el ejercicio');
      }
      setEditData(json.data);
    } catch (error: any) {
      console.error('Error loading exercise detail:', error);
      setEditError(error?.message || 'Error cargando ejercicio');
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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content: editData.content,
          variations: editData.variations.map((variation: any) => ({
            id: variation.id,
            content: variation.content,
            explanation: variation.explanation,
            alternatives: variation.alternatives.map((alternative: any) => ({
              id: alternative.id,
              text: alternative.text,
              isCorrect: alternative.isCorrect,
              explanation: alternative.explanation,
            })),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'No se pudo guardar el ejercicio');
      }
      setShowEditModal(false);
      setSelectedExercise(null);
      setEditData(null);
      fetchExercises();
    } catch (error: any) {
      alert(error?.message || 'Error al guardar el ejercicio');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando ejercicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span role="img" aria-label="Gestión de ejercicios">
                  📋
                </span>
                Gestión de Ejercicios
              </h1>
              <p className="text-gray-600">
                {exercises.length} ejercicios • Página {currentPage} de {totalPages}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {selectedCount > 0 && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl">
                  <span className="text-sm text-blue-700 font-medium">
                    {selectedCount} ejercicio{selectedCount !== 1 && 's'} seleccionado{selectedCount !== 1 && 's'}
                  </span>
                  <button
                    onClick={performBulkDelete}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Eliminar
                  </button>
                  <button
                    onClick={() => performBulkStatusUpdate('ARCHIVED')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <ArchiveBoxIcon className="h-4 w-4" />
                    Archivar
                  </button>
                </div>
              )}

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
                onClick={() => setFilters((prev) => ({ ...prev }))}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FunnelIcon className="h-5 w-5" />
                Filtros
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="md:col-span-3 lg:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar por texto
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon
                    className="text-gray-400 absolute left-3 top-3 pointer-events-none"
                    width={20}
                    height={20}
                  />
                  <input
                    type="text"
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    placeholder="Palabras clave, contenido o ID..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Especialidad</label>
                <select
                  value={filters.specialty}
                  onChange={(e) => handleFilterChange('specialty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas</option>
                  {filterOptions.specialties.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
                <select
                  value={filters.topic}
                  onChange={(e) => handleFilterChange('topic', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  {filteredTopics.map((topic) => (
                    <option key={`${topic.specialty ?? 'general'}-${topic.topic}`} value={topic.topic}>
                      {topic.topic}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">QA Reviews</label>
                <select
                  value={filters.qaReviewRange}
                  onChange={(e) => handleFilterChange('qaReviewRange', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas</option>
                  <option value="0">Sin revisar</option>
                  <option value="1-2">1 a 2 revisiones</option>
                  <option value="3-5">3 a 5 revisiones</option>
                  <option value="5+">5 o más revisiones</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                {filters.specialty
                  ? `Especialidad seleccionada: ${filters.specialty}`
                  : 'Filtra por especialidad o tema para acotar el listado.'}
              </div>
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Especialidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tema
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    QA Reviews
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha creación
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exercises.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                      No hay ejercicios que coincidan con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  exercises.map((exercise) => (
                    <tr key={exercise.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(exercise.id)}
                          onChange={() => toggleSelect(exercise.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
                        #{exercise.sequence_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exercise.specialty ?? 'Sin especialidad'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exercise.topic ?? 'Sin tema'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {statusBadge(exercise.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {exercise.qa_review_count ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(exercise.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditExercise(exercise)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Anterior
              </button>

              <span className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Siguiente
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showEditModal &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0 as any,
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '900px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 25px 45px rgba(0,0,0,0.15)',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827' }}>
                      ✏️ Editar Ejercicio #{selectedExercise?.sequence_number}
                    </h2>
                    <p style={{ color: '#6b7280', marginTop: '4px' }}>
                      Actualiza el contenido del ejercicio madre y sus variaciones.
                    </p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#9ca3af',
                      fontSize: '24px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div style={{ padding: '24px' }}>
                {editLoading && (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
                    <p style={{ color: '#6b7280' }}>Cargando información del ejercicio...</p>
                  </div>
                )}

                {!editLoading && editError && (
                  <div style={{ backgroundColor: '#fee2e2', padding: '16px', borderRadius: '12px' }}>
                    <p style={{ color: '#b91c1c', fontWeight: 600 }}>{editError}</p>
                  </div>
                )}

                {!editLoading && editData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                        Contenido principal
                      </label>
                      <textarea
                        value={editData.content}
                        onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                        style={{
                          width: '100%',
                          minHeight: '120px',
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid #d1d5db',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        backgroundColor: '#f9fafb',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <h3 style={{ fontWeight: 700, color: '#1f2937', marginBottom: '12px' }}>
                        Variaciones ({editData.variations.length})
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {editData.variations.map((variation: any, index: number) => (
                          <div
                            key={variation.id}
                            style={{
                              borderRadius: '10px',
                              border: '1px solid #e5e7eb',
                              backgroundColor: 'white',
                              padding: '16px',
                              boxShadow: '0 5px 15px rgba(15, 23, 42, 0.05)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '12px',
                              }}
                            >
                              <span style={{ fontWeight: 600, color: '#1f2937' }}>
                                Variación {variation.variationNumber ?? index + 1}
                              </span>
                              <span
                                style={{
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  padding: '4px 8px',
                                  borderRadius: '999px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                              >
                                ID {variation.displayCode ?? variation.id}
                              </span>
                            </div>

                            <div style={{ display: 'grid', gap: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                                  Contenido
                                </label>
                                <textarea
                                  value={variation.content}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      variations: editData.variations.map((v: any, idx: number) =>
                                        idx === index ? { ...v, content: e.target.value } : v,
                                      ),
                                    })
                                  }
                                  style={{
                                    width: '100%',
                                    minHeight: '90px',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                                  Explicación
                                </label>
                                <textarea
                                  value={variation.explanation}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      variations: editData.variations.map((v: any, idx: number) =>
                                        idx === index ? { ...v, explanation: e.target.value } : v,
                                      ),
                                    })
                                  }
                                  style={{
                                    width: '100%',
                                    minHeight: '90px',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                                  Alternativas
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  {variation.alternatives.map((alternative: any, altIndex: number) => (
                                    <div
                                      key={alternative.id}
                                      style={{
                                        border: '1px dashed #d1d5db',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        backgroundColor: alternative.isCorrect ? '#ecfdf5' : '#f9fafb',
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          marginBottom: '8px',
                                        }}
                                      >
                                        <span style={{ fontWeight: 600 }}>
                                          {String.fromCharCode(65 + altIndex)}.
                                        </span>
                                        {alternative.isCorrect && (
                                          <span
                                            style={{
                                              backgroundColor: '#d1fae5',
                                              color: '#047857',
                                              padding: '2px 8px',
                                              fontSize: '12px',
                                              borderRadius: '999px',
                                              fontWeight: 600,
                                            }}
                                          >
                                            Correcta
                                          </span>
                                        )}
                                      </div>
                                      <textarea
                                        value={alternative.text}
                                        onChange={(e) =>
                                          setEditData({
                                            ...editData,
                                            variations: editData.variations.map((v: any, idx: number) => {
                                              if (idx !== index) return v;
                                              return {
                                                ...v,
                                                alternatives: v.alternatives.map((alt: any, altIdx: number) =>
                                                  altIdx === altIndex ? { ...alt, text: e.target.value } : alt,
                                                ),
                                              };
                                            }),
                                          })
                                        }
                                        style={{
                                          width: '100%',
                                          minHeight: '70px',
                                          padding: '8px',
                                          borderRadius: '8px',
                                          border: '1px solid #d1d5db',
                                          resize: 'vertical',
                                          fontFamily: 'inherit',
                                        }}
                                      />
                                      <textarea
                                        value={alternative.explanation ?? ''}
                                        placeholder="Explicación (opcional)"
                                        onChange={(e) =>
                                          setEditData({
                                            ...editData,
                                            variations: editData.variations.map((v: any, idx: number) => {
                                              if (idx !== index) return v;
                                              return {
                                                ...v,
                                                alternatives: v.alternatives.map((alt: any, altIdx: number) =>
                                                  altIdx === altIndex ? { ...alt, explanation: e.target.value } : alt,
                                                ),
                                              };
                                            }),
                                          })
                                        }
                                        style={{
                                          width: '100%',
                                          minHeight: '60px',
                                          padding: '8px',
                                          borderRadius: '8px',
                                          border: '1px solid #d1d5db',
                                          marginTop: '6px',
                                          resize: 'vertical',
                                          fontFamily: 'inherit',
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: '20px 24px',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  backgroundColor: '#f9fafb',
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                }}
              >
                <button
                  onClick={handleCloseModal}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    color: '#374151',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#2563eb',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default ExerciseManagement;
