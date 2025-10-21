import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';

interface ReviewItem {
  id: string;
  variationId: string;
  baseId: string;
  riskLevel: string;
  labels: string[];
  critique: string;
  patch: any;
  patchConfidence: number;
  fixStatus: string;
  variation: {
    baseId: string;
    variationId: string;
    sequenceNumber: number | null;
    variationNumber: number;
    baseContent: string;
    stem: string;
    difficulty: string | null;
    explanation: string | null;
    options: Array<{ 
      id: string; 
      text: string; 
      isCorrect: boolean; 
      order: number; 
      explanation: string | null 
    }>;
  } | null;
}

type FilterType = 'all' | 'high' | 'medium' | 'low';

export const QAReviewQueue: React.FC = () => {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Token de autenticación no disponible');
      }
      
      const priorityParam = filter !== 'all' ? `?priority=${filter}` : '';
      
      const response = await fetch(`${API_BASE_URL}/api/qa-sweep/review-queue${priorityParam}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      setItems(data.items || []);
    } catch (error: any) {
      console.error('Error fetching review queue:', error);
      setErrorMessage(error.message || 'Error al cargar la cola de revisión');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [filter]);

  const handleApprove = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/qa-sweep/review-queue/${id}/approve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al aprobar el fix');
      }

      await fetchQueue();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleReject = async (id: string, notes: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/qa-sweep/review-queue/${id}/reject`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      });

      if (!response.ok) {
        throw new Error('Error al rechazar el fix');
      }

      await fetchQueue();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // Count by priority
  const highCount = items.filter(i => i.riskLevel === 'HIGH').length;
  const mediumCount = items.filter(i => i.riskLevel === 'MEDIUM').length;
  const lowCount = items.filter(i => i.riskLevel === 'LOW').length;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ color: '#343a40', marginBottom: '20px' }}>🔍 Cola de Revisión QA</h2>
        
        {/* Stats Bar */}
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#fff', 
            borderRadius: '8px', 
            border: '2px solid #dc3545',
            flex: '1',
            minWidth: '150px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc3545' }}>🔴 {highCount}</div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>Críticos/Altos</div>
          </div>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#fff', 
            borderRadius: '8px', 
            border: '2px solid #ffc107',
            flex: '1',
            minWidth: '150px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffc107' }}>🟡 {mediumCount}</div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>Medios</div>
          </div>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#fff', 
            borderRadius: '8px', 
            border: '2px solid #28a745',
            flex: '1',
            minWidth: '150px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>🟢 {lowCount}</div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>Bajos</div>
          </div>
        </div>

        {/* Filter */}
        <div style={{ 
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <label style={{ fontWeight: 'bold', color: '#343a40' }}>Filtrar por prioridad:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as FilterType)}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              fontSize: '14px'
            }}
          >
            <option value="all">Todos ({items.length})</option>
            <option value="high">Alto/Crítico ({highCount})</option>
            <option value="medium">Medio ({mediumCount})</option>
            <option value="low">Bajo ({lowCount})</option>
          </select>
          <button
            onClick={fetchQueue}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            {loading ? '🔄 Cargando...' : '🔁 Actualizar'}
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div style={{
            padding: '15px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            color: '#721c24',
            marginBottom: '20px'
          }}>
            ❌ {errorMessage}
          </div>
        )}

        {/* Items List */}
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            backgroundColor: '#fff',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '18px', color: '#6c757d' }}>Cargando cola de revisión...</div>
          </div>
        ) : items.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            backgroundColor: '#fff',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
            <div style={{ fontSize: '18px', color: '#6c757d' }}>No hay items pendientes de revisión</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {items.map(item => (
              <ReviewCard 
                key={item.id} 
                item={item} 
                onApprove={() => handleApprove(item.id)}
                onReject={(notes) => handleReject(item.id, notes)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface ReviewCardProps {
  item: ReviewItem;
  onApprove: () => void;
  onReject: (notes: string) => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ item, onApprove, onReject }) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [expanded, setExpanded] = useState(false);

  const riskColor = item.riskLevel === 'HIGH' ? '#dc3545' : 
                    item.riskLevel === 'MEDIUM' ? '#ffc107' : '#28a745';
  
  const riskBg = item.riskLevel === 'HIGH' ? '#f8d7da' : 
                 item.riskLevel === 'MEDIUM' ? '#fff3cd' : '#d4edda';

  const riskIcon = item.riskLevel === 'HIGH' ? '🔴' : 
                   item.riskLevel === 'MEDIUM' ? '🟡' : '🟢';

  const confidence = item.patchConfidence ? (Number(item.patchConfidence) * 100).toFixed(0) : '0';

  return (
    <div style={{ 
      border: `2px solid ${riskColor}`, 
      borderRadius: '8px', 
      padding: '20px',
      backgroundColor: '#fff'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '15px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ 
              backgroundColor: riskColor, 
              color: 'white', 
              padding: '6px 12px', 
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {riskIcon} {item.riskLevel}
            </span>
            <span style={{ 
              marginLeft: '10px',
              padding: '6px 12px',
              backgroundColor: '#e9ecef',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#495057'
            }}>
              Confianza: {confidence}%
            </span>
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>
            <strong>Ejercicio:</strong> {item.variation?.sequenceNumber ?? '—'} · 
            <strong> Variación:</strong> {item.variation?.variationNumber ?? '—'}
          </div>
        </div>
      </div>

      {/* Problems */}
      {item.labels?.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#343a40' }}>Problemas detectados:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {item.labels.map((label, i) => (
              <span 
                key={i} 
                style={{ 
                  padding: '4px 8px', 
                  backgroundColor: riskBg, 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  color: riskColor,
                  border: `1px solid ${riskColor}`
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Critique */}
      {item.critique && (
        <div style={{ 
          marginBottom: '15px', 
          padding: '12px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '6px' 
        }}>
          <strong style={{ color: '#343a40' }}>Notas de evaluación:</strong>
          <div style={{ marginTop: '6px', fontSize: '14px', color: '#495057' }}>
            {item.critique}
          </div>
        </div>
      )}

      {/* Patches */}
      {item.patch && Array.isArray(item.patch) && item.patch.length > 0 && (
        <div style={{ 
          marginTop: '15px', 
          padding: '15px', 
          backgroundColor: '#e7f3ff', 
          borderRadius: '6px',
          border: '1px solid #b3d9ff'
        }}>
          <strong style={{ color: '#004085' }}>💡 Correcciones propuestas por IA:</strong>
          {item.patch.map((p: any, i: number) => (
            <div key={i} style={{ 
              marginTop: '12px', 
              padding: '12px',
              backgroundColor: '#fff',
              borderLeft: '3px solid #007bff',
              borderRadius: '4px'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#007bff' }}>Campo:</strong> {p.field}
                {p.confidence && (
                  <span style={{ 
                    marginLeft: '10px',
                    fontSize: '12px',
                    color: '#6c757d'
                  }}>
                    (Confianza: {(p.confidence * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#dc3545' }}>❌ Antes:</strong>
                <div style={{ 
                  marginTop: '4px',
                  padding: '8px',
                  backgroundColor: '#fff5f5',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#721c24',
                  fontFamily: 'monospace'
                }}>
                  {String(p.originalValue)}
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#28a745' }}>✅ Después:</strong>
                <div style={{ 
                  marginTop: '4px',
                  padding: '8px',
                  backgroundColor: '#f0fff4',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: '#155724',
                  fontFamily: 'monospace'
                }}>
                  {String(p.proposedValue)}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d', fontStyle: 'italic' }}>
                <strong>Razón:</strong> {p.reason}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question Details (Expandable) */}
      {item.variation && (
        <div style={{ marginTop: '15px' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {expanded ? '▲ Ocultar Ejercicio' : '▼ Ver Ejercicio Completo'}
          </button>

          {expanded && (
            <div style={{ 
              marginTop: '12px', 
              padding: '15px', 
              backgroundColor: '#ffffff', 
              borderRadius: '6px', 
              border: '1px solid #dee2e6' 
            }}>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#343a40' }}>Enunciado:</strong>
                <div style={{ marginTop: '6px', lineHeight: 1.6 }}>{item.variation.stem}</div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#343a40' }}>Alternativas:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '0', listStyle: 'none' }}>
                  {item.variation.options.map((option, index) => {
                    const letter = String.fromCharCode(65 + index);
                    return (
                      <li key={option.id} style={{ 
                        marginBottom: '8px',
                        padding: '8px',
                        backgroundColor: option.isCorrect ? '#d4edda' : '#f8f9fa',
                        borderRadius: '4px',
                        border: option.isCorrect ? '2px solid #28a745' : '1px solid #dee2e6'
                      }}>
                        <div style={{ fontWeight: option.isCorrect ? 'bold' : 'normal' }}>
                          {letter}. {option.text} {option.isCorrect ? '✅' : ''}
                        </div>
                        {option.explanation && (
                          <div style={{ 
                            fontSize: '12px', 
                            marginTop: '4px', 
                            color: '#6c757d',
                            paddingLeft: '20px'
                          }}>
                            💬 {option.explanation}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {item.variation.explanation && (
                <div>
                  <strong style={{ color: '#343a40' }}>Explicación global:</strong>
                  <div style={{ marginTop: '6px', fontSize: '14px', color: '#495057' }}>
                    {item.variation.explanation}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={onApprove}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          ✅ Aprobar y Aplicar Fix
        </button>
        <button 
          onClick={() => setShowRejectForm(!showRejectForm)}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          ❌ Rechazar
        </button>
      </div>

      {/* Reject Form */}
      {showRejectForm && (
        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#343a40' }}>
            Razón del rechazo:
          </label>
          <textarea 
            placeholder="Explica por qué rechazas este fix..."
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '4px', 
              border: '1px solid #ced4da',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              onClick={() => {
                if (rejectNotes.trim()) {
                  onReject(rejectNotes);
                  setShowRejectForm(false);
                  setRejectNotes('');
                } else {
                  alert('Por favor ingresa una razón para el rechazo');
                }
              }}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Confirmar Rechazo
            </button>
            <button 
              onClick={() => {
                setShowRejectForm(false);
                setRejectNotes('');
              }}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#6c757d', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QAReviewQueue;

