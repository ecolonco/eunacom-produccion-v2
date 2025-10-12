import React, { useState, useEffect } from 'react';
import { controlService, Control, ControlQuestion } from '../../services/control.service';

interface ControlSessionProps {
  controlId: string;
  onComplete: (control: Control) => void;
  onCancel: () => void;
}

export const ControlSession: React.FC<ControlSessionProps> = ({
  controlId,
  onComplete,
  onCancel,
}) => {
  const [control, setControl] = useState<Control | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    loadControl();
  }, [controlId]);

  const loadControl = async () => {
    try {
      const data = await controlService.getControl(controlId);
      setControl(data);
      
      // Cargar respuestas previas si existen
      if (data.answers && data.answers.length > 0) {
        const answersMap: Record<string, string> = {};
        data.answers.forEach((answer) => {
          answersMap[answer.variationId] = answer.selectedAnswer;
        });
        setSelectedAnswers(answersMap);
      }
    } catch (error) {
      console.error('Error loading control:', error);
      alert('Error al cargar el control');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = async (answer: string) => {
    if (!control || !control.questions) return;

    const currentQuestion = control.questions[currentQuestionIndex];
    
    // Actualizar estado local
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.variationId]: answer,
    }));

    // Guardar en backend
    try {
      await controlService.submitAnswer(
        controlId,
        currentQuestion.variationId,
        answer
      );
    } catch (error) {
      console.error('Error submitting answer:', error);
      // No mostramos alert para no interrumpir el flujo
    }
  };

  const handleNext = () => {
    if (!control || !control.questions) return;
    if (currentQuestionIndex < control.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleComplete = async () => {
    if (!control || !control.questions) return;

    const answeredCount = Object.keys(selectedAnswers).length;
    const totalQuestions = control.questions.length;

    if (answeredCount < totalQuestions) {
      const unanswered = totalQuestions - answeredCount;
      if (!confirm(`Tienes ${unanswered} pregunta(s) sin responder. ¿Deseas finalizar de todos modos?`)) {
        return;
      }
    }

    if (!confirm('¿Estás seguro de que deseas finalizar el control? No podrás modificar tus respuestas después.')) {
      return;
    }

    setSubmitting(true);

    try {
      const results = await controlService.completeControl(controlId);
      onComplete(results);
    } catch (error: any) {
      console.error('Error completing control:', error);
      alert(error.message || 'Error al finalizar el control');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Cargando control...</div>
      </div>
    );
  }

  if (!control || !control.questions || control.questions.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">Error: No se pudo cargar el control</p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Volver
        </button>
      </div>
    );
  }

  const currentQuestion = control.questions[currentQuestionIndex];
  const currentAnswer = selectedAnswers[currentQuestion.variationId];
  const progress = Math.round((currentQuestionIndex / control.questions.length) * 100);
  const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
  const elapsedMinutes = Math.floor(elapsedTime / 60);
  const elapsedSeconds = elapsedTime % 60;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Control - Pregunta {currentQuestionIndex + 1} de {control.questions.length}
            </h2>
            <p className="text-sm text-gray-600">
              Tiempo transcurrido: {elapsedMinutes}:{elapsedSeconds.toString().padStart(2, '0')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Respondidas: {Object.keys(selectedAnswers).length} / {control.questions.length}
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
        {currentQuestion.variation.displayCode && (
          <div className="text-sm text-gray-500 mb-2">
            Ejercicio {currentQuestion.variation.displayCode}
          </div>
        )}
        
        <div
          className="prose max-w-none mb-6"
          dangerouslySetInnerHTML={{ __html: currentQuestion.variation.content }}
        />

        {/* Alternatives */}
        <div className="space-y-3">
          {currentQuestion.variation.alternatives
            .sort((a, b) => a.order - b.order)
            .map((alt, index) => {
              const letter = String.fromCharCode(65 + index); // A, B, C, D
              const isSelected = currentAnswer === letter || currentAnswer === alt.text;

              return (
                <button
                  key={alt.id}
                  onClick={() => handleSelectAnswer(letter)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {letter}
                    </div>
                    <div className="flex-1 pt-1">
                      {alt.text}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className={`px-6 py-3 rounded-lg font-semibold ${
            currentQuestionIndex === 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          ← Anterior
        </button>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400"
          >
            Salir
          </button>

          {currentQuestionIndex === control.questions.length - 1 ? (
            <button
              onClick={handleComplete}
              disabled={submitting}
              className={`px-6 py-3 rounded-lg font-semibold ${
                submitting
                  ? 'bg-green-300 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {submitting ? 'Finalizando...' : '✓ Finalizar Control'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>

      {/* Question navigator */}
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Navegación rápida:</h3>
        <div className="grid grid-cols-10 gap-2">
          {control.questions.map((q, index) => {
            const isAnswered = !!selectedAnswers[q.variationId];
            const isCurrent = index === currentQuestionIndex;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : isAnswered
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

