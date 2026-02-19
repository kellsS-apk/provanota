import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAttempt, getExamQuestions } from '../api';
import { Header } from '../components/Header';
import { AdPlaceholder } from '../components/AdPlaceholder';
import { Award, TrendingUp, CheckCircle, XCircle, Home } from 'lucide-react';
import { toast } from 'sonner';

export default function Results() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    try {
      const attemptRes = await getAttempt(attemptId);
      const questionsRes = await getExamQuestions(attemptRes.data.exam_id);
      
      setAttempt(attemptRes.data);
      setQuestions(questionsRes.data);
    } catch (error) {
      toast.error('Erro ao carregar resultados');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const score = attempt.score;
  const areaColors = {
    'Linguagens': 'bg-blue-100 text-blue-700 border-blue-200',
    'Humanas': 'bg-purple-100 text-purple-700 border-purple-200',
    'Natureza': 'bg-green-100 text-green-700 border-green-200',
    'Matemática': 'bg-orange-100 text-orange-700 border-orange-200'
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-success rounded-full mb-4">
            <Award className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2" data-testid="results-heading">
            Resultado do Simulado
          </h1>
          <p className="text-lg text-slate-600">{attempt.exam_title}</p>
        </div>

        {/* Overall Score */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8 mb-8 text-center">
          <div className="mb-4">
            <div className="text-6xl font-bold text-primary mb-2" data-testid="total-score">
              {score.percentage}%
            </div>
            <p className="text-lg text-slate-600">
              {score.total_correct} de {score.total_questions} questões corretas
            </p>
          </div>

          <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-semibold ${
            score.percentage >= 70 ? 'bg-green-50 text-success' : score.percentage >= 50 ? 'bg-amber-50 text-accent' : 'bg-red-50 text-red-600'
          }`}>
            {score.percentage >= 70 ? (
              <>
                <CheckCircle className="w-6 h-6" />
                Ótimo desempenho!
              </>
            ) : score.percentage >= 50 ? (
              <>
                <TrendingUp className="w-6 h-6" />
                Bom trabalho!
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6" />
                Continue praticando!
              </>
            )}
          </div>
        </div>

        {/* Ad Placeholder */}
        <div className="mb-8">
          <AdPlaceholder position="banner" />
        </div>

        {/* By Area Breakdown */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6" data-testid="area-breakdown-heading">
            Desempenho por Área
          </h2>
          
          <div className="space-y-4">
            {Object.entries(score.by_area || {}).map(([area, data]) => (
              <div key={area} className="border border-slate-100 rounded-lg p-4" data-testid={`area-${area}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-900">{area}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${areaColors[area] || 'bg-slate-100 text-slate-700'}`}>
                    {data.percentage}%
                  </span>
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-slate-600 mb-1">
                    <span>{data.correct} de {data.total} corretas</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${data.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary flex items-center justify-center gap-2"
            data-testid="back-to-dashboard"
          >
            <Home className="w-5 h-5" />
            Voltar ao Início
          </button>
        </div>
      </main>
    </div>
  );
}