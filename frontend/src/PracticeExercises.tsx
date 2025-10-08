import React, { useState, useEffect } from 'react';

interface Question {
  id: number;
  questionText: string;
  options: Array<{
    id: number;
    text: string;
    isCorrect: boolean;
  }>;
  explanation?: string;
}

interface PracticeExercisesProps {
  onBack: () => void;
}

const PracticeExercises: React.FC<PracticeExercisesProps> = ({ onBack }) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [error, setError] = useState('');

  const fetchRandomQuestion = async () => {
    setLoading(true);
    setError('');
    setSelectedAnswer(null);
    setShowResult(false);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';
      const response = await fetch(`${API_BASE}/api/quiz/random-question`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setCurrentQuestion(data);
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

    // Check if answer is correct
    const selectedOption = currentQuestion.options.find(opt => opt.id === selectedAnswer);
    if (selectedOption?.isCorrect) {
      setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setScore(prev => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const handleNextQuestion = () => {
    fetchRandomQuestion();
  };

  useEffect(() => {
    fetchRandomQuestion();
  }, []);

  if (loading) {
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
              onClick={fetchRandomQuestion}
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

  if (!currentQuestion) {
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
          textAlign: 'center'
        }}>
          <h2>❓ No hay preguntas disponibles</h2>
          <button
            onClick={onBack}
            style={{
              marginTop: '20px',
              padding: '12px 20px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ← Volver al Dashboard
          </button>
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
        maxWidth: '800px',
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
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, color: '#1976d2' }}>🎯 Práctica EUNACOM</h1>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>
              Respuestas correctas: {score.correct}/{score.total}
              {score.total > 0 && ` (${Math.round((score.correct / score.total) * 100)}%)`}
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

        {/* Question */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '15px',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            marginBottom: '25px',
            color: '#333',
            lineHeight: '1.5'
          }}>
            {currentQuestion.questionText}
          </h2>

          {/* Options */}
          <div style={{ marginBottom: '25px' }}>
            {currentQuestion.options.map((option, index) => {
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
                  <span>{option.text}</span>
                  {showCorrect && <span style={{ marginLeft: 'auto' }}>✅</span>}
                  {showIncorrect && <span style={{ marginLeft: 'auto' }}>❌</span>}
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
              <p style={{ margin: 0, lineHeight: '1.5' }}>{currentQuestion.explanation}</p>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '15px' }}>
            {!showResult ? (
              <button
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
                style={{
                  flex: 1,
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
              <button
                onClick={handleNextQuestion}
                style={{
                  flex: 1,
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeExercises;