import React, { useState, useEffect } from 'react';
import { examService, Exam, ExamQuestion } from '../../services/exam.service';

interface ExamSessionProps {
  examId: string;
  onComplete: (exam: Exam) => void;
  onCancel: () => void;
}

export const ExamSession: React.FC<ExamSessionProps> = ({
  examId,
  onComplete,
  onCancel,
}) => {
  const [exam, setExam] = useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    loadExam();
  }, [examId]);

  const loadExam = async () => {
    try {
      const data = await examService.getExam(examId);
      setExam(data);
      
      // Cargar respuestas previas si existen
      if (data.answers && data.answers.length > 0) {
        const answersMap: Record<string, string> = {};
        data.answers.forEach((answer) => {
          answersMap[answer.variationId] = answer.selectedAnswer;
        });
        setSelectedAnswers(answersMap);
      }
    } catch (error) {
      console.error('Error loading exam:', error);
      alert('Error al cargar la prueba');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = async (answer: string) => {
    if (!exam || !exam.questions) return;

    const currentQuestion = exam.questions[currentQuestionIndex];
    
    // Actualizar estado local
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.variationId]: answer,
    }));

    // Guardar en backend
    try {
      await examService.submitAnswer(
        examId,
        currentQuestion.variationId,
        answer
      );
    } catch (error) {
      console.error('Error submitting answer:', error);
      // No mostramos alert para no interrumpir el flujo
    }
  };

  const handleNext = () => {
    if (!exam || !exam.questions) return;
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleComplete = async () => {
    console.log('🎯 handleComplete called');
    console.log('Exam:', exam);
    console.log('Selected answers:', selectedAnswers);
    
    if (!exam || !exam.questions) {
      console.error('❌ No exam or questions');
      return;
    }

    const answeredCount = Object.keys(selectedAnswers).length;
    const totalQuestions = exam.questions.length;

    console.log(`📊 Answered: ${answeredCount}/${totalQuestions}`);
    console.log('✅ Starting completion immediately...');
    
    setSubmitting(true);

    try {
      console.log(`🚀 Calling completeExam(${examId})`);
      const results = await examService.completeExam(examId);
      console.log('✅ Results received:', results);
      onComplete(results);
    } catch (error: any) {
      console.error('❌ Error completing exam:', error);
      alert(error.message || 'Error al finalizar la prueba');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Cargando prueba...</div>
      </div>
    );
  }

  if (!exam || !exam.questions || exam.questions.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">Error: No se pudo cargar la prueba</p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Volver
        </button>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const currentAnswer = selectedAnswers[currentQuestion.variationId];
  const progress = Math.round((currentQuestionIndex / exam.questions.length) * 100);
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
              Prueba EUNACOM - Pregunta {currentQuestionIndex + 1} de {exam.questions.length}
            </h2>
            <p className="text-sm text-gray-600">
              Tiempo transcurrido: {elapsedMinutes}:{elapsedSeconds.toString().padStart(2, '0')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Respondidas: {Object.keys(selectedAnswers).length} / {exam.questions.length}
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
      <div className="flex justify-between items-center gap-4 mb-6">
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

          {currentQuestionIndex === exam.questions.length - 1 ? (
            <button
              onClick={handleComplete}
              disabled={submitting}
              className={`px-6 py-3 rounded-lg font-semibold ${
                submitting
                  ? 'bg-green-300 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {submitting ? 'Finalizando...' : '✓ Finalizar Prueba'}
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
    </div>
  );
};

