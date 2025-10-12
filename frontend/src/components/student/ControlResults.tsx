import React, { useState, useEffect } from 'react';
import { controlService, Control } from '../../services/control.service';

interface ControlResultsProps {
  controlId: string;
  onBack: () => void;
}

export const ControlResults: React.FC<ControlResultsProps> = ({ controlId, onBack }) => {
  const [control, setControl] = useState<Control | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadResults();
  }, [controlId]);

  const loadResults = async () => {
    try {
      const data = await controlService.getResults(controlId);
      setControl(data);
    } catch (error) {
      console.error('Error loading results:', error);
      alert('Error al cargar los resultados');
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (variationId: string) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(variationId)) {
        newSet.delete(variationId);
      } else {
        newSet.add(variationId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Cargando resultados...</div>
      </div>
    );
  }

  if (!control || !control.questions) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">Error: No se pudieron cargar los resultados</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Volver
        </button>
      </div>
    );
  }

  const scorePercentage = control.score || 0;
  const correctCount = control.correctAnswers || 0;
  const totalCount = control.totalQuestions;
  const incorrectCount = totalCount - correctCount;

  // Crear mapa de respuestas
  const answersMap: Record<string, any> = {};
  if (control.answers) {
    control.answers.forEach((answer) => {
      answersMap[answer.variationId] = answer;
    });
  }

  // Determinar color según el puntaje
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Summary Card */}
      <div className={`border-2 rounded-lg p-8 mb-8 ${getScoreBg(scorePercentage)}`}>
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Control Finalizado
          </h2>
          <p className="text-gray-600">
            {new Date(control.completedAt || '').toLocaleString('es-CL')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(scorePercentage)}`}>
              {scorePercentage}%
            </div>
            <div className="text-gray-600 mt-2">Puntaje</div>
          </div>

          <div className="text-center">
            <div className="text-6xl font-bold text-green-600">
              {correctCount}
            </div>
            <div className="text-gray-600 mt-2">Correctas</div>
          </div>

          <div className="text-center">
            <div className="text-6xl font-bold text-red-600">
              {incorrectCount}
            </div>
            <div className="text-gray-600 mt-2">Incorrectas</div>
          </div>
        </div>

        {control.timeSpentSecs && (
          <div className="text-center text-gray-600">
            ⏱️ Tiempo empleado: {Math.floor(control.timeSpentSecs / 60)} minutos{' '}
            {control.timeSpentSecs % 60} segundos
          </div>
        )}

        <div className="text-center mt-6">
          <button
            onClick={onBack}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>

      {/* Performance Message */}
      <div className={`border rounded-lg p-6 mb-8 ${
        scorePercentage >= 80
          ? 'bg-green-50 border-green-200'
          : scorePercentage >= 60
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <h3 className="font-bold text-lg mb-2">
          {scorePercentage >= 80 && '🎉 ¡Excelente desempeño!'}
          {scorePercentage >= 60 && scorePercentage < 80 && '👍 Buen trabajo'}
          {scorePercentage < 60 && '💪 Sigue practicando'}
        </h3>
        <p className="text-gray-700">
          {scorePercentage >= 80 && 'Tienes un dominio sólido de los temas evaluados. ¡Sigue así!'}
          {scorePercentage >= 60 && scorePercentage < 80 && 'Vas por buen camino. Revisa las preguntas incorrectas para mejorar.'}
          {scorePercentage < 60 && 'Te recomendamos repasar los temas y realizar más ejercicios de práctica.'}
        </p>
      </div>

      {/* Questions Review */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          📋 Revisión de Preguntas
        </h3>

        <div className="space-y-4">
          {control.questions
            .sort((a, b) => a.questionOrder - b.questionOrder)
            .map((question, index) => {
              const answer = answersMap[question.variationId];
              const isExpanded = expandedQuestions.has(question.variationId);
              const correctAlt = question.variation.alternatives.find((a) => a.isCorrect);
              const correctLetter = correctAlt ? String.fromCharCode(65 + correctAlt.order) : '?';

              return (
                <div
                  key={question.id}
                  className={`border-2 rounded-lg overflow-hidden ${
                    answer?.isCorrect
                      ? 'border-green-300 bg-green-50'
                      : 'border-red-300 bg-red-50'
                  }`}
                >
                  {/* Question Header */}
                  <button
                    onClick={() => toggleQuestion(question.variationId)}
                    className="w-full p-4 flex items-center justify-between hover:bg-opacity-50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                          answer?.isCorrect
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {answer?.isCorrect ? '✓' : '✗'}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">
                          Pregunta {index + 1}
                        </div>
                        <div className="text-sm text-gray-600">
                          {answer
                            ? answer.isCorrect
                              ? `Correcta - Respondiste: ${answer.selectedAnswer}`
                              : `Incorrecta - Tu respuesta: ${answer.selectedAnswer} | Correcta: ${correctLetter}`
                            : 'Sin responder'}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl text-gray-400">
                      {isExpanded ? '▼' : '▶'}
                    </div>
                  </button>

                  {/* Question Details (Expanded) */}
                  {isExpanded && (
                    <div className="border-t-2 border-gray-300 p-6 bg-white">
                      {question.variation.displayCode && (
                        <div className="text-sm text-gray-500 mb-3">
                          Ejercicio {question.variation.displayCode}
                        </div>
                      )}

                      {/* Question Content */}
                      <div
                        className="prose max-w-none mb-6"
                        dangerouslySetInnerHTML={{ __html: question.variation.content }}
                      />

                      {/* Alternatives */}
                      <div className="space-y-3 mb-6">
                        {question.variation.alternatives
                          .sort((a, b) => a.order - b.order)
                          .map((alt, altIndex) => {
                            const letter = String.fromCharCode(65 + altIndex);
                            const isCorrect = alt.isCorrect;
                            const wasSelected = answer?.selectedAnswer === letter;

                            return (
                              <div
                                key={alt.id}
                                className={`p-4 rounded-lg border-2 ${
                                  isCorrect
                                    ? 'border-green-500 bg-green-50'
                                    : wasSelected
                                    ? 'border-red-500 bg-red-50'
                                    : 'border-gray-300 bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start">
                                  <div
                                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${
                                      isCorrect
                                        ? 'bg-green-500 text-white'
                                        : wasSelected
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-300 text-gray-700'
                                    }`}
                                  >
                                    {letter}
                                  </div>
                                  <div className="flex-1">
                                    <div className="mb-2">{alt.text}</div>
                                    {isCorrect && (
                                      <div className="text-sm text-green-700 font-semibold">
                                        ✓ Respuesta correcta
                                      </div>
                                    )}
                                    {wasSelected && !isCorrect && (
                                      <div className="text-sm text-red-700 font-semibold">
                                        ✗ Tu respuesta (incorrecta)
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {/* Explanations */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-3">📖 Explicaciones:</h4>
                        
                        {question.variation.alternatives
                          .sort((a, b) => a.order - b.order)
                          .map((alt, altIndex) => {
                            if (!alt.explanation) return null;
                            const letter = String.fromCharCode(65 + altIndex);
                            return (
                              <div key={alt.id} className="mb-3 last:mb-0">
                                <div className="font-semibold text-blue-900 mb-1">
                                  {letter}. {alt.isCorrect && '(Correcta)'}
                                </div>
                                <div className="text-blue-800 text-sm">{alt.explanation}</div>
                              </div>
                            );
                          })}

                        {question.variation.explanation && (
                          <div className="mt-4 pt-4 border-t border-blue-300">
                            <div className="font-semibold text-blue-900 mb-2">
                              Explicación general:
                            </div>
                            <div
                              className="text-blue-800 text-sm"
                              dangerouslySetInnerHTML={{ __html: question.variation.explanation }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

