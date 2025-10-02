import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card';
import { useRandomQuestion, useSubmitAnswer, useSpecialties } from '../../hooks/useQuiz';
import { useAuth } from '../../contexts/AuthContext';
import {
  PlayIcon,
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

interface QuickPracticeProps {
  onClose?: () => void;
}

export const QuickPractice: React.FC<QuickPracticeProps> = ({ onClose }) => {
  const { state } = useAuth();
  const { user } = state;

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'all'>('all');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showResult, setShowResult] = useState(false);

  const { data: specialties } = useSpecialties();
  const {
    data: question,
    refetch: fetchQuestion,
    isLoading: isLoadingQuestion,
    error: questionError
  } = useRandomQuestion(
    selectedSpecialty,
    selectedDifficulty === 'all' ? undefined : selectedDifficulty
  );

  const {
    mutate: submitAnswer,
    data: result,
    isLoading: isSubmitting,
    error: submitError
  } = useSubmitAnswer();

  // Load first question on mount
  useEffect(() => {
    if (!question && !isLoadingQuestion) {
      handleGetNewQuestion();
    }
  }, []);

  const handleGetNewQuestion = () => {
    setSelectedOption('');
    setHasAnswered(false);
    setShowResult(false);
    setStartTime(new Date());
    fetchQuestion();
  };

  const handleOptionSelect = (optionId: string) => {
    if (hasAnswered) return;
    setSelectedOption(optionId);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || !question || !startTime) return;

    const timeSpent = Math.round((Date.now() - startTime.getTime()) / 1000); // seconds

    submitAnswer({
      questionId: question.id,
      selectedOptionId: selectedOption,
      timeSpent
    });

    setHasAnswered(true);
    setShowResult(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'text-green-600 bg-green-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'HARD': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getResultIcon = () => {
    if (!result) return null;
    return result.isCorrect
      ? <CheckCircleIcon className="h-8 w-8 text-green-500" />
      : <XCircleIcon className="h-8 w-8 text-red-500" />;
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600">Debes iniciar sesión para practicar</p>
        </CardContent>
      </Card>
    );
  }

  if (user.credits < 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayIcon className="h-5 w-5 text-blue-500" />
            Práctica Rápida
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-red-600 mb-2">Créditos insuficientes</p>
          <p className="text-sm text-gray-500">
            Necesitas al menos 1 crédito para practicar una pregunta.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <PlayIcon className="h-5 w-5 text-blue-500" />
              Práctica Rápida
            </CardTitle>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Specialty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Especialidad
              </label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                disabled={hasAnswered}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todas las especialidades</option>
                {specialties?.map((specialty) => (
                  <option key={specialty.id} value={specialty.name}>
                    {specialty.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dificultad
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                disabled={hasAnswered}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todas las dificultades</option>
                <option value="EASY">Fácil</option>
                <option value="MEDIUM">Medio</option>
                <option value="HARD">Difícil</option>
              </select>
            </div>

            {/* Credits */}
            <div className="flex items-end">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Créditos disponibles
                </label>
                <div className="p-2 bg-green-50 border border-green-200 rounded-md text-center">
                  <span className="font-bold text-green-700">{user.credits}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleGetNewQuestion}
            disabled={isLoadingQuestion || isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoadingQuestion ? 'animate-spin' : ''}`} />
            {isLoadingQuestion ? 'Cargando pregunta...' : 'Nueva Pregunta'}
          </button>
        </CardContent>
      </Card>

      {/* Question */}
      {questionError && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-red-600">Error al cargar la pregunta</p>
            <p className="text-sm text-gray-500 mt-1">
              {questionError instanceof Error ? questionError.message : 'Error desconocido'}
            </p>
          </CardContent>
        </Card>
      )}

      {question && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpenIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-600">{question.specialty} • {question.topic}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                    {question.difficulty === 'EASY' ? 'Fácil' :
                     question.difficulty === 'MEDIUM' ? 'Medio' : 'Difícil'}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  {question.content}
                </h3>
              </div>
              {startTime && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <ClockIcon className="h-4 w-4" />
                  <span>Costo: 1 crédito</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {question.options.map((option) => {
                const isSelected = selectedOption === option.id;
                const isCorrect = result?.correctAnswer === option.text;
                const isWrong = hasAnswered && isSelected && !result?.isCorrect;

                let buttonClass = "w-full p-4 text-left border rounded-lg transition-colors ";

                if (hasAnswered) {
                  if (isCorrect) {
                    buttonClass += "border-green-500 bg-green-50 text-green-800";
                  } else if (isWrong) {
                    buttonClass += "border-red-500 bg-red-50 text-red-800";
                  } else {
                    buttonClass += "border-gray-200 bg-gray-50 text-gray-600";
                  }
                } else if (isSelected) {
                  buttonClass += "border-blue-500 bg-blue-50 text-blue-800";
                } else {
                  buttonClass += "border-gray-200 hover:border-blue-300 hover:bg-blue-50";
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => handleOptionSelect(option.id)}
                    disabled={hasAnswered}
                    className={buttonClass}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option.text}</span>
                      {hasAnswered && isCorrect && (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      )}
                      {hasAnswered && isWrong && (
                        <XCircleIcon className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {!hasAnswered && selectedOption && (
              <div className="mt-6">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isSubmitting ? 'Enviando...' : 'Responder'}
                </button>
              </div>
            )}

            {/* Result */}
            {showResult && result && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  {getResultIcon()}
                  <div>
                    <h4 className={`font-medium ${result.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                      {result.isCorrect ? '¡Correcto!' : 'Incorrecto'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Créditos restantes: {result.creditsRemaining}
                    </p>
                  </div>
                </div>

                {result.explanation && (
                  <div className="mb-3">
                    <h5 className="font-medium text-gray-700 mb-1">Explicación:</h5>
                    <p className="text-sm text-gray-600">{result.explanation}</p>
                  </div>
                )}

                <button
                  onClick={handleGetNewQuestion}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Siguiente Pregunta
                </button>
              </div>
            )}

            {submitError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">
                  Error al enviar respuesta: {submitError instanceof Error ? submitError.message : 'Error desconocido'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};