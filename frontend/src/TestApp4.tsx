import React, { useState } from 'react';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ExerciseFactory from './ExerciseFactory';
import TaxonomyInventory from './components/TaxonomyInventory';
import TaxonomyAdmin from './components/TaxonomyAdmin';
import ExerciseManagement from './components/admin/ExerciseManagement';

// Simple Login Form Component
const SimpleLoginForm: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('estudiante@eunacom.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '90vw'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
          🩺 EUNACOM Login
        </h1>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '15px',
            backgroundColor: loading ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Ingresando...' : '🔑 Iniciar Sesión'}
        </button>
      </div>
    </div>
  );
};

// Real Quiz Component
const RealQuizPractice: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionId, setQuestionId] = useState('');

  const fetchQuestion = async (useRandomQuestion = true) => {
    setLoading(true);
    setError('');
    setSelectedAnswer(null);
    setShowResult(false);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';
      let url = `${API_BASE}/api/quiz/random-question`;
      if (!useRandomQuestion && questionId) {
        url = `${API_BASE}/api/quiz/question/${questionId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.question) {
        setCurrentQuestion(data.question);
      } else {
        throw new Error(data.message || 'No se pudo cargar la pregunta');
      }
    } catch (err: any) {
      console.error('Error fetching question:', err);
      setError(err.message || 'Error al cargar la pregunta');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionId: number) => {
    if (showResult) return;
    setSelectedAnswer(optionId);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null || !currentQuestion) return;
    setShowResult(true);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '15px',
          textAlign: 'center'
        }}>
          <h2>🔄 Cargando pregunta...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ffebee 0%, #fce4ec 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '15px',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <h2 style={{ color: '#d32f2f', marginBottom: '20px' }}>❌ Error</h2>
          <p style={{ marginBottom: '20px' }}>{error}</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => fetchQuestion()}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🔄 Reintentar
            </button>
            <button
              onClick={onBack}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '15px',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div>
            <h1 style={{ margin: 0, color: '#1976d2' }}>🎯 Práctica EUNACOM</h1>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>
              Probando calidad de preguntas
            </p>
          </div>
          <button
            onClick={onBack}
            style={{
              padding: '10px 20px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ← Volver
          </button>
        </div>

        {/* Question Controls */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '15px',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Cargar Pregunta:</h3>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => fetchQuestion(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🎲 Pregunta Aleatoria
            </button>

            <input
              type="number"
              value={questionId}
              onChange={(e) => setQuestionId(e.target.value)}
              placeholder="ID específico (ej: 1, 2, 3...)"
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                minWidth: '200px'
              }}
            />

            <button
              onClick={() => fetchQuestion(false)}
              disabled={!questionId}
              style={{
                padding: '10px 20px',
                backgroundColor: questionId ? '#ff9800' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: questionId ? 'pointer' : 'not-allowed'
              }}
            >
              🔍 Cargar por ID
            </button>
          </div>
        </div>

        {/* Question Display */}
        {currentQuestion && (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '15px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            {/* Question Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{
                backgroundColor: '#e3f2fd',
                padding: '8px 15px',
                borderRadius: '20px',
                fontSize: '14px',
                color: '#1976d2',
                fontWeight: 'bold'
              }}>
                ID: {currentQuestion.displayId || currentQuestion.id}
              </div>
              {currentQuestion.specialty && (
                <div style={{
                  backgroundColor: '#f3e5f5',
                  padding: '8px 15px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  color: '#7b1fa2'
                }}>
                  {currentQuestion.specialty.name}
                </div>
              )}
              {currentQuestion.difficulty && (
                <div style={{
                  backgroundColor: currentQuestion.difficulty === 'EASY' ? '#e8f5e8' :
                                   currentQuestion.difficulty === 'MEDIUM' ? '#fff3e0' : '#ffebee',
                  padding: '8px 15px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  color: currentQuestion.difficulty === 'EASY' ? '#2e7d32' :
                         currentQuestion.difficulty === 'MEDIUM' ? '#ef6c00' : '#c62828'
                }}>
                  {currentQuestion.difficulty}
                </div>
              )}
            </div>

            {/* Question Text */}
            <h2 style={{
              marginBottom: '25px',
              color: '#333',
              lineHeight: '1.6',
              fontSize: '20px'
            }}>
              {currentQuestion.content}
            </h2>

            {/* Options */}
            <div style={{ marginBottom: '25px' }}>
              {currentQuestion.options?.map((option: any, index: number) => {
                const isSelected = selectedAnswer === option.id;
                const isCorrect = option.isCorrect;
                const showCorrect = showResult && isCorrect;
                const showIncorrect = showResult && isSelected && !isCorrect;

                let backgroundColor = '#f8f9fa';
                let borderColor = '#dee2e6';
                let color = '#333';

                if (showCorrect) {
                  backgroundColor = '#d4edda';
                  borderColor = '#28a745';
                  color = '#155724';
                } else if (showIncorrect) {
                  backgroundColor = '#f8d7da';
                  borderColor = '#dc3545';
                  color = '#721c24';
                } else if (isSelected) {
                  backgroundColor = '#e3f2fd';
                  borderColor = '#1976d2';
                  color = '#0d47a1';
                }

                return (
                  <div
                    key={option.id}
                    onClick={() => handleAnswerSelect(option.id)}
                    style={{
                      padding: '15px 20px',
                      marginBottom: '10px',
                      backgroundColor,
                      border: `2px solid ${borderColor}`,
                      borderRadius: '10px',
                      cursor: showResult ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      color,
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '16px'
                    }}
                  >
                    <span style={{
                      marginRight: '15px',
                      fontWeight: 'bold',
                      minWidth: '25px'
                    }}>
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span style={{ flex: 1 }}>{option.text}</span>
                    {showCorrect && <span style={{ marginLeft: '10px' }}>✅</span>}
                    {showIncorrect && <span style={{ marginLeft: '10px' }}>❌</span>}
                  </div>
                );
              })}
            </div>

            {/* Result explanation */}
            {showResult && currentQuestion.explanation && (
              <div style={{
                backgroundColor: '#f0f8ff',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '20px',
                border: '1px solid #1976d2'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>💡 Explicación:</h4>
                <p style={{ margin: 0, lineHeight: '1.6' }}>{currentQuestion.explanation}</p>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {!showResult ? (
                <button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '15px 25px',
                    backgroundColor: selectedAnswer === null ? '#ccc' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '16px',
                    cursor: selectedAnswer === null ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ✓ Confirmar Respuesta
                </button>
              ) : (
                <>
                  <button
                    onClick={() => fetchQuestion(true)}
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '15px 25px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '16px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    ➡️ Siguiente Pregunta
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!currentQuestion && (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '15px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#1976d2', marginBottom: '20px' }}>
              🎯 Evaluador de Preguntas EUNACOM
            </h2>
            <p style={{ fontSize: '16px', marginBottom: '20px', color: '#666' }}>
              Utiliza los controles de arriba para cargar preguntas y evaluar su calidad.
            </p>
            <div style={{
              backgroundColor: '#f0f8ff',
              padding: '20px',
              borderRadius: '10px',
              border: '1px solid #1976d2',
              textAlign: 'left'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>📋 Funciones:</h4>
              <p style={{ margin: 0, lineHeight: '1.6' }}>
                • <strong>Pregunta Aleatoria:</strong> Carga una pregunta al azar de la base de datos<br/>
                • <strong>Cargar por ID:</strong> Busca una pregunta específica por su número ID<br/>
                • <strong>Evaluación:</strong> Revisa preguntas, opciones y explicaciones<br/>
                • <strong>Calidad:</strong> Verifica el contenido y formato de las preguntas
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Dashboard Component
const SimpleDashboard: React.FC = () => {
  const { state, logout } = useAuth();
  const [showPractice, setShowPractice] = useState(false);
  const [showFactory, setShowFactory] = useState(false);
  const [showTaxonomyInventory, setShowTaxonomyInventory] = useState(false);
  const [showTaxonomyAdmin, setShowTaxonomyAdmin] = useState(false);
  const [showExerciseManagement, setShowExerciseManagement] = useState(false);

  if (showPractice) {
    return <RealQuizPractice onBack={() => setShowPractice(false)} />;
  }

  if (showFactory) {
    return <ExerciseFactory onBack={() => setShowFactory(false)} />;
  }

  if (showTaxonomyInventory) {
    return <TaxonomyInventory onBack={() => setShowTaxonomyInventory(false)} />;
  }

  if (showTaxonomyAdmin) {
    return <TaxonomyAdmin onBack={() => setShowTaxonomyAdmin(false)} />;
  }

  if (showExerciseManagement) {
    return <ExerciseManagement onBack={() => setShowExerciseManagement(false)} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e8f5e8 0%, #f0fff0 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '90vw'
      }}>
        <h1 style={{
          color: '#2e7d32',
          marginBottom: '20px',
          fontSize: '28px'
        }}>
          ✅ ¡Bienvenido, {state.user?.firstName}!
        </h1>

        <p style={{
          color: '#666',
          marginBottom: '30px',
          fontSize: '16px'
        }}>
          Has iniciado sesión correctamente como <strong>{state.user?.role}</strong>.
        </p>

        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={() => setShowPractice(true)}
            style={{
              width: '100%',
              padding: '15px 25px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            🎯 Practicar Ejercicios
          </button>

          {/* Show Factory button only for ADMIN and CONTENT_MANAGER */}
          {(['ADMIN', 'CONTENT_MANAGER'].includes(state.user?.role)) && (
            <button
              onClick={() => setShowFactory(true)}
              style={{
                width: '100%',
                padding: '15px 25px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              🏭 Fábrica de Ejercicios
            </button>
          )}

          {/* Show Taxonomy buttons only for ADMIN */}
          {(state.user?.role === 'ADMIN') && (
            <>
              <button
                onClick={() => setShowTaxonomyInventory(true)}
                style={{
                  width: '100%',
                  padding: '15px 25px',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                📊 Inventario de Taxonomía
              </button>
              
              <button
                onClick={() => setShowTaxonomyAdmin(true)}
                style={{
                  width: '100%',
                  padding: '15px 25px',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                ⚙️ Gestionar Taxonomía
              </button>
              
              <button
                onClick={() => setShowExerciseManagement(true)}
                style={{
                  width: '100%',
                  padding: '15px 25px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  marginBottom: '10px'
                }}
              >
                📋 Listado de Ejercicios
              </button>
            </>
          )}
        </div>

        <div>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '12px 25px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple AppContent that uses useAuth
const SimpleAppContent: React.FC = () => {
  const { state } = useAuth();

  if (state.isAuthenticated && state.user) {
    return <SimpleDashboard />;
  }

  return <SimpleLoginForm />;
};

const TestApp4: React.FC = () => {
  return (
    <QueryProvider>
      <AuthProvider>
        <SimpleAppContent />
      </AuthProvider>
    </QueryProvider>
  );
};

export default TestApp4;
