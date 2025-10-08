import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card';
import { useRandomQuestion, useRandomQuestionWithCredits, useSubmitAnswer, useSpecialties } from '../../hooks/useQuiz';
import { useAuth } from '../../contexts/AuthContext';
import {
  PlayIcon,
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

const NUMERIC_ID_REGEX = /^\d+(?:\.\d+)?$/;

const getQuestionDisplayId = (question: any): string => {
  if (!question) return '';

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

interface QuickPracticeProps {
  onClose?: () => void;
  requireSpecialty?: boolean;
  defaultSpecialty?: string;
  title?: string;
  maxQuestions?: number;
}

export const QuickPractice: React.FC<QuickPracticeProps> = ({
  onClose,
  requireSpecialty = false,
  defaultSpecialty,
  title = 'Práctica Rápida',
  maxQuestions,
}) => {
  const { state } = useAuth();
  const { user } = state;

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(() => {
    if (defaultSpecialty) return defaultSpecialty;
    return requireSpecialty ? '' : 'all';
  });
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'all'>('all');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [questionsServed, setQuestionsServed] = useState(0);
  const [sessionFinished, setSessionFinished] = useState(false);

  const { data: specialties } = useSpecialties();
  const specialtyQueryValue =
    selectedSpecialty === 'all' || selectedSpecialty === ''
      ? undefined
      : selectedSpecialty;
  // Use the hook that handles credits and questions
  const randomQuestionWithCredits = useRandomQuestionWithCredits();

  // Extract question data from the credits hook
  const question = randomQuestionWithCredits.data?.question;
  const isLoadingQuestion = randomQuestionWithCredits.isLoading;
  const questionError = randomQuestionWithCredits.error;

  // Debug logs for question state changes
  React.useEffect(() => {
    console.log('QuickPractice - Question state changed:', {
      question: !!question,
      isLoadingQuestion,
      questionError,
      questionsServed,
      sessionFinished
    });
  }, [question, isLoadingQuestion, questionError, questionsServed, sessionFinished]);

  const {
    mutate: submitAnswer,
    data: result,
    isLoading: isSubmitting,
    error: submitError
  } = useSubmitAnswer();

  // Load first question when ready
  useEffect(() => {
    console.log('QuickPractice - Load question effect:', {
      isLoadingQuestion,
      hasQuestion: !!question,
      requireSpecialty,
      selectedSpecialty,
      questionsServed
    });

    if (isLoadingQuestion || question) {
      console.log('QuickPractice - Already loading or has question, skipping');
      return;
    }

    if (requireSpecialty && !selectedSpecialty) {
      console.log('QuickPractice - Requires specialty but none selected');
      return;
    }

    console.log('QuickPractice - Loading first question...');
    // Load first question automatically
    void handleGetNewQuestion();
  }, [isLoadingQuestion, question, requireSpecialty, selectedSpecialty, questionsServed]);

  useEffect(() => {
    if (!maxQuestions) return;
    if (questionsServed >= maxQuestions && hasAnswered) {
      setSessionFinished(true);
    }
  }, [maxQuestions, questionsServed, hasAnswered]);

  const handleGetNewQuestion = async (options?: { bypassLimit?: boolean }) => {
    const bypassLimit = options?.bypassLimit ?? false;

    console.log('QuickPractice - handleGetNewQuestion called:', {
      bypassLimit,
      maxQuestions,
      questionsServed,
      requireSpecialty,
      selectedSpecialty,
      specialtyQueryValue
    });

    if (!bypassLimit && maxQuestions && questionsServed >= maxQuestions) {
      console.log('QuickPractice - Session finished, max questions reached');
      setSessionFinished(true);
      return;
    }

    if (requireSpecialty && !selectedSpecialty) {
      console.log('QuickPractice - Requires specialty but none selected');
      return;
    }

    setSelectedOption('');
    setHasAnswered(false);
    setShowResult(false);
    setStartTime(null);

    try {
      console.log('QuickPractice - Calling randomQuestionWithCredits.mutateAsync');
      // Use the new hook that handles credits
      const result = await randomQuestionWithCredits.mutateAsync({
        specialty: specialtyQueryValue,
        difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty
      });

      console.log('QuickPractice - Got result:', result);

      if (result.question) {
        console.log('QuickPractice - Question loaded successfully');
        setSessionFinished(false);
        setQuestionsServed((prev) => {
          const next = prev + 1;
          return maxQuestions ? Math.min(next, maxQuestions) : next;
        });
        setStartTime(new Date());
      } else {
        console.log('QuickPractice - No question in result');
      }
    } catch (error) {
      console.error('QuickPractice - Error fetching new question:', error);
    }
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

  const resolvedCorrectOptionId = result?.correctOptionId || question?.options.find(opt => opt.isCorrect)?.id || null;
  const resolvedSelectedOptionId = result?.selectedOptionId || selectedOption || null;
  const questionDisplayId = question ? getQuestionDisplayId(question) : '';
  const currentQuestionNumber = maxQuestions
    ? Math.min(
        question ? questionsServed || 1 : questionsServed + 1,
        maxQuestions
      )
    : undefined;

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
            {title}
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
              {title}
            </CardTitle>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-200"
              >
                ← Volver al Dashboard
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                {!requireSpecialty && (
                  <option value="all">Todas las especialidades</option>
                )}
                {requireSpecialty && (
                  <option value="" disabled hidden>
                    Selecciona una especialidad
                  </option>
                )}
                {specialties?.map((specialty) => (
                  <option key={specialty.id} value={specialty.name}>
                    {specialty.name}
                  </option>
                ))}
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

          {requireSpecialty && !selectedSpecialty && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-md text-sm text-indigo-700">
              Selecciona una especialidad para comenzar a practicar.
            </div>
          )}

          <button
            onClick={() => void handleGetNewQuestion()}
            disabled={
              randomQuestionWithCredits.isLoading ||
              isSubmitting ||
              (requireSpecialty && !selectedSpecialty) ||
              (maxQuestions ? sessionFinished : false)
            }
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-4 w-4 ${randomQuestionWithCredits.isLoading ? 'animate-spin' : ''}`} />
            {randomQuestionWithCredits.isLoading ? 'Cargando pregunta...' : 'Nueva Pregunta'}
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
                  {questionDisplayId && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      ID {questionDisplayId}
                    </span>
                  )}
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
            {maxQuestions && (
              <div className="mt-3 text-sm text-gray-500">
                {sessionFinished
                  ? `Sesión completada (${maxQuestions} preguntas).`
                  : `Pregunta ${currentQuestionNumber ?? 0} de ${maxQuestions}`}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {question.options.map((option) => {
                const isSelected = resolvedSelectedOptionId === option.id;
                const isCorrectOption = resolvedCorrectOptionId ? option.id === resolvedCorrectOptionId : option.isCorrect;
                const isWrong = hasAnswered && isSelected && !result?.isCorrect;

                let buttonClass = "w-full p-4 text-left border rounded-lg transition-colors ";

                if (hasAnswered) {
                  if (isCorrectOption) {
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
                  <div key={option.id} className="space-y-2">
                    <button
                      onClick={() => handleOptionSelect(option.id)}
                      disabled={hasAnswered}
                      className={buttonClass}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option.text}</span>
                        {hasAnswered && isCorrectOption && (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        )}
                        {hasAnswered && isWrong && (
                          <XCircleIcon className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </button>
                    {hasAnswered && isCorrectOption && (option.explanation || result?.correctAnswerExplanation) && (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                        {option.explanation ?? result?.correctAnswerExplanation}
                      </div>
                    )}
                    {hasAnswered && !result?.isCorrect && isWrong && (option.explanation || result?.selectedAnswerExplanation) && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {option.explanation ?? result?.selectedAnswerExplanation}
                      </div>
                    )}
                  </div>
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
                  onClick={() => void handleGetNewQuestion()}
                  disabled={maxQuestions ? sessionFinished : false}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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

      {sessionFinished && maxQuestions && (
        <Card>
          <CardContent className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              🎉 ¡Completaste la sesión de {maxQuestions} preguntas!
            </h3>
            <p className="text-sm text-gray-600">
              Puedes revisar tus respuestas o iniciar una nueva sesión cuando quieras.
            </p>
            <div className="flex justify-center flex-wrap gap-3">
              <button
                onClick={() => {
                  setQuestionsServed(0);
                  setSessionFinished(false);
                  setSelectedOption('');
                  setHasAnswered(false);
                  setShowResult(false);
                  setStartTime(null);
                  if (requireSpecialty) {
                    setSelectedSpecialty(defaultSpecialty ?? '');
                  } else {
                    setSelectedSpecialty('all');
                  }
                  void handleGetNewQuestion({ bypassLimit: true });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                🔁 Reiniciar sesión
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-200"
                >
                  Volver al dashboard
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
