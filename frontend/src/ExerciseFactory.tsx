import React, { useState, useRef } from 'react';
import { QASweep } from './components/admin/QASweep';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Job {
  id: string;
  type: string;
  status: string;
  totalItems: number;
  processedItems: number;
  fileName: string;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  progress: number;
}

interface ExerciseFactoryProps {
  onBack: () => void;
}

const ExerciseFactory: React.FC<ExerciseFactoryProps> = ({ onBack }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState('');
  const [showGeneratedQuestions, setShowGeneratedQuestions] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showQASweep, setShowQASweep] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination states
  const [jobsPage, setJobsPage] = useState(1);
  const [questionsPage, setQuestionsPage] = useState(1);
  const jobsPerPage = 5;
  const questionsPerPage = 2;
  

  // Single exercise form state
  const [singleQuestion, setSingleQuestion] = useState('');
  const [singleDescription, setSingleDescription] = useState('');
  const [isCreatingSingle, setIsCreatingSingle] = useState(false);
  const [singleResult, setSingleResult] = useState<any>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Por favor selecciona un archivo CSV válido');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/exercise-factory/upload-csv`, {
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

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSingleExerciseSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!singleQuestion.trim()) {
      setError('Por favor ingresa una pregunta');
      return;
    }

    if (singleQuestion.length < 10) {
      setError('La pregunta debe tener al menos 10 caracteres');
      return;
    }

    setIsCreatingSingle(true);
    setError('');
    setSingleResult(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/api/exercise-factory/create-single`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: singleQuestion,
          description: singleDescription
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear ejercicio');
      }

      const result = await response.json();
      setSingleResult(result.data);

      // Clear form
      setSingleQuestion('');
      setSingleDescription('');

      // Refresh jobs list
      await loadJobs();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreatingSingle(false);
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
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error('Error loading jobs:', err);
    }
  };

  const loadGeneratedQuestions = async () => {
    setLoadingQuestions(true);
    setError(''); // Clear previous errors
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/exercise-factory/generated-questions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Generated questions data:', data); // Debug log
        setGeneratedQuestions(data.data.questions);
        setShowGeneratedQuestions(true);
      } else if (response.status === 401) {
        setError('Token de autenticación expirado. Por favor, inicia sesión nuevamente.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(`Error al cargar las preguntas: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error loading generated questions:', err);
      setError('Error al cargar las preguntas generadas');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm('⚠️ ¿Estás seguro de que quieres eliminar este ejercicio y TODAS sus variaciones?\n\nEsta acción NO se puede deshacer.')) {
      return;
    }

    const reason = prompt('Opcional: Indica la razón de la eliminación (para auditoría):');
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/exercise-factory/admin/delete-exercise/${exerciseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason || 'Sin razón especificada' })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Ejercicio eliminado exitosamente:\n\n• Variaciones eliminadas: ${result.deletedData.variationsDeleted}\n• Alternativas eliminadas: ${result.deletedData.alternativesDeleted}\n• Análisis IA eliminado: ${result.deletedData.aiAnalysisDeleted ? 'Sí' : 'No'}`);
        
        // Reload the questions list to reflect the changes
        await loadGeneratedQuestions();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(`Error al eliminar el ejercicio: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error deleting exercise:', err);
      setError('Error al eliminar el ejercicio');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#28a745';
      case 'RUNNING': return '#007bff';
      case 'FAILED': return '#dc3545';
      case 'PENDING': return '#6c757d';
      default: return '#6c757d';
    }
  };

  // Pagination functions
  const getPaginatedJobs = () => {
    // Backend already returns jobs sorted by createdAt desc (newest first)
    const startIndex = (jobsPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    return jobs.slice(startIndex, endIndex);
  };

  const getPaginatedQuestions = () => {
    const sortedQuestions = generatedQuestions.slice().reverse(); // Show latest first
    const startIndex = (questionsPage - 1) * questionsPerPage;
    const endIndex = startIndex + questionsPerPage;
    return sortedQuestions.slice(startIndex, endIndex);
  };

  const totalJobsPages = Math.ceil(jobs.length / jobsPerPage);
  const totalQuestionsPages = Math.ceil(generatedQuestions.length / questionsPerPage);

  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    label 
  }: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void; 
    label: string;
  }) => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginTop: '15px',
      padding: '10px 0'
    }}>
      <span style={{ fontSize: '14px', color: '#6c757d' }}>
        {label} - Página {currentPage} de {totalPages}
      </span>
      <div style={{ display: 'flex', gap: '5px' }}>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          style={{
            padding: '5px 10px',
            backgroundColor: currentPage === 1 ? '#e9ecef' : '#007bff',
            color: currentPage === 1 ? '#6c757d' : 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          ← Anterior
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          style={{
            padding: '5px 10px',
            backgroundColor: currentPage === totalPages ? '#e9ecef' : '#007bff',
            color: currentPage === totalPages ? '#6c757d' : 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Completado';
      case 'RUNNING': return 'En proceso';
      case 'FAILED': return 'Error';
      case 'PENDING': return 'Pendiente';
      default: return status;
    }
  };

  React.useEffect(() => {
    loadJobs();
    // Auto-refresh jobs every 5 seconds
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, []);

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
              🏭 Fábrica de Ejercicios EUNACOM v2.0
            </h1>
            <p style={{
              margin: '10px 0 0 0',
              color: '#666',
              fontSize: '18px'
            }}>
              Sistema inteligente de generación de preguntas médicas con IA
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowQASweep(!showQASweep)}
              style={{
                padding: '12px 24px',
                backgroundColor: showQASweep ? '#dc3545' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {showQASweep ? '❌ Cerrar QA Sweep' : '🔍 QA Sweep'}
            </button>
            <button
              onClick={loadGeneratedQuestions}
              disabled={loadingQuestions}
              style={{
                padding: '12px 24px',
                backgroundColor: loadingQuestions ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loadingQuestions ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
            >
              {loadingQuestions ? '🔄 Cargando...' : '📝 Ver Ejercicios Generados'}
            </button>
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
        </div>

        {/* Upload Section */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '15px',
          marginBottom: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            color: '#333',
            fontSize: '24px'
          }}>
            📄 Cargar Preguntas Base (CSV)
          </h2>

          <div style={{
            border: '2px dashed #dee2e6',
            borderRadius: '10px',
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '48px' }}>📁</span>
            </div>

            <p style={{
              margin: '0 0 20px 0',
              color: '#666',
              fontSize: '16px'
            }}>
              Selecciona un archivo CSV con preguntas médicas base.<br/>
              Cada pregunta se analizará con IA y se generarán 6 variaciones automáticamente.
            </p>

            <div style={{
              backgroundColor: '#e7f3ff',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #b6d7ff'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#0056b3', fontSize: '14px' }}>
                📋 Formatos CSV Soportados:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#495057' }}>
                <li><strong>Con header:</strong> Primera fila = "question_text", "pregunta", etc. (se detecta automáticamente)</li>
                <li><strong>Sin header:</strong> Directamente las preguntas médicas desde la primera fila</li>
                <li><strong>Una pregunta por fila</strong> en la columna A</li>
              </ul>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={isUploading}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                padding: '15px 30px',
                backgroundColor: isUploading ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                marginRight: '10px'
              }}
            >
              {isUploading ? '🔄 Cargando...' : '📤 Seleccionar CSV'}
            </button>

            <p style={{
              margin: '15px 0 0 0',
              color: '#999',
              fontSize: '14px'
            }}>
              Formato: una pregunta por línea, máximo 10MB
            </p>
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
              <p style={{ margin: 0 }}>
                Se cargaron <strong>{uploadResult.questionsCount}</strong> preguntas desde
                <strong> {uploadResult.fileName}</strong>
              </p>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
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

        {/* Single Exercise Form */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '15px',
          marginBottom: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            color: '#333',
            fontSize: '24px'
          }}>
            ✏️ Crear Ejercicio Individual
          </h2>

          <form onSubmit={handleSingleExerciseSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                Pregunta Madre *
              </label>
              <textarea
                value={singleQuestion}
                onChange={(e) => setSingleQuestion(e.target.value)}
                placeholder="Ingresa la pregunta base que servirá para generar las variaciones automáticamente..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  border: '2px solid #dee2e6',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1976d2'}
                onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
                disabled={isCreatingSingle}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Mínimo 10 caracteres. Máximo 2000 caracteres.
              </small>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                Descripción Adicional (Opcional)
              </label>
              <textarea
                value={singleDescription}
                onChange={(e) => setSingleDescription(e.target.value)}
                placeholder="Información adicional sobre el contexto o tema de la pregunta..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  border: '2px solid #dee2e6',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1976d2'}
                onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
                disabled={isCreatingSingle}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Máximo 500 caracteres.
              </small>
            </div>

            <div style={{
              display: 'flex',
              gap: '15px',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <button
                type="submit"
                disabled={isCreatingSingle || !singleQuestion.trim()}
                style={{
                  padding: '12px 30px',
                  backgroundColor: isCreatingSingle || !singleQuestion.trim() ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: isCreatingSingle || !singleQuestion.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.3s ease'
                }}
              >
                {isCreatingSingle ? '🔄 Procesando...' : '🚀 Generar Variaciones'}
              </button>

              <div style={{
                padding: '8px 16px',
                backgroundColor: '#e7f3ff',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#0056b3'
              }}>
                💡 Se generarán 6 variaciones automáticamente (3 fácil, 2 medio, 1 difícil)
              </div>
            </div>
          </form>

          {/* Single Exercise Result */}
          {singleResult && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '8px',
              color: '#155724'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>✅ Ejercicio Enviado</h4>
              <p style={{ margin: '0 0 10px 0' }}>
                <strong>Pregunta:</strong> {singleResult.question}
              </p>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>
                <strong>Job ID:</strong> {singleResult.jobId}
              </p>
              <p style={{ margin: 0, fontSize: '14px' }}>
                <strong>Estado:</strong> {singleResult.status}
              </p>
            </div>
          )}
        </div>

        {/* Process Overview */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '15px',
          marginBottom: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            color: '#333',
            fontSize: '24px'
          }}>
            ⚙️ Proceso de la Fábrica
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            {[
              { icon: '📄', title: 'CSV Upload', desc: 'Carga preguntas base' },
              { icon: '🧠', title: 'Análisis IA', desc: 'Clasificación EUNACOM' },
              { icon: '🔄', title: 'Variaciones', desc: '3 fácil, 2 medio, 1 difícil' },
              { icon: '📝', title: 'Alternativas', desc: 'Opciones múltiples' },
              { icon: '📚', title: 'Explicaciones', desc: 'Detalladas y precisas' },
              { icon: '✅', title: 'Revisión', desc: 'Control de calidad' }
            ].map((step, index) => (
              <div key={index} style={{
                textAlign: 'center',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '10px'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>{step.icon}</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>{step.title}</h4>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{step.desc}</p>
              </div>
            ))}
          </div>
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
            📊 Estado de Procesamientos
          </h2>

          {jobs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#666'
            }}>
              <span style={{ fontSize: '48px' }}>📋</span>
              <p style={{ margin: '10px 0 0 0' }}>No hay procesamientos en curso</p>
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
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Estado</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Progreso</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Iniciado</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Completado</th>
                  </tr>
                </thead>
                <tbody>
                  {getPaginatedJobs().map((job) => (
                    <tr key={job.id}>
                      <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                        {job.fileName}
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
                      <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                        {new Date(job.startedAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                        {job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Jobs Pagination */}
              {jobs.length > jobsPerPage && (
                <PaginationControls
                  currentPage={jobsPage}
                  totalPages={totalJobsPages}
                  onPageChange={setJobsPage}
                  label="Estados de procesamiento"
                />
              )}
            </div>
          )}
        </div>

        {/* Generated Questions Section */}
        {showGeneratedQuestions && (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '15px',
            marginTop: '30px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                margin: 0,
                color: '#333',
                fontSize: '24px'
              }}>
                📝 Ejercicios Generados
              </h2>
              <button
                onClick={() => setShowGeneratedQuestions(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕ Cerrar
              </button>
            </div>

            {generatedQuestions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#666'
              }}>
                <span style={{ fontSize: '48px' }}>📚</span>
                <p style={{ margin: '10px 0 0 0' }}>No hay ejercicios generados disponibles</p>
              </div>
            ) : (
              <div>
                <div style={{
                  maxHeight: '600px',
                  overflowY: 'auto',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px'
                }}>
                  {getPaginatedQuestions().map((baseQuestion, index) => {
                    const paginatedQuestions = getPaginatedQuestions();
                    return (
                    <div key={baseQuestion.id} style={{
                      padding: '20px',
                      borderBottom: index < paginatedQuestions.length - 1 ? '1px solid #dee2e6' : 'none'
                    }}>
                    {/* Base Question */}
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '8px',
                      marginBottom: '15px'
                    }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>
                        📄 Pregunta Base #{baseQuestion.sequenceNumber || (index + 1)}
                      </h4>
                      
                      {/* ADMIN CONTROLS - FORCED DISPLAY */}
                      <div style={{
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffeaa7',
                        padding: '10px',
                        borderRadius: '6px',
                        marginBottom: '10px',
                        fontSize: '13px'
                      }}>
                        <strong>🔧 ADMIN:</strong>
                        <br />
                        <span style={{ fontFamily: 'monospace', background: '#f8f9fa', padding: '2px 4px', borderRadius: '3px' }}>
                          Ejercicio #{baseQuestion.sequenceNumber || 'N/A'} | ID: {baseQuestion.id?.substring(0, 8) || 'NO_ID_FOUND'}...
                        </span>
                        <br />
                        <button
                          onClick={() => handleDeleteExercise(baseQuestion.id)}
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            marginTop: '5px'
                          }}
                        >
                          🗑️ ELIMINAR EJERCICIO COMPLETO
                        </button>
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
                        {baseQuestion.content}
                      </p>
                      {baseQuestion.aiAnalysis && (
                        <div style={{ 
                          fontSize: '14px', 
                          color: '#6c757d',
                          backgroundColor: '#e9ecef',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          marginTop: '10px'
                        }}>
                          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                            <span><strong>🏥 Especialidad:</strong> {baseQuestion.aiAnalysis.specialty}</span>
                            <span><strong>📚 Tema:</strong> {baseQuestion.aiAnalysis.topic}</span>
                            <span><strong>⚡ Dificultad:</strong> {baseQuestion.aiAnalysis.difficulty}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Variations */}
                    <div style={{ paddingLeft: '20px' }}>
                      <h5 style={{ margin: '0 0 15px 0', color: '#28a745' }}>
                        🔄 Variaciones Generadas ({baseQuestion.variations?.length || 0})
                      </h5>

                      {baseQuestion.variations?.map((variation: { id: string; difficulty: string; variationNumber: number; content: string; alternatives: any[] }, varIndex: number) => (
                        <div key={variation.id} style={{
                          border: '1px solid #e9ecef',
                          borderRadius: '8px',
                          padding: '15px',
                          marginBottom: '15px',
                          backgroundColor: '#fff'
                        }}>
                          <div style={{ marginBottom: '10px' }}>
                            <span style={{
                              backgroundColor:
                                variation.difficulty === 'EASY' ? '#d4edda' :
                                variation.difficulty === 'MEDIUM' ? '#fff3cd' : '#f8d7da',
                              color:
                                variation.difficulty === 'EASY' ? '#155724' :
                                variation.difficulty === 'MEDIUM' ? '#856404' : '#721c24',
                              padding: '4px 12px',
                              borderRadius: '15px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              Variación #{variation.variationNumber} - {variation.difficulty}
                            </span>
                            
                            {/* VARIATION ID - FORCED DISPLAY */}
                            <div style={{
                              backgroundColor: '#e9ecef',
                              border: '1px solid #ced4da', 
                              padding: '5px',
                              borderRadius: '4px',
                              marginTop: '5px',
                              fontSize: '11px',
                              fontFamily: 'monospace'
                            }}>
                              Ejercicio #{baseQuestion.sequenceNumber || 'N/A'}.{variation.variationNumber} | ID: {variation.id?.substring(0, 8) || 'NO_ID'}...
                            </div>
                          </div>

                          <p style={{ margin: '0 0 15px 0', fontWeight: '500' }}>
                            {variation.content}
                          </p>

                          {/* Alternatives */}
                          <div style={{ marginBottom: '15px' }}>
                            <strong style={{ fontSize: '14px', color: '#495057' }}>Alternativas:</strong>
                            <div style={{ marginTop: '8px' }}>
                              {variation.alternatives?.map((alt: any, altIndex: number) => (
                                <div key={alt.id} style={{
                                  padding: '8px',
                                  backgroundColor: alt.isCorrect ? '#d4edda' : '#f8f9fa',
                                  border: alt.isCorrect ? '1px solid #c3e6cb' : '1px solid #e9ecef',
                                  borderRadius: '4px',
                                  marginBottom: '5px',
                                  fontSize: '14px'
                                }}>
                                  <strong>{String.fromCharCode(65 + altIndex)})</strong> {alt.text}
                                  {alt.isCorrect && <span style={{ color: '#155724', fontWeight: 'bold' }}> ✓</span>}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Explanation */}
                          <div style={{
                            backgroundColor: '#e7f3ff',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid #b6d7ff'
                          }}>
                            <strong style={{ fontSize: '14px', color: '#0056b3' }}>💡 Explicación:</strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#495057' }}>
                              {(variation as any).explanation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                    );
                  })}
                </div>
                
                {/* Questions Pagination */}
                {generatedQuestions.length > questionsPerPage && (
                  <PaginationControls
                    currentPage={questionsPage}
                    totalPages={totalQuestionsPages}
                    onPageChange={setQuestionsPage}
                    label="Ejercicios generados"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* QA Sweep Section */}
        {showQASweep && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '30px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <QASweep />
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseFactory;