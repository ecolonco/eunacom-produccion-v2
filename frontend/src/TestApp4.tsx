import React, { useState, useEffect, useCallback } from 'react';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import ExerciseFactory from './ExerciseFactory';
import TaxonomyInventory from './components/TaxonomyInventory';
import TaxonomyAdmin from './components/TaxonomyAdmin';
import ExerciseManagement from './components/admin/ExerciseManagement';
import type { Specialty } from './types/dashboard';

const NUMERIC_ID_REGEX = /^\d+(?:\.\d+)?$/;

const getDisplayId = (question: any): string => {
  if (!question) {
    return '';
  }

  const metadata = (question as any)?.metadata ?? {};
  const baseQuestion = (question as any)?.baseQuestion ?? {};

  const candidates = [
    (question as any)?.formattedId,
    (question as any)?.formatted_id,
    (question as any)?.displayId,
    (question as any)?.display_id,
    (question as any)?.displayCode,
    (question as any)?.display_code,
    (question as any)?.code,
    (question as any)?.referenceId,
    (question as any)?.reference_id,
    (question as any)?.questionNumber,
    metadata?.formattedId,
    metadata?.formatted_id,
    metadata?.displayId,
    metadata?.display_id,
    metadata?.code,
    metadata?.reference,
    metadata?.originalId,
    metadata?.original_id,
    baseQuestion?.formattedId,
    baseQuestion?.formatted_id,
    baseQuestion?.displayId,
    baseQuestion?.display_id,
    baseQuestion?.code,
  ];

  const normalizedCandidates: string[] = [];

  for (const value of candidates) {
    if (typeof value === 'number') {
      normalizedCandidates.push(value.toString());
    } else if (typeof value === 'string' && value.trim().length > 0) {
      normalizedCandidates.push(value.trim());
    }
  }

  const numericMatch = normalizedCandidates.find(candidate => NUMERIC_ID_REGEX.test(candidate));
  if (numericMatch) {
    return numericMatch;
  }

  return normalizedCandidates[0] ?? (typeof question.id === 'string' ? question.id : String(question.id ?? ''));
};

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
interface RealQuizPracticeProps {
  onBack: () => void;
  specialtyMode?: boolean;
  questionLimit?: number;
}

const RealQuizPractice: React.FC<RealQuizPracticeProps> = ({
  onBack,
  specialtyMode = false,
  questionLimit,
}) => {
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [questionId, setQuestionId] = useState('');
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtyLoading, setSpecialtyLoading] = useState(false);
  const [specialtyError, setSpecialtyError] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [questionsCompleted, setQuestionsCompleted] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  useEffect(() => {
    if (!specialtyMode) {
      return;
    }

    const loadSpecialties = async () => {
      setSpecialtyLoading(true);
      setSpecialtyError('');

      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('No hay token de autenticación');
        }

        const API_BASE = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';
        const response = await fetch(`${API_BASE}/api/quiz/specialties`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.specialties)) {
          setSpecialties(data.specialties);
        } else {
          throw new Error(data.message || 'No se pudo cargar las especialidades');
        }
      } catch (err: any) {
        console.error('Error fetching specialties:', err);
        setSpecialtyError(err.message || 'Error al cargar las especialidades');
      } finally {
        setSpecialtyLoading(false);
      }
    };

    loadSpecialties();
  }, [specialtyMode]);

  const handleSpecialtyChange = (value: string) => {
    setSelectedSpecialty(value);
    setError('');
    setCurrentQuestion(null);
    setResult(null);
    setShowResult(false);
    setSelectedAnswer(null);
    setQuestionsCompleted(0);
    setSessionCompleted(false);
  };

  const fetchQuestion = useCallback(async (useRandomQuestion = true, overrideSpecialty?: string) => {
    if (sessionCompleted && questionLimit) {
      return;
    }

    if (specialtyMode && useRandomQuestion) {
      const specialtyToUse = overrideSpecialty ?? selectedSpecialty;
      if (!specialtyToUse) {
        setError('Selecciona una especialidad para continuar');
        return;
      }
    }

    setLoading(true);
    setError('');
    setSelectedAnswer(null);
    setResult(null);
    setShowResult(false);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';
      let url = `${API_BASE}/api/quiz/random-question`;
      let specialtyToUse = overrideSpecialty ?? selectedSpecialty;

      if (!useRandomQuestion && questionId) {
        url = `${API_BASE}/api/quiz/question/${questionId}`;
        specialtyToUse = undefined;
      }

      if (useRandomQuestion && specialtyToUse) {
        const params = new URLSearchParams();
        params.append('specialty', specialtyToUse);
        url = `${url}?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing question response:', parseError);
      }

      if (!response.ok) {
        throw new Error(data?.message || `Error ${response.status}: ${response.statusText}`);
      }

      if (data?.success && data?.question) {
        setCurrentQuestion(data.question);
      } else {
        throw new Error(data?.message || 'No se pudo cargar la pregunta');
      }
    } catch (err: any) {
      console.error('Error fetching question:', err);
      setError(err.message || 'Error al cargar la pregunta');
    } finally {
      setLoading(false);
    }
  }, [questionId, selectedSpecialty, specialtyMode, sessionCompleted, questionLimit]);

  useEffect(() => {
    if (!specialtyMode) {
      return;
    }

    if (!selectedSpecialty) {
      setCurrentQuestion(null);
      setResult(null);
      setShowResult(false);
      setSelectedAnswer(null);
      return;
    }

    fetchQuestion(true, selectedSpecialty);
  }, [specialtyMode, selectedSpecialty, fetchQuestion]);

  useEffect(() => {
    if (!questionLimit) {
      return;
    }

    if (!currentQuestion && !loading && !sessionCompleted) {
      fetchQuestion(true);
    }
  }, [questionLimit, currentQuestion, loading, sessionCompleted, fetchQuestion]);

  const canFetchRandom = !specialtyMode || Boolean(selectedSpecialty);
  const selectedSpecialtyName = specialties.find((item) => item.name === selectedSpecialty)?.name || '';
  const currentDisplayId = currentQuestion ? getDisplayId(currentQuestion) : '';

  const handleAnswerSelect = (optionId: string) => {
    if (showResult || isSubmitting) return;
    setSelectedAnswer(String(optionId));
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !currentQuestion) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';
      const response = await fetch(`${API_BASE}/api/quiz/submit-answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOptionId: selectedAnswer
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo procesar la respuesta');
      }

      setResult(data.result);
      setShowResult(true);
      setQuestionsCompleted((prev) => {
        const next = prev + 1;
        if (questionLimit && next >= questionLimit) {
          setSessionCompleted(true);
        }
        return next;
      });
    } catch (submitError: any) {
      console.error('Error submitting answer:', submitError);
      alert(submitError.message || 'Error al enviar la respuesta');
    } finally {
      setIsSubmitting(false);
    }
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
              disabled={!canFetchRandom}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: !canFetchRandom ? '#ccc' : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: !canFetchRandom ? 'not-allowed' : 'pointer'
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

  const resolvedCorrectOptionId = result?.correctOptionId || currentQuestion?.options?.find((opt: any) => opt.isCorrect)?.id || null;
  const resolvedSelectedOptionId = result?.selectedOptionId || selectedAnswer || null;

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
            {specialtyMode && (
              <p style={{
                margin: '5px 0 0 0',
                color: '#1976d2',
                fontWeight: 600
              }}>
                {selectedSpecialtyName ? `Especialidad seleccionada: ${selectedSpecialtyName}` : 'Selecciona una especialidad para comenzar.'}
              </p>
            )}
            {questionLimit && (
              <p style={{
                margin: '5px 0 0 0',
                color: '#0f766e',
                fontWeight: 600
              }}>
                {sessionCompleted
                  ? `Completaste las ${questionLimit} preguntas asignadas.`
                  : `Pregunta ${Math.min(questionsCompleted + (showResult ? 0 : 1), questionLimit)} de ${questionLimit}`}
              </p>
            )}
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
          {specialtyMode && (
            <>
              <div style={{
                display: 'flex',
                gap: '15px',
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: '15px'
              }}>
                <span style={{ fontWeight: 600, color: '#1976d2' }}>Especialidad:</span>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => handleSpecialtyChange(e.target.value)}
                  disabled={specialtyLoading}
                  style={{
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    minWidth: '220px',
                    fontSize: '14px',
                    backgroundColor: specialtyLoading ? '#f3f4f6' : 'white',
                    color: '#333',
                    cursor: specialtyLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="">
                    {specialtyLoading ? 'Cargando especialidades...' : 'Selecciona una especialidad'}
                  </option>
                  {specialties.map((specialty) => (
                    <option key={specialty.id} value={specialty.name}>
                      {specialty.name}
                    </option>
                  ))}
                </select>
              </div>
              {specialtyError && (
                <p style={{ margin: '0 0 10px 0', color: '#d32f2f', fontSize: '14px' }}>
                  {specialtyError}
                </p>
              )}
            </>
          )}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => fetchQuestion(true)}
              disabled={!canFetchRandom || loading || (questionLimit ? sessionCompleted : false)}
              style={{
                padding: '10px 20px',
                backgroundColor: (!canFetchRandom || loading || (questionLimit ? sessionCompleted : false)) ? '#ccc' : '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (!canFetchRandom || loading || (questionLimit ? sessionCompleted : false)) ? 'not-allowed' : 'pointer'
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
              disabled={!questionId || loading || (questionLimit ? sessionCompleted : false)}
              style={{
                padding: '10px 20px',
                backgroundColor: (!questionId || loading || (questionLimit ? sessionCompleted : false)) ? '#ccc' : '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (!questionId || loading || (questionLimit ? sessionCompleted : false)) ? 'not-allowed' : 'pointer'
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
                ID: {currentDisplayId}
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
                const isSelected = resolvedSelectedOptionId === option.id;
                const isCorrect = resolvedCorrectOptionId ? option.id === resolvedCorrectOptionId : option.isCorrect;
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
                  <div key={option.id} style={{ marginBottom: '12px' }}>
                    <div
                      onClick={() => handleAnswerSelect(option.id)}
                      style={{
                        padding: '15px 20px',
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
                    {showCorrect && (option.explanation || result?.correctAnswerExplanation) && (
                      <div style={{
                        marginTop: '8px',
                        backgroundColor: '#e6f4ea',
                        border: '1px solid #a5d6a7',
                        borderRadius: '8px',
                        padding: '12px',
                        color: '#1b5e20',
                        fontSize: '14px',
                        lineHeight: 1.6
                      }}>
                        {option.explanation ?? result?.correctAnswerExplanation}
                      </div>
                    )}
                    {showIncorrect && (option.explanation || result?.selectedAnswerExplanation) && (
                      <div style={{
                        marginTop: '8px',
                        backgroundColor: '#fdecea',
                        border: '1px solid #f5c6cb',
                        borderRadius: '8px',
                        padding: '12px',
                        color: '#872328',
                        fontSize: '14px',
                        lineHeight: 1.6
                      }}>
                        {option.explanation ?? result?.selectedAnswerExplanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Result explanation */}
            {showResult && (result?.explanation || currentQuestion.explanation) && (
              <div style={{
                backgroundColor: '#f0f8ff',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '20px',
                border: '1px solid #1976d2'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>💡 Explicación:</h4>
                <p style={{ margin: 0, lineHeight: '1.6' }}>{result?.explanation || currentQuestion.explanation}</p>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {!showResult ? (
                <button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null || isSubmitting}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '15px 25px',
                    backgroundColor: selectedAnswer === null || isSubmitting ? '#ccc' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '16px',
                    cursor: selectedAnswer === null || isSubmitting ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {isSubmitting ? 'Enviando...' : '✓ Confirmar Respuesta'}
                </button>
              ) : (
                <>
                <button
                  onClick={() => fetchQuestion(true)}
                  disabled={questionLimit ? sessionCompleted : false}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '15px 25px',
                    backgroundColor: (questionLimit ? sessionCompleted : false) ? '#9ca3af' : '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '16px',
                    cursor: (questionLimit ? sessionCompleted : false) ? 'not-allowed' : 'pointer',
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
        {!currentQuestion && !sessionCompleted && (
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

        {sessionCompleted && questionLimit && (
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '15px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#0f766e', marginBottom: '20px' }}>
              🎉 ¡Sesión completada!
            </h2>
            <p style={{ fontSize: '16px', marginBottom: '20px', color: '#666' }}>
              Respondiste las {questionLimit} preguntas asignadas. Puedes repetir la sesión o volver al menú principal.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setQuestionsCompleted(0);
                  setSessionCompleted(false);
                  setCurrentQuestion(null);
                  setResult(null);
                  setShowResult(false);
                  setSelectedAnswer(null);
                  fetchQuestion(true);
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                🔁 Repetir sesión
              </button>
              <button
                onClick={onBack}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                ← Volver al inicio
              </button>
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
  const [showSpecialtyPractice, setShowSpecialtyPractice] = useState(false);
  const [showRandomSession, setShowRandomSession] = useState(false);
  const [showFactory, setShowFactory] = useState(false);
  const [showTaxonomyInventory, setShowTaxonomyInventory] = useState(false);
  const [showTaxonomyAdmin, setShowTaxonomyAdmin] = useState(false);
  const [showExerciseManagement, setShowExerciseManagement] = useState(false);

  if (showPractice) {
    return <RealQuizPractice onBack={() => setShowPractice(false)} />;
  }

  if (showSpecialtyPractice) {
    return <RealQuizPractice onBack={() => setShowSpecialtyPractice(false)} specialtyMode />;
  }

  if (showRandomSession) {
    return <RealQuizPractice onBack={() => setShowRandomSession(false)} questionLimit={20} />;
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
            onClick={() => {
              setShowSpecialtyPractice(false);
              setShowRandomSession(false);
              setShowPractice(true);
            }}
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
            🎯 Practica ejercicos aleatoriamente
          </button>

          <button
            onClick={() => {
              setShowPractice(false);
              setShowSpecialtyPractice(false);
              setShowRandomSession(true);
            }}
            style={{
              width: '100%',
              padding: '15px 25px',
              backgroundColor: '#0d9488',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            🔢 Generar 20 preguntas
          </button>

          <button
            onClick={() => {
              setShowPractice(false);
              setShowRandomSession(false);
              setShowSpecialtyPractice(true);
            }}
            style={{
              width: '100%',
              padding: '15px 25px',
              backgroundColor: '#5c6bc0',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            🏥 Practicar por Especialidad
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
    // Show StudentDashboard with credits for STUDENT role
    if (state.user.role === 'STUDENT') {
      return <StudentDashboard />;
    }
    // Show SimpleDashboard with buttons for ADMIN and other roles
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
