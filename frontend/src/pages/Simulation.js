import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAttempt, getExamQuestions, getSimulationQuestions, saveAnswer, submitAttempt } from '../api';
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

export default function Simulation() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showNav, setShowNav] = useState(true);

  const handleAutoSubmitRef = useRef(() => {});

  const handleSubmit = useCallback(async () => {
    if (submitting) return;

    const unanswered = questions.filter((q) => !answers[q.id]).length;

    if (unanswered > 0) {
      const confirmed = window.confirm(
        `Você tem ${unanswered} questões não respondidas. Deseja submeter mesmo assim?`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    try {
      await submitAttempt(attemptId);
      toast.success('Simulado concluído!');
      navigate(`/results/${attemptId}`);
    } catch (error) {
      toast.error('Erro ao submeter simulado');
      setSubmitting(false);
    }
  }, [attemptId, answers, navigate, questions, submitting]);

  const handleAutoSubmit = useCallback(async () => {
    toast.info('Tempo esgotado! Submetendo automaticamente...');
    await handleSubmit();
  }, [handleSubmit]);

  useEffect(() => {
    handleAutoSubmitRef.current = handleAutoSubmit;
  }, [handleAutoSubmit]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const attemptRes = await getAttempt(attemptId);
      const attemptData = attemptRes.data;
      
      // Fetch questions based on exam_id or simulation_id
      let questionsRes;
      if (attemptData.exam_id) {
        questionsRes = await getExamQuestions(attemptData.exam_id);
      } else if (attemptData.simulation_id) {
        questionsRes = await getSimulationQuestions(attemptData.simulation_id);
      } else {
        throw new Error('No exam or simulation ID found');
      }

      setAttempt(attemptData);
      setQuestions(questionsRes.data);
      setAnswers(attemptData.answers || {});

      // Use duration_seconds from attempt or default
      const durationSeconds = attemptData.duration_seconds || 3600;
      setTimeLeft(Number(durationSeconds) || 3600);
    } catch (error) {
      toast.error('Erro ao carregar simulado');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [attemptId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoSubmitRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAnswer = async (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    try {
      await saveAnswer(attemptId, {
        question_id: questionId,
        selected_answer: answer,
      });
    } catch (error) {
      toast.error('Erro ao salvar resposta');
    }
  };

  const formatTime = (seconds) => {
    const s = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isTimeLow = timeLeft < 300; // Less than 5 minutes

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isMarked = marked[currentQuestion?.id];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header with Progress */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50" data-testid="simulation-header">
        {/* Progress Bar */}
        <div className="h-1 bg-slate-100">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-bold text-slate-900 line-clamp-1" data-testid="exam-title-header">
                  {attempt?.exam_title}
                </h2>
                <p className="text-xs text-slate-500">
                  {attempt?.mode === 'official' ? 'Simulado Oficial' : 'Simulado Personalizado'}
                </p>
              </div>
              <button
                onClick={() => setShowNav(!showNav)}
                className="md:hidden text-primary font-medium text-sm"
                data-testid="toggle-nav-button"
              >
                {showNav ? 'Ocultar' : 'Mostrar'} Nav
              </button>
            </div>

            <div className="flex items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-slate-700" data-testid="answered-count">
                  {answeredCount}/{questions.length}
                </span>
              </div>

              <div className={`exam-timer ${isTimeLow ? 'bg-red-50 text-red-700 animate-pulse' : ''}`} data-testid="timer">
                {isTimeLow && <AlertTriangle className="w-4 h-4 inline mr-1" />}
                <Clock className="w-4 h-4 inline mr-2" />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex max-w-7xl mx-auto">
        {/* Question Navigation Sidebar */}
        {showNav && (
          <div className="w-64 bg-white border-r border-slate-200 p-4 sticky top-[89px] h-[calc(100vh-89px)] overflow-y-auto hidden md:block" data-testid="question-nav">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Questões</h3>
              <span className="text-xs text-slate-500">
                {Object.keys(marked).filter(k => marked[k]).length} marcadas
              </span>
            </div>
            
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, index) => {
                const answered = answers[q.id];
                const isMarkedQ = marked[q.id];
                const isCurrent = index === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`question-number ${
                      isCurrent ? 'current' : answered ? 'answered' : isMarkedQ ? 'marked' : 'bg-slate-100 text-slate-600'
                    }`}
                    data-testid={`question-nav-${index + 1}`}
                    title={isMarkedQ ? 'Marcada para revisão' : answered ? 'Respondida' : 'Não respondida'}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">Legenda:</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-primary"></div>
                  <span className="text-slate-600">Atual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-secondary"></div>
                  <span className="text-slate-600">Respondida</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                  <span className="text-slate-600">Marcada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-slate-200"></div>
                  <span className="text-slate-600">Não respondida</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8 lg:p-12">
          <div className="max-w-3xl mx-auto">
            {/* Question Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-500">
                    Questão {currentIndex + 1} de {questions.length}
                  </span>
                  {currentQuestion?.difficulty && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700'
                      : currentQuestion.difficulty === 'medium' ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                    }`}>
                      {currentQuestion.difficulty === 'easy' ? 'Fácil' 
                       : currentQuestion.difficulty === 'medium' ? 'Médio' 
                       : 'Difícil'}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900" data-testid="question-number">
                  {currentQuestion?.subject || currentQuestion?.area || 'Questão'}
                </h3>
              </div>

              <button
                onClick={() => setMarked({ ...marked, [currentQuestion.id]: !isMarked })}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isMarked ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                data-testid="mark-for-review-button"
              >
                <Flag className={`w-4 h-4 ${isMarked ? 'fill-current' : ''}`} />
                {isMarked ? 'Marcada' : 'Marcar para revisar'}
              </button>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-xl border border-slate-100 p-6 md:p-8 mb-6 shadow-sm">
              <div className="text-lg leading-relaxed text-slate-900 mb-6" data-testid="question-statement">
                {currentQuestion?.statement}
              </div>

              {currentQuestion?.image_url && (
                <img
                  src={currentQuestion.image_url}
                  alt="Question"
                  className="max-w-full h-auto rounded-lg mb-6 border border-slate-200"
                  data-testid="question-image"
                />
              )}

              <div className="space-y-3" data-testid="alternatives-list">
                {currentQuestion?.alternatives?.map((alt) => (
                  <div
                    key={alt.letter}
                    onClick={() => handleAnswer(currentQuestion.id, alt.letter)}
                    className={`option-row ${answers[currentQuestion.id] === alt.letter ? 'selected' : ''}`}
                    data-testid={`option-${alt.letter}`}
                  >
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                      answers[currentQuestion.id] === alt.letter 
                        ? 'bg-primary text-white' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {alt.letter}
                    </div>
                    <div className="flex-1 text-slate-700">{alt.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="previous-button"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              {/* Mobile Navigation */}
              <div className="flex md:hidden items-center gap-1">
                {questions.slice(
                  Math.max(0, currentIndex - 2),
                  Math.min(questions.length, currentIndex + 3)
                ).map((q, idx) => {
                  const actualIndex = Math.max(0, currentIndex - 2) + idx;
                  const answered = answers[q.id];
                  const isCurrent = actualIndex === currentIndex;
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(actualIndex)}
                      className={`w-8 h-8 rounded-full text-xs font-medium ${
                        isCurrent ? 'bg-primary text-white' 
                        : answered ? 'bg-secondary text-white' 
                        : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {actualIndex + 1}
                    </button>
                  );
                })}
              </div>

              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary flex items-center gap-2 bg-success hover:bg-green-700 disabled:opacity-50"
                  data-testid="submit-exam-button"
                >
                  <Send className="w-5 h-5" />
                  {submitting ? 'Submetendo...' : 'Finalizar'}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="btn-primary flex items-center gap-2"
                  data-testid="next-button"
                >
                  <span className="hidden sm:inline">Próxima</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Quick Submit (not on last question) */}
            {currentIndex !== questions.length - 1 && answeredCount === questions.length && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="text-success hover:underline font-medium text-sm"
                  data-testid="quick-submit-button"
                >
                  Todas respondidas! Clique para finalizar agora
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
