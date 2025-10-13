import React from 'react';
import { MockExam } from '../../services/mock-exam.service';

interface MockExamResultsProps {
  mockExam: MockExam;
  onClose: () => void;
}

export const MockExamResults: React.FC<MockExamResultsProps> = ({ mockExam: exam, onClose }) => {
  const correctAnswers = exam.correctAnswers || 0;
  const totalQuestions = exam.totalQuestions;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const timeSpent = exam.timeSpentSecs || 0;
  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;

  // Determinar color según el porcentaje
  const getScoreColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600 bg-green-50';
    if (pct >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Crear un mapa de respuestas del usuario
  const answerMap = new Map(
    exam.answers.map((ans) => [ans.variationId, ans])
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header con resultados */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          📊 Resultados de tu Ensayo EUNACOM
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Puntaje */}
          <div className={`rounded-lg p-6 ${getScoreColor(percentage)}`}>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{percentage}%</div>
              <div className="text-sm font-medium">Puntaje Final</div>
            </div>
          </div>

          {/* Respuestas correctas */}
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {correctAnswers}/{totalQuestions}
              </div>
              <div className="text-sm font-medium text-blue-900">Respuestas Correctas</div>
            </div>
          </div>

          {/* Tiempo */}
          <div className="bg-purple-50 rounded-lg p-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-sm font-medium text-purple-900">Tiempo Total</div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>

      {/* Revisión detallada de preguntas */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          📝 Revisión Detallada
        </h3>

        <div className="space-y-6">
          {exam.questions.map((question, index) => {
            const userAnswer = answerMap.get(question.variationId);
            const correctAlt = question.variation.alternatives.find((alt) => alt.isCorrect);
            const isCorrect = userAnswer?.isCorrect || false;

            return (
              <div
                key={question.id}
                className={`border-2 rounded-lg p-6 ${
                  isCorrect
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
                }`}
              >
                {/* Número de pregunta y estado */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-gray-900">
                      Pregunta {index + 1}
                    </div>
                    {question.variation.displayCode && (
                      <>
                        <div className="text-sm text-gray-500">
                          Ejercicio {question.variation.displayCode}
                        </div>
                        <div className="text-xs text-gray-400">
                          {question.variation.version || 0}
                        </div>
                      </>
                    )}
                  </div>
                  <div
                    className={`px-4 py-2 rounded-full font-semibold ${
                      isCorrect
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {isCorrect ? '✓ Correcta' : '✗ Incorrecta'}
                  </div>
                </div>

                {/* Enunciado */}
                <div
                  className="prose max-w-none mb-4"
                  dangerouslySetInnerHTML={{ __html: question.variation.content }}
                />

                {/* Alternativas */}
                <div className="space-y-3">
                  {question.variation.alternatives
                    .sort((a, b) => a.order - b.order)
                    .map((alt, altIndex) => {
                      const letter = String.fromCharCode(65 + altIndex);
                      const isUserAnswer = userAnswer?.selectedAnswer === letter || 
                                          userAnswer?.selectedAnswer === alt.text;
                      const isCorrectAnswer = alt.isCorrect;

                      let bgColor = 'bg-white';
                      let borderColor = 'border-gray-300';
                      let textColor = 'text-gray-900';

                      if (isCorrectAnswer) {
                        bgColor = 'bg-green-100';
                        borderColor = 'border-green-500';
                        textColor = 'text-green-900';
                      } else if (isUserAnswer && !isCorrect) {
                        bgColor = 'bg-red-100';
                        borderColor = 'border-red-500';
                        textColor = 'text-red-900';
                      }

                      return (
                        <div key={alt.id}>
                          <div
                            className={`p-4 rounded-lg border-2 ${bgColor} ${borderColor}`}
                          >
                            <div className="flex items-start">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${
                                isCorrectAnswer
                                  ? 'bg-green-600 text-white'
                                  : isUserAnswer
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-200 text-gray-700'
                              }`}>
                                {letter}
                              </div>
                              <div className="flex-1">
                                <div className={`font-medium ${textColor}`}>
                                  {alt.text}
                                  {isCorrectAnswer && (
                                    <span className="ml-2 text-green-600 font-bold">✓ Correcta</span>
                                  )}
                                  {isUserAnswer && !isCorrect && (
                                    <span className="ml-2 text-red-600 font-bold">Tu respuesta</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Explicación */}
                          {alt.explanation && (isCorrectAnswer || isUserAnswer) && (
                            <div className="mt-2 ml-11 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="text-sm font-semibold text-gray-700 mb-1">
                                💡 Explicación:
                              </div>
                              <div className="text-sm text-gray-700">
                                {alt.explanation}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Explicación general si existe */}
                {question.variation.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-semibold text-blue-900 mb-2">
                      📚 Explicación General:
                    </div>
                    <div className="text-sm text-blue-900">
                      {question.variation.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón final para volver */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={onClose}
          className="px-8 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
        >
          ← Volver al Dashboard
        </button>
      </div>
    </div>
  );
};

