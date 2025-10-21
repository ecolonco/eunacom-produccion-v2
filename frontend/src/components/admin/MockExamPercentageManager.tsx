/**
 * MockExamPercentageManager
 *
 * Componente de administración para editar los porcentajes de distribución
 * de topics en los ensayos EUNACOM (180 preguntas).
 *
 * Funcionalidades:
 * - Listar todos los topics con su porcentaje actual
 * - Editar porcentajes inline
 * - Validación en tiempo real: suma debe ser ≈ 100%
 * - Guardar cambios individuales o masivos
 * - Filtrado por especialidad
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Topic {
  id: string;
  name: string;
  description: string | null;
  specialtyId: string | null;
  specialtyName: string | null;
  mockExamPercentage: number | null;
  questionCount: number; // Cantidad de preguntas disponibles
}

interface MockExamPercentageManagerProps {
  onBack?: () => void;
}

const MockExamPercentageManager: React.FC<MockExamPercentageManagerProps> = ({ onBack }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [error, setError] = useState<string>('');

  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';

  // Calcular suma total de porcentajes
  const totalPercentage = useMemo(() => {
    return topics.reduce((sum, topic) => {
      return sum + (topic.mockExamPercentage || 0);
    }, 0);
  }, [topics]);

  // Validación de suma total
  const isValidTotal = useMemo(() => {
    return Math.abs(totalPercentage - 100) < 0.5;
  }, [totalPercentage]);

  // Obtener especialidades únicas para filtrado
  const specialties = useMemo(() => {
    const uniqueSpecialties = new Set<string>();
    topics.forEach((topic) => {
      if (topic.specialtyName) {
        uniqueSpecialties.add(topic.specialtyName);
      }
    });
    return Array.from(uniqueSpecialties).sort();
  }, [topics]);

  // Filtrar topics por especialidad
  const filteredTopics = useMemo(() => {
    if (!selectedSpecialty) return topics;
    return topics.filter((topic) => topic.specialtyName === selectedSpecialty);
  }, [topics, selectedSpecialty]);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      setError('');
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      const response = await fetch(`${API_BASE}/api/admin/topics/mock-exam-percentages`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTopics(data.topics || []);
    } catch (error: any) {
      console.error('Error fetching topics:', error);
      setError(error.message || 'Error al cargar los topics');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (topic: Topic) => {
    setEditingId(topic.id);
    setEditValue(topic.mockExamPercentage?.toString() || '0');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const savePercentage = async (topicId: string) => {
    try {
      setSaving(true);
      const percentage = parseFloat(editValue);

      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        alert('El porcentaje debe ser un número entre 0 y 100');
        return;
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      const response = await fetch(`${API_BASE}/api/admin/topics/${topicId}/mock-exam-percentage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mockExamPercentage: percentage }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el porcentaje');
      }

      // Actualizar el topic en el estado local
      setTopics((prevTopics) =>
        prevTopics.map((topic) =>
          topic.id === topicId ? { ...topic, mockExamPercentage: percentage } : topic
        )
      );

      setEditingId(null);
      setEditValue('');
    } catch (error: any) {
      console.error('Error saving percentage:', error);
      alert(error.message || 'Error al guardar el porcentaje');
    } finally {
      setSaving(false);
    }
  };

  const calculateExpectedQuestions = (percentage: number | null) => {
    if (!percentage) return 0;
    return Math.round((percentage / 100) * 180);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando topics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span role="img" aria-label="Porcentajes">
                  📊
                </span>
                Distribución de Ensayos EUNACOM
              </h1>
              <p className="text-gray-600 mt-2">
                Gestiona los porcentajes de distribución de topics para ensayos de 180 preguntas
              </p>
            </div>

            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <ChevronLeftIcon className="h-5 w-5" />
                Volver
              </button>
            )}
          </div>

          {/* Validation Alert */}
          <div className="mt-6">
            {isValidTotal ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Distribución válida: {totalPercentage.toFixed(2)}%
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    La suma de porcentajes está dentro del rango esperado (100%)
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">
                    Advertencia: Suma total = {totalPercentage.toFixed(2)}%
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    La suma debe ser aproximadamente 100%. Diferencia: {(totalPercentage - 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Filter by Specialty */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por especialidad
            </label>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas las especialidades</option>
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800 font-semibold">{error}</p>
          </div>
        )}

        {/* Topics Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Topic
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Especialidad
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Porcentaje
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Preguntas esperadas
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Preguntas disponibles
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTopics.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                      No hay topics disponibles
                    </td>
                  </tr>
                ) : (
                  filteredTopics.map((topic) => (
                    <tr key={topic.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{topic.name}</p>
                          {topic.description && (
                            <p className="text-xs text-gray-500 mt-1">{topic.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {topic.specialtyName || 'Sin especialidad'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {editingId === topic.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              autoFocus
                            />
                            <span className="text-sm text-gray-600">%</span>
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-gray-900">
                            {topic.mockExamPercentage?.toFixed(2) || '0.00'}%
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-700">
                          {calculateExpectedQuestions(
                            editingId === topic.id ? parseFloat(editValue) || 0 : topic.mockExamPercentage
                          )}{' '}
                          / 180
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-sm font-medium ${
                            topic.questionCount >=
                            calculateExpectedQuestions(topic.mockExamPercentage)
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {topic.questionCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {editingId === topic.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => savePercentage(topic.id)}
                              disabled={saving}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
                            >
                              <CheckIcon className="h-4 w-4" />
                              Guardar
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={saving}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 transition-colors"
                            >
                              <XMarkIcon className="h-4 w-4" />
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(topic)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <PencilIcon className="h-4 w-4" />
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">ℹ️ Información importante</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                Los porcentajes solo afectan a los <strong>ensayos EUNACOM</strong> (180 preguntas). No
                afectan controles ni pruebas.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                La suma de todos los porcentajes debe ser aproximadamente <strong>100%</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                Las <strong>preguntas esperadas</strong> se calculan automáticamente: (porcentaje / 100) *
                180.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                Si un topic no tiene suficientes preguntas disponibles, aparecerá en{' '}
                <span className="text-red-600 font-semibold">rojo</span>.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MockExamPercentageManager;
