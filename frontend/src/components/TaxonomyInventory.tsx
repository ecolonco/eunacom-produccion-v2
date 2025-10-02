import React, { useState, useEffect } from 'react';

interface Topic {
  id: string;
  name: string;
  description?: string;
  regularQuestions: number;
  factoryExercises: number;
  totalQuestions: number;
}

interface Specialty {
  id: string;
  name: string;
  description?: string;
  code?: string;
  isActive: boolean;
  topics: Topic[];
  summary: {
    totalTopics: number;
    regularQuestions: number;
    factoryExercises: number;
    totalQuestions: number;
  };
}

interface GlobalSummary {
  totalSpecialties: number;
  totalTopics: number;
  totalRegularQuestions: number;
  totalFactoryExercises: number;
  grandTotal: number;
}

interface TaxonomyInventoryData {
  inventory: Specialty[];
  summary: GlobalSummary;
}

interface TaxonomyInventoryProps {
  onBack: () => void;
}

const TaxonomyInventory: React.FC<TaxonomyInventoryProps> = ({ onBack }) => {
  const [data, setData] = useState<TaxonomyInventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSpecialties, setExpandedSpecialties] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTaxonomyInventory();
  }, []);

  const loadTaxonomyInventory = async () => {
    try {
      setLoading(true);
      setError('');

      // Buscar token con los nombres correctos que usa la aplicación
      const accessToken = localStorage.getItem('accessToken');
      const legacyToken = localStorage.getItem('token');
      const token = accessToken || legacyToken;
      
      console.log('🔍 DEBUG - accessToken encontrado:', accessToken ? 'SÍ' : 'NO');
      console.log('🔍 DEBUG - token legacy encontrado:', legacyToken ? 'SÍ' : 'NO');
      console.log('🔍 DEBUG - Token final usado:', token ? 'SÍ' : 'NO');
      console.log('🔍 DEBUG - LocalStorage keys:', Object.keys(localStorage));
      console.log('🔍 DEBUG - LocalStorage completo:', localStorage);
      
      if (!token) {
        console.log('❌ No hay token, mostrando error en lugar de redirect');
        setError('No se encontró token de autenticación. Por favor, refresca la página e inicia sesión nuevamente.');
        setLoading(false);
        return;
      }

      const baseURL = window.location.origin.includes('localhost') 
        ? 'http://localhost:3001' 
        : 'https://eunacom-backend-v3.onrender.com';

      // Usar el nuevo endpoint de inventario que cuenta ejercicios reales
      const url = `${baseURL}/api/taxonomy-inventory/full`;
      console.log('🔍 DEBUG - URL de la petición:', url);
      console.log('🔍 DEBUG - Token usado:', token.substring(0, 20) + '...');
      console.log('🔍 DEBUG - Token completo length:', token.length);

      const requestHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      console.log('🔍 DEBUG - Headers de request:', requestHeaders);

      const response = await fetch(url, {
        headers: requestHeaders
      });

      console.log('🔍 DEBUG - Status de respuesta:', response.status);
      console.log('🔍 DEBUG - Response OK:', response.ok);
      console.log('🔍 DEBUG - Headers de respuesta:', [...response.headers.entries()]);
      
      // Leer el texto de respuesta para debugging
      const responseText = await response.text();
      console.log('🔍 DEBUG - Response text completo:', responseText);

      if (response.status === 401) {
        console.log('❌ DEBUG - Error 401, token inválido o expirado');
        setError('Tu sesión ha expirado. Por favor, cierra sesión e inicia sesión nuevamente.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${responseText || response.statusText}`);
      }

      const result = JSON.parse(responseText);
      
      if (result.success) {
        // Los datos ya vienen con contadores reales del nuevo endpoint
        console.log('🔍 DEBUG - Datos de inventario recibidos:', result.data);
        console.log('🔍 DEBUG - Especialidades:', result.data.inventory.length);
        console.log('🔍 DEBUG - Resumen global:', result.data.summary);
        
        setData(result.data);
        console.log('✅ Inventario con contadores reales cargado exitosamente');
        
        // Expand all specialties by default
        const allSpecialtyIds = new Set(result.data.inventory.map((spec: any) => spec.id));
        setExpandedSpecialties(allSpecialtyIds);
        
      } else {
        setError(result.message || 'Error al cargar el inventario de taxonomía');
      }

    } catch (err) {
      console.error('🚨 Error completo:', err);
      console.error('🚨 Error stack:', err instanceof Error ? err.stack : 'No stack');
      console.error('🚨 Error message:', err instanceof Error ? err.message : err);
      setError(`Error al cargar el inventario de taxonomía: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialty = (specialtyId: string) => {
    const newExpanded = new Set(expandedSpecialties);
    if (newExpanded.has(specialtyId)) {
      newExpanded.delete(specialtyId);
    } else {
      newExpanded.add(specialtyId);
    }
    setExpandedSpecialties(newExpanded);
  };

  const getQuestionCountBadge = (count: number, type: 'regular' | 'factory' | 'total') => {
    const colors = {
      regular: count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600',
      factory: count > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600',
      total: count > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type]}`}>
        {count}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
          <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Cargando Inventario de Taxonomía...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '15px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', color: '#ef4444' }}>❌</div>
          <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Error</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>{error}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {error.includes('sesión ha expirado') ? (
              <>
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  🔓 Cerrar Sesión e Iniciar de Nuevo
                </button>
              </>
            ) : (
              <button
                onClick={() => loadTaxonomyInventory()}
                style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                🔄 Reintentar
              </button>
            )}
            <button
              onClick={onBack}
              style={{
                backgroundColor: '#6366f1',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              ← Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h1 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '28px' }}>
                📊 Inventario de Taxonomía EUNACOM
              </h1>
              <p style={{ color: '#666', margin: 0 }}>
                Vista completa de especialidades, temas y ejercicios disponibles
              </p>
            </div>
            <button
              onClick={onBack}
              style={{
                backgroundColor: '#6366f1',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              ← Volver al Dashboard
            </button>
          </div>

          {/* Global Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            backgroundColor: '#f8fafc',
            padding: '20px',
            borderRadius: '10px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                {data.summary.totalSpecialties}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Especialidades</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
                {data.summary.totalTopics}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Temas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#06b6d4' }}>
                {data.summary.totalRegularQuestions}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Preguntas Regulares</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                {data.summary.totalFactoryExercises}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Ejercicios de Fábrica</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {data.summary.grandTotal}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>Total General</div>
            </div>
          </div>
        </div>

        {/* Specialties List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {data.inventory.map((specialty) => (
            <div
              key={specialty.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '15px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                overflow: 'hidden'
              }}
            >
              {/* Specialty Header */}
              <div
                onClick={() => toggleSpecialty(specialty.id)}
                style={{
                  padding: '20px',
                  backgroundColor: specialty.isActive ? '#f0f9ff' : '#f1f5f9',
                  borderBottom: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px', fontWeight: 'bold' }}>
                      {specialty.isActive ? '🩺' : '⚠️'} {specialty.name}
                    </h3>
                    {specialty.code && (
                      <span style={{
                        backgroundColor: '#e2e8f0',
                        color: '#475569',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontFamily: 'monospace'
                      }}>
                        {specialty.code}
                      </span>
                    )}
                    {!specialty.isActive && (
                      <span style={{
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        INACTIVA
                      </span>
                    )}
                  </div>
                  {specialty.description && (
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                      {specialty.description}
                    </p>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <span style={{ color: '#64748b' }}>{specialty.summary.totalTopics} temas</span>
                    {getQuestionCountBadge(specialty.summary.regularQuestions, 'regular')}
                    {getQuestionCountBadge(specialty.summary.factoryExercises, 'factory')}
                    {getQuestionCountBadge(specialty.summary.totalQuestions, 'total')}
                  </div>
                  <div style={{ fontSize: '20px', color: '#64748b' }}>
                    {expandedSpecialties.has(specialty.id) ? '▲' : '▼'}
                  </div>
                </div>
              </div>

              {/* Topics List */}
              {expandedSpecialties.has(specialty.id) && (
                <div style={{ padding: '0' }}>
                  {specialty.topics.length === 0 ? (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#64748b'
                    }}>
                      <div style={{ fontSize: '36px', marginBottom: '10px' }}>📚</div>
                      <p>No hay temas definidos para esta especialidad</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {specialty.topics.map((topic, index) => (
                        <div
                          key={topic.id}
                          style={{
                            padding: '15px 30px',
                            borderBottom: index < specialty.topics.length - 1 ? '1px solid #f1f5f9' : 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 5px 0', color: '#334155', fontSize: '16px' }}>
                              📖 {topic.name}
                            </h4>
                            {topic.description && (
                              <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                                {topic.description}
                              </p>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>Regular</span>
                              {getQuestionCountBadge(topic.regularQuestions, 'regular')}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>Fábrica</span>
                              {getQuestionCountBadge(topic.factoryExercises, 'factory')}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>Total</span>
                              {getQuestionCountBadge(topic.totalQuestions, 'total')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaxonomyInventory;
