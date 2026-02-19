import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAttempt, getExamQuestions, saveAnswer, submitAttempt } from '../api';
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function Simulation() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [attemptId]);

  useEffect(() => {
  if (timeLeft <= 0) return;

  const timer = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        SubmitAttempt();
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, [timeLeft]);

  const loadData = async () => {
    try {
      const [attemptRes, questionsRes] = await Promise.all([
        getAttempt(attemptId),
        getAttempt(attemptId).then(res => getExamQuestions(res.data.exam_id))
      ]);
      
      setAttempt(attemptRes.data);
      setQuestions(questionsRes.data);
      setAnswers(attemptRes.data.answers || {});

      // Calculate time left
      const startTime = new Date(attemptRes.data.start_time);
      const exam = await getAttempt(attemptId);
      const durationMs = exam.data.exam_id ? 0 : 0; // Will be set from exam
      // For now, get from first load - ideally pass duration
      // Setting a default based on typical exam
      setTimeLeft(3600); // Default 60 minutes
    } catch (error) {
      toast.error('Erro ao carregar simulado');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    try {
      await saveAnswer(attemptId, {
        question_id: questionId,
        selected_answer: answer
      });
    } catch (error) {
      toast.error('Erro ao salvar resposta');
    }
  };

  const handleAutoSubmit = async () => {
    toast.info('Tempo esgotado! Submetendo automaticamente...');
    await handleSubmit();
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const unanswered = questions.filter(q => !answers[q.id]).length;
    
    if (unanswered > 0) {
      const confirmed = window.confirm(
        `Voc\u00ea tem ${unanswered} quest\u00f5es n\u00e3o respondidas. Deseja submeter mesmo assim?`
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    try {
      await submitAttempt(attemptId);
      toast.success('Simulado conclu\u00eddo!');
      navigate(`/results/${attemptId}`);
    } catch (error) {
      toast.error('Erro ao submeter simulado');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isAnswered = answers[currentQuestion?.id];
  const isMarked = marked[currentQuestion?.id];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50" data-testid="simulation-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-slate-900" data-testid="exam-title-header">{attempt.exam_title}</h2>
              <button
                onClick={() => setShowNav(!showNav)}
                className="md:hidden text-primary font-medium"
                data-testid="toggle-nav-button"
              >
                {showNav ? 'Ocultar Navega\u00e7\u00e3o' : 'Mostrar Navega\u00e7\u00e3o'}
              </button>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-slate-700" data-testid="answered-count">
                  {answeredCount}/{questions.length}
                </span>
              </div>
              <div className="exam-timer" data-testid="timer">
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
          <div className="w-64 bg-white border-r border-slate-200 p-4 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto" data-testid="question-nav">
            <h3 className="font-semibold text-slate-900 mb-4">Quest\u00f5es</h3>
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
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Question Content */}
        <div className="flex-1 p-6 md:p-12">
          <div className="max-w-3xl mx-auto">
            {/* Question Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-sm text-slate-600">Quest\u00e3o {currentIndex + 1} de {questions.length}</span>
                <h3 className="text-xl font-bold text-slate-900" data-testid="question-number">
                  {currentQuestion?.area}
                </h3>
              </div>
              <button
                onClick={() => setMarked({ ...marked, [currentQuestion.id]: !isMarked })}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isMarked ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                }`}
                data-testid="mark-for-review-button"
              >
                <Flag className="w-4 h-4" />
                {isMarked ? 'Marcada' : 'Marcar'}
              </button>
            </div>

            {/* Question Statement */}
            <div className="bg-white rounded-xl border border-slate-100 p-8 mb-6 shadow-sm">
              <div 
                className="text-lg leading-relaxed text-slate-900 mb-6"
                data-testid="question-statement"
              >
                {currentQuestion?.statement}
              </div>

              {currentQuestion?.image_url && (
                <img 
                  src={currentQuestion.image_url} 
                  alt="Question" 
                  className="max-w-full h-auto rounded-lg mb-6"
                  data-testid="question-image"
                />
              )}

              {/* Alternatives */}
              <div className="space-y-3" data-testid="alternatives-list">
                {currentQuestion?.alternatives.map((alt) => (
                  <div
                    key={alt.letter}
                    onClick={() => handleAnswer(currentQuestion.id, alt.letter)}
                    className={`option-row ${answers[currentQuestion.id] === alt.letter ? 'selected' : ''}`}
                    data-testid={`option-${alt.letter}`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm">
                      {alt.letter}
                    </div>
                    <div className="flex-1 text-slate-700">{alt.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="previous-button"
              >
                <ChevronLeft className="w-5 h-5" />
                Anterior
              </button>

              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary flex items-center gap-2 bg-success hover:bg-green-700 disabled:opacity-50"
                  data-testid="submit-exam-button"
                >
                  <Send className="w-5 h-5" />
                  {submitting ? 'Submetendo...' : 'Finalizar Simulado'}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  className="btn-primary flex items-center gap-2"
                  data-testid="next-button"
                >
                  Pr\u00f3xima
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
