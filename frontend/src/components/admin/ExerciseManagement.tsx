import React, { useState, useEffect } from 'react';
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
  qaReviews: string;
  dateFrom: string;
  dateTo: string;
}

interface ExerciseManagementProps {
  onBack?: () => void;
}

const ExerciseManagement: React.FC<ExerciseManagementProps> = ({ onBack }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExercises, setTotalExercises] = useState(0);
  const itemsPerPage = 100;

  // Filters
  const [filters, setFilters] = useState<Filters>({
    specialty: '',
    topic: '',
    status: '',
    qaReviews: '',
    dateFrom: '',
    dateTo: ''
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    specialties: [],
    topics: [],
    statuses: [],
    qaReviewRanges: []
  });

  // Load exercises
  const loadExercises = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(filters.specialty && { specialty: filters.specialty }),
        ...(filters.topic && { topic: filters.topic }),
        ...(filters.status && { status: filters.status }),
        ...(filters.qaReviews && { qaReviews: filters.qaReviews }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com'}/api/exercise-management/list?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar ejercicios');
      }

      const result = await response.json();
      setExercises(result.data.exercises);
      setTotalPages(result.data.pagination.pages);
      setTotalExercises(result.data.pagination.total);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load filter options
  const loadFilterOptions = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com'}/api/exercise-management/filters`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar opciones de filtro');
      }

      const result = await response.json();
      setFilterOptions(result.data);
      
    } catch (err: any) {
      console.error('Error loading filter options:', err);
    }
  };

  useEffect(() => {
    loadExercises();
  }, [currentPage, filters]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      specialty: '',
      topic: '',
      status: '',
      qaReviews: '',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'COMPLETED': {
        colors: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
        icon: '✅',
        label: 'Completado'
      },
      'REVIEW_REQUIRED': {
        colors: 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
        icon: '⚠️',
        label: 'Requiere Revisión'
      },
      'APPROVED': {
        colors: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white',
        icon: '🎯',
        label: 'Aprobado'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      colors: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white',
      icon: '❓',
      label: status
    };

    return (
      <span className={`inline-flex items-center px-3 py-2 rounded-xl text-sm font-bold shadow-lg ${config.colors}`}>
        <span className="mr-2">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getQABadge = (count: number) => {
    if (count === 0) {
      return (
        <span className="inline-flex items-center px-3 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg">
          <span className="mr-2">🚫</span>
          Sin revisar
        </span>
      );
    } else if (count <= 2) {
      return (
        <span className="inline-flex items-center px-3 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg">
          <span className="mr-2">🔄</span>
          {count} revisiones
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
          <span className="mr-2">✅</span>
          {count} revisiones
        </span>
      );
    }
  };

  const availableTopics = filterOptions.topics.filter(t => 
    !filters.specialty || t.specialty === filters.specialty
  );

  if (loading && exercises.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                  <span className="font-medium">Volver</span>
                </button>
              )}
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  📋 Gestión de Ejercicios
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  <p className="text-lg text-gray-600">
                    Total: <span className="font-bold text-blue-600">{totalExercises}</span> ejercicios
                  </p>
                  <div className="h-6 w-px bg-gray-300"></div>
                  <p className="text-sm text-gray-500">
                    Mostrando {itemsPerPage} por página
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-3 px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                showFilters 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              <FunnelIcon className="h-5 w-5" />
              <span className="font-medium">{showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                <FunnelIcon className="h-6 w-6 mr-3 text-blue-600" />
                Filtros Avanzados
              </h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              {/* Specialty Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 flex items-center">
                  🏥 Especialidad
                </label>
                <select
                  value={filters.specialty}
                  onChange={(e) => handleFilterChange('specialty', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                >
                  <option value="">🔍 Todas las especialidades</option>
                  {filterOptions.specialties.map(specialty => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </div>

              {/* Topic Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 flex items-center">
                  📚 Tema
                </label>
                <select
                  value={filters.topic}
                  onChange={(e) => handleFilterChange('topic', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md disabled:bg-gray-50 disabled:cursor-not-allowed"
                  disabled={!filters.specialty}
                >
                  <option value="">📖 Todos los temas</option>
                  {availableTopics.map(item => (
                    <option key={`${item.specialty}-${item.topic}`} value={item.topic}>
                      {item.topic}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 flex items-center">
                  📊 Estado
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                >
                  <option value="">📋 Todos los estados</option>
                  {filterOptions.statuses.map(status => (
                    <option key={status} value={status}>
                      {status === 'COMPLETED' ? '✅ Completado' : 
                       status === 'REVIEW_REQUIRED' ? '⚠️ Requiere Revisión' : 
                       status === 'APPROVED' ? '✅ Aprobado' : status}
                    </option>
                  ))}
                </select>
              </div>

              {/* QA Reviews Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 flex items-center">
                  🔍 QA Reviews
                </label>
                <select
                  value={filters.qaReviews}
                  onChange={(e) => handleFilterChange('qaReviews', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                >
                  <option value="">🔄 Todas las revisiones</option>
                  {filterOptions.qaReviewRanges.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 flex items-center">
                  📅 Desde
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 flex items-center">
                  📅 Hasta
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                />
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
              >
                🗑️ Limpiar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XMarkIcon className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-red-800">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Exercises Table */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gradient-to-r from-blue-600 to-purple-600">
                <tr>
                  <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">
                    🔢 ID
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">
                    🏥 Especialidad
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">
                    📚 Tema
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">
                    📅 Fecha Creación
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">
                    📊 Estado
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">
                    🔍 QA Reviews
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-white uppercase tracking-wider">
                    ⚡ Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {exercises.map((exercise, index) => (
                  <tr 
                    key={exercise.id} 
                    className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 ${
                      index % 2 === 0 ? 'bg-gray-50/30' : 'bg-white'
                    }`}
                  >
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="text-sm font-bold text-white">#{exercise.sequence_number}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {exercise.specialty || 'N/A'}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="text-sm text-gray-700 font-medium">
                        {exercise.topic || 'N/A'}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {formatDate(exercise.created_at)}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      {getStatusBadge(exercise.status)}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      {getQABadge(exercise.qa_review_count)}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedExercise(exercise.id)}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        <span className="font-medium">Editar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                  >
                    <ChevronLeftIcon className="h-5 w-5 mr-2" />
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                  >
                    Siguiente
                    <ChevronRightIcon className="h-5 w-5 ml-2" />
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div className="bg-white px-6 py-3 rounded-xl shadow-lg border border-gray-200">
                    <p className="text-sm text-gray-700 font-medium">
                      📊 Mostrando{' '}
                      <span className="font-bold text-blue-600">{(currentPage - 1) * itemsPerPage + 1}</span>
                      {' '}a{' '}
                      <span className="font-bold text-blue-600">
                        {Math.min(currentPage * itemsPerPage, totalExercises)}
                      </span>
                      {' '}de{' '}
                      <span className="font-bold text-purple-600">{totalExercises}</span>
                      {' '}ejercicios
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-2xl shadow-xl" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-3 rounded-l-2xl bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i));
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-6 py-3 text-sm font-bold transition-all duration-200 ${
                              currentPage === pageNum
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-4 py-3 rounded-r-2xl bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Exercise Editor Modal */}
        {selectedExercise && (
          <ExerciseEditor
            exerciseId={selectedExercise}
            onClose={() => setSelectedExercise(null)}
            onSave={() => {
              setSelectedExercise(null);
              loadExercises(); // Refresh the list
            }}
          />
        )}
      </div>
    </div>
  );
};

// Placeholder for Exercise Editor component
const ExerciseEditor: React.FC<{
  exerciseId: string;
  onClose: () => void;
  onSave: () => void;
}> = ({ exerciseId, onClose, onSave }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Editar Ejercicio #{exerciseId}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="text-center py-12">
          <p className="text-gray-600">Editor de ejercicios en desarrollo...</p>
          <p className="text-sm text-gray-500 mt-2">
            Próximamente podrás editar la pregunta, alternativas y explicaciones.
          </p>
          <div className="mt-6 space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Guardar (Demo)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseManagement;
// Force redeploy Thu Oct  2 09:55:33 -03 2025
// Force Vercel redeploy - Thu Oct  2 20:58:24 -03 2025
