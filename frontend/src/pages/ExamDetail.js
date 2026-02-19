import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExam, createAttempt } from '../api';
import { Header } from '../components/Header';
import { Clock, BookOpen, PlayCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ExamDetail() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadExam();
  }, [examId]);

  const loadExam = async () => {
    try {
      const response = await getExam(examId);
      setExam(response.data);
    } catch (error) {
      toast.error('Erro ao carregar simulado');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const response = await createAttempt({ exam_id: examId });
      navigate(`/simulation/${response.data.id}`);
    } catch (error) {
      toast.error('Erro ao iniciar simulado');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2" data-testid="exam-title">
              {exam.title}
            </h1>
            <p className="text-lg text-slate-600">{exam.banca} - {exam.year}</p>
          </div>

          {/* Exam Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm text-slate-600">Duração</p>
              <p className="text-lg font-bold text-slate-900">{exam.duration_minutes} min</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <BookOpen className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm text-slate-600">Questões</p>
              <p className="text-lg font-bold text-slate-900">{exam.question_count}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <AlertCircle className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm text-slate-600">Áreas</p>
              <p className="text-lg font-bold text-slate-900">{exam.areas.length}</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-slate-900 mb-2">Instruções:</h3>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{exam.instructions}</p>
          </div>

          {/* Areas */}
          <div className="mb-8">
            <h3 className="font-semibold text-slate-900 mb-3">Áreas do Conhecimento:</h3>
            <div className="flex flex-wrap gap-2">
              {exam.areas.map((area, index) => (
                <span 
                  key={index}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-medium"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full btn-primary flex items-center justify-center gap-3 text-lg py-4 disabled:opacity-50"
            data-testid="start-simulation-button"
          >
            <PlayCircle className="w-6 h-6" />
            {starting ? 'Iniciando...' : 'Iniciar Simulado Agora'}
          </button>

          <p className="text-center text-sm text-slate-500 mt-4">
            O cronômetro começará assim que você iniciar
          </p>
        </div>
      </main>
    </div>
  );
}