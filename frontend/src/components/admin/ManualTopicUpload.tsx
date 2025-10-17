import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Specialty {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  specialtyId: string;
}

interface Job {
  id: string;
  status: string;
  totalItems: number;
  processedItems: number;
  fileName: string;
  progress: number;
  taxonomy?: {
    specialty: string;
    topic: string;
  };
}

interface ManualTopicUploadProps {
  onBack: () => void;
}

const ManualTopicUpload: React.FC<ManualTopicUploadProps> = ({ onBack }) => {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load specialties on mount
  useEffect(() => {
    loadSpecialties();
    loadJobs();
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load topics when specialty changes
  useEffect(() => {
    if (selectedSpecialtyId) {
      loadTopics(selectedSpecialtyId);
      setSelectedTopicId(''); // Reset topic selection
    } else {
      setTopics([]);
      setSelectedTopicId('');
    }
  }, [selectedSpecialtyId]);

  const loadSpecialties = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/taxonomy-admin/specialties`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSpecialties(data.data || []);
      }
    } catch (err) {
      console.error('Error loading specialties:', err);
      setError('Error al cargar especialidades');
    }
  };

  const loadTopics = async (specialtyId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/taxonomy-admin/specialties/${specialtyId}/topics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTopics(data.data || []);
      }
    } catch (err) {
      console.error('Error loading topics:', err);
      setError('Error al cargar temas');
    }
  };

  const loadJobs = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/exercise-factory/jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter only manual upload jobs
        const manualJobs = data.jobs.filter((job: any) => job.type === 'CSV_UPLOAD_MANUAL');
        setJobs(manualJobs);
      }
    } catch (err) {
      console.error('Error loading jobs:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Por favor selecciona un archivo CSV válido');
      return;
    }

    if (!selectedSpecialtyId || !selectedTopicId) {
      setError('Por favor selecciona especialidad y tópico antes de subir el archivo');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);
      formData.append('specialtyId', selectedSpecialtyId);
      formData.append('topicId', selectedTopicId);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/exercise-factory/upload-csv-manual`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cargar archivo');
      }

      const result = await response.json();
      setUploadResult(result.data);

      // Refresh jobs list
      await loadJobs();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const getSelectedSpecialtyName = () => {
    const specialty = specialties.find(s => s.id === selectedSpecialtyId);
    return specialty?.name || '';
  };

  const getSelectedTopicName = () => {
    const topic = topics.find(t => t.id === selectedTopicId);
    return topic?.name || '';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#28a745';
      case 'RUNNING': return '#007bff';
      case 'FAILED': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Completado';
      case 'RUNNING': return 'En proceso';
      case 'FAILED': return 'Error';
      default: return status;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
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
          marginBottom: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              color: '#1976d2',
              fontSize: '32px',
              fontWeight: 'bold'
            }}>
              🎯 Carga Manual por Tópico
            </h1>
            <p style={{
              margin: '10px 0 0 0',
              color: '#666',
              fontSize: '18px'
            }}>
              Define la clasificación manualmente y genera variaciones automáticamente
            </p>
          </div>
          <button
            onClick={onBack}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ← Volver
          </button>
        </div>

        {/* Upload Form */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '15px',
          marginBottom: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            margin: '0 0 25px 0',
            color: '#333',
            fontSize: '24px'
          }}>
            📋 Clasificación Manual + CSV
          </h2>

          {/* Step 1: Select Specialty */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              1️⃣ Selecciona Especialidad
            </label>
            <select
              value={selectedSpecialtyId}
              onChange={(e) => setSelectedSpecialtyId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Seleccionar Especialidad --</option>
              {specialties.map(specialty => (
                <option key={specialty.id} value={specialty.id}>
                  {specialty.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Topic */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              2️⃣ Selecciona Tópico
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              disabled={!selectedSpecialtyId || topics.length === 0}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: selectedSpecialtyId && topics.length > 0 ? 'white' : '#f8f9fa',
                cursor: selectedSpecialtyId && topics.length > 0 ? 'pointer' : 'not-allowed',
                color: selectedSpecialtyId && topics.length > 0 ? '#000' : '#999'
              }}
            >
              <option value="">
                {!selectedSpecialtyId ? '-- Primero selecciona una especialidad --' :
                 topics.length === 0 ? '-- Cargando tópicos... --' :
                 '-- Seleccionar Tópico --'}
              </option>
              {topics.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Upload CSV */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              3️⃣ Sube Archivo CSV con Preguntas Base
            </label>

            <div style={{
              border: '2px dashed #dee2e6',
              borderRadius: '10px',
              padding: '30px',
              textAlign: 'center',
              backgroundColor: selectedSpecialtyId && selectedTopicId ? '#f8f9fa' : '#e9ecef'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <span style={{ fontSize: '48px' }}>📁</span>
              </div>

              {selectedSpecialtyId && selectedTopicId ? (
                <div style={{
                  backgroundColor: '#d4edda',
                  border: '1px solid #c3e6cb',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 5px 0', color: '#155724', fontSize: '14px', fontWeight: 'bold' }}>
                    ✅ Clasificación Seleccionada:
                  </p>
                  <p style={{ margin: 0, color: '#155724', fontSize: '16px' }}>
                    <strong>{getSelectedSpecialtyName()}</strong> → <strong>{getSelectedTopicName()}</strong>
                  </p>
                </div>
              ) : (
                <div style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
                    ⚠️ Primero selecciona especialidad y tópico
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={isUploading || !selectedSpecialtyId || !selectedTopicId}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !selectedSpecialtyId || !selectedTopicId}
                style={{
                  padding: '15px 30px',
                  backgroundColor: isUploading || !selectedSpecialtyId || !selectedTopicId ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: isUploading || !selectedSpecialtyId || !selectedTopicId ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isUploading ? '🔄 Procesando...' : '📤 Seleccionar CSV'}
              </button>

              <p style={{
                margin: '15px 0 0 0',
                color: '#999',
                fontSize: '14px'
              }}>
                Formato: una pregunta por línea, máximo 10MB
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div style={{
            backgroundColor: '#e7f3ff',
            border: '1px solid #b6d7ff',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '20px'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#0056b3', fontSize: '16px' }}>
              💡 ¿Cómo funciona la Carga Manual?
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#495057', fontSize: '14px', lineHeight: '1.8' }}>
              <li><strong>Clasificación garantizada:</strong> Todos los ejercicios usarán la especialidad/tópico que seleccionaste</li>
              <li><strong>Sin errores de IA:</strong> No hay análisis automático, tú defines la taxonomía</li>
              <li><strong>Variaciones automáticas:</strong> La IA genera 4 variaciones de cada pregunta base</li>
              <li><strong>Más rápido:</strong> Salta el paso de análisis y validación</li>
              <li><strong>100% confiable:</strong> Perfecto para ejercicios de especialidades específicas</li>
            </ul>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '8px',
              color: '#155724'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>✅ Carga Exitosa</h4>
              <p style={{ margin: '0 0 5px 0' }}>
                <strong>{uploadResult.questionsCount}</strong> preguntas cargadas desde <strong>{uploadResult.fileName}</strong>
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Clasificación aplicada:</strong> {uploadResult.taxonomy?.specialty} → {uploadResult.taxonomy?.topic}
              </p>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                Job ID: {uploadResult.jobId}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '8px',
              color: '#721c24'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>❌ Error</h4>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          )}
        </div>

        {/* Jobs Status */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '15px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            color: '#333',
            fontSize: '24px'
          }}>
            📊 Estado de Cargas Manuales
          </h2>

          {jobs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#666'
            }}>
              <span style={{ fontSize: '48px' }}>📋</span>
              <p style={{ margin: '10px 0 0 0' }}>No hay cargas manuales en curso</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Archivo</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Clasificación</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Estado</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Progreso</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                        {job.fileName}
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                        {job.taxonomy ? (
                          <div style={{ fontSize: '13px' }}>
                            <div><strong>{job.taxonomy.specialty}</strong></div>
                            <div style={{ color: '#666' }}>→ {job.taxonomy.topic}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: getStatusColor(job.status),
                          color: 'white',
                          fontSize: '12px'
                        }}>
                          {getStatusText(job.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <div style={{
                            flex: 1,
                            height: '8px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              backgroundColor: getStatusColor(job.status),
                              width: `${job.progress}%`,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {job.processedItems}/{job.totalItems} ({job.progress}%)
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManualTopicUpload;
