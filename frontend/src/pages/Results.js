import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAttempt, getAttemptReview } from '../api';
import { Header } from '../components/Header';
import { AdPlaceholder } from '../components/AdPlaceholder';
import { 
  Award, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Home, 
  RefreshCw,
  BookOpen,
  Target,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

export default function Results() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [reviewItems, setReviewItems] = useState([]);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    try {
      const attemptRes = await getAttempt(attemptId);
      const attemptData = attemptRes.data;

      // Fetch review items (includes correct answers) for the attempt owner
      const reviewRes = await getAttemptReview(attemptId);
      const items = reviewRes?.data?.items || [];

      setAttempt(attemptData);
      setReviewItems(items);
      // Keep a plain questions array for any legacy UI parts that expect it
      setQuestions(items.map((it) => it.question));
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

  const score = attempt.score || {};
  const percentage = score.percentage || 0;
  
  // Determine performance level
  const getPerformanceLevel = (pct) => {
    if (pct >= 80) return { label: 'Excelente!', color: 'text-success', bg: 'bg-green-50', icon: Award };
    if (pct >= 60) return { label: 'Bom trabalho!', color: 'text-primary', bg: 'bg-blue-50', icon: TrendingUp };
    if (pct >= 40) return { label: 'Continue praticando!', color: 'text-amber-600', bg: 'bg-amber-50', icon: Target };
    return { label: 'Não desista!', color: 'text-red-600', bg: 'bg-red-50', icon: Lightbulb };
  };

  const performance = getPerformanceLevel(percentage);
  const PerformanceIcon = performance.icon;

  // Get areas/subjects to display
  const areasData = score.by_area || score.by_subject || {};

  // Color mapping for areas
  const areaColors = {
    'Linguagens': { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
    'Humanas': { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
    'Natureza': { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
    'Matemática': { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500' },
    'default': { bg: 'bg-slate-50', text: 'text-slate-700', bar: 'bg-slate-500' }
  };

  const getAreaColor = (area) => areaColors[area] || areaColors.default;

  // Find worst performing areas for recommendations
  const sortedAreas = Object.entries(areasData)
    .sort((a, b) => (a[1].percentage || 0) - (b[1].percentage || 0));
  const weakAreas = sortedAreas.slice(0, 2).filter(([_, data]) => data.percentage < 70);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 ${performance.bg} rounded-full mb-4`}>
            <PerformanceIcon className={`w-10 h-10 ${performance.color}`} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2" data-testid="results-heading">
            Resultado do Simulado
          </h1>
          <p className="text-lg text-slate-600">{attempt.exam_title}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
            attempt.mode === 'official' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {attempt.mode === 'official' ? 'Simulado Oficial' : 'Simulado Personalizado'}
          </span>
        </div>

        {/* Overall Score - Hero Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8 mb-8" data-testid="score-card">
          <div className="text-center mb-6">
            <div className={`text-7xl font-bold ${performance.color} mb-2`} data-testid="total-score">
              {percentage}%
            </div>
            <p className="text-lg text-slate-600 mb-4">
              {score.total_correct || 0} de {score.total_questions || 0} questões corretas
            </p>
            
            {/* Score Progress */}
            <div className="max-w-md mx-auto">
              <Progress value={percentage} className="h-3" />
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-semibold ${performance.bg} ${performance.color} mx-auto`}>
            {percentage >= 60 ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <XCircle className="w-6 h-6" />
            )}
            {performance.label}
          </div>
        </div>

        {/* Ad Placeholder */}
        <div className="mb-8">
          <AdPlaceholder position="banner" />
        </div>

        {/* By Area/Subject Breakdown */}
        {Object.keys(areasData).length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 md:p-8 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2" data-testid="area-breakdown-heading">
              <BookOpen className="w-5 h-5 text-primary" />
              Desempenho por Área
            </h2>
            
            <div className="space-y-4">
              {Object.entries(areasData).map(([area, data]) => {
                const colors = getAreaColor(area);
                const pct = data.percentage || 0;
                
                return (
                  <div key={area} className="border border-slate-100 rounded-lg p-4" data-testid={`area-${area}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-slate-900">{area}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${colors.bg} ${colors.text}`}>
                        {pct}%
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <div className="flex justify-between text-sm text-slate-600 mb-1">
                        <span>{data.correct || 0} de {data.total || 0} corretas</span>
                        <span className={pct >= 70 ? 'text-success' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}>
                          {pct >= 70 ? 'Ótimo' : pct >= 50 ? 'Regular' : 'Precisa melhorar'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full ${colors.bar} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Review */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8" data-testid="review-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Revisão das Questões
              </h3>
              <p className="text-sm text-slate-600">
                Veja o que você marcou e qual era o gabarito.
              </p>
            </div>
          </div>

          {reviewItems.length === 0 ? (
            <div className="text-sm text-slate-600">
              Nenhuma questão disponível para revisão ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {reviewItems.map((item, idx) => {
                const q = item.question || {};
                const selected = item.selected_answer;
                const correct = item.correct_answer;
                const isCorrect = item.is_correct;

                const isOpen = expandedQuestionId === q.id;

                return (
                  <div key={q.id || idx} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedQuestionId(isOpen ? null : q.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-2 text-sm font-semibold ${
                          isCorrect ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          Questão {idx + 1}
                        </span>
                        <span className="text-xs text-slate-600">
                          {q.subject ? q.subject : (q.area ? q.area : '—')}
                          {q.difficulty ? ` • ${q.difficulty}` : ''}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600">
                        <span className="mr-3">Marcada: <strong>{selected || '—'}</strong></span>
                        <span>Gabarito: <strong>{correct || '—'}</strong></span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 py-4 bg-white">
                        <div className="text-sm text-slate-900 whitespace-pre-wrap mb-4">
                          {q.statement}
                        </div>

                        <div className="space-y-2">
                          {(q.alternatives || []).map((alt) => {
                            const isSel = alt.letter === selected;
                            const isRight = alt.letter === correct;

                            let cls = "border border-slate-200";
                            if (isRight) cls = "border border-green-400 bg-green-50";
                            else if (isSel && !isCorrect) cls = "border border-red-400 bg-red-50";

                            return (
                              <div key={alt.letter} className={`rounded-md p-3 text-sm ${cls}`}>
                                <span className="font-semibold mr-2">{alt.letter})</span>
                                <span className="text-slate-800">{alt.text}</span>
                                {isRight && <span className="ml-2 text-xs font-semibold text-green-700">Correta</span>}
                                {isSel && !isCorrect && <span className="ml-2 text-xs font-semibold text-red-700">Sua resposta</span>}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 text-xs text-slate-600">
                          Em breve: explicações por questão (resolução) aqui.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recommendations */}
        {weakAreas.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 mb-8" data-testid="recommendations-card">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Lightbulb className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Recomendações de Estudo</h3>
                <p className="text-slate-700 mb-3">
                  Com base no seu desempenho, sugerimos focar nas seguintes áreas:
                </p>
                <ul className="space-y-2">
                  {weakAreas.map(([area, data]) => (
                    <li key={area} className="flex items-center gap-2 text-slate-700">
                      <Target className="w-4 h-4 text-amber-600" />
                      <span><strong>{area}</strong> ({data.percentage}%) - {data.correct}/{data.total} acertos</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Time Info */}
        {attempt.start_time && attempt.end_time && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-8">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-slate-500 mb-1">Início</p>
                <p className="font-semibold text-slate-900">
                  {new Date(attempt.start_time).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Término</p>
                <p className="font-semibold text-slate-900">
                  {new Date(attempt.end_time).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary flex items-center justify-center gap-2"
            data-testid="back-to-dashboard"
          >
            <Home className="w-5 h-5" />
            Voltar ao Início
          </button>
          
          {attempt.mode === 'generated' && attempt.simulation_id && (
            <button
              onClick={() => navigate('/simulations/my')}
              className="btn-secondary flex items-center justify-center gap-2"
              data-testid="view-simulations"
            >
              <RefreshCw className="w-5 h-5" />
              Meus Simulados
            </button>
          )}
          
          <button
            onClick={() => navigate('/simulations/create')}
            className="btn-primary flex items-center justify-center gap-2"
            data-testid="create-new-simulation"
          >
            <Target className="w-5 h-5" />
            Criar Novo Simulado
          </button>
        </div>
      </main>
    </div>
  );
}
