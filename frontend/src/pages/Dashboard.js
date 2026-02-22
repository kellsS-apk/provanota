import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExams, getUserAttempts, getDashboardStats } from '../api';
import { useAuth } from '../AuthContext';
import { Header } from '../components/Header';
import { AdPlaceholder } from '../components/AdPlaceholder';
import { 
  Clock, 
  BookOpen, 
  PlayCircle, 
  TrendingUp, 
  Award, 
  Sparkles,
  ArrowRight,
  Play,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [examsRes, attemptsRes, statsRes] = await Promise.all([
        getExams(),
        getUserAttempts(),
        getDashboardStats().catch(() => ({ data: null }))
      ]);
      setExams(examsRes.data);
      setAttempts(attemptsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (examId) => {
    navigate(`/exam/${examId}`);
  };

  const completedAttempts = attempts.filter(a => a.status === 'completed');
  const inProgressAttempt = attempts.find(a => a.status === 'in_progress');
  const avgScore = completedAttempts.length > 0
    ? (completedAttempts.reduce((sum, a) => sum + (a.score?.percentage || 0), 0) / completedAttempts.length).toFixed(1)
    : 0;
  
  const lastCompletedAttempt = completedAttempts[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2" data-testid="welcome-heading">
            Olá, {user?.name}!
          </h1>
          <p className="text-lg text-slate-600">Pronto para praticar hoje?</p>
        </div>

        {/* In Progress Card */}
        {inProgressAttempt && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6 mb-8" data-testid="in-progress-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Play className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">Simulado em andamento</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{inProgressAttempt.exam_title}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Iniciado em {new Date(inProgressAttempt.start_time).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                onClick={() => navigate(`/simulation/${inProgressAttempt.id}`)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-full flex items-center gap-2 transition-colors shadow-md"
                data-testid="continue-attempt-button"
              >
                <Play className="w-5 h-5" />
                Continuar de onde parou
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm" data-testid="stat-attempts">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-lg">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Realizados</p>
                <p className="text-2xl font-bold text-slate-900">{completedAttempts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm" data-testid="stat-average">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Média Geral</p>
                <p className="text-2xl font-bold text-slate-900">{avgScore}%</p>
              </div>
            </div>
            {completedAttempts.length > 0 && (
              <Progress value={parseFloat(avgScore)} className="mt-3 h-1.5" />
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm" data-testid="stat-available">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-lg">
                <Award className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Disponíveis</p>
                <p className="text-2xl font-bold text-slate-900">{exams.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm" data-testid="stat-simulations">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Personalizados</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.simulations_created || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Last Attempt Summary */}
        {lastCompletedAttempt && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-8" data-testid="last-attempt-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Último simulado</p>
                  <h3 className="text-lg font-semibold text-slate-900">{lastCompletedAttempt.exam_title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-lg font-bold ${
                      lastCompletedAttempt.score?.percentage >= 70 ? 'text-success' 
                      : lastCompletedAttempt.score?.percentage >= 50 ? 'text-amber-500' 
                      : 'text-red-500'
                    }`}>
                      {lastCompletedAttempt.score?.percentage}%
                    </span>
                    <span className="text-sm text-slate-500">
                      {lastCompletedAttempt.score?.total_correct}/{lastCompletedAttempt.score?.total_questions} acertos
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate(`/results/${lastCompletedAttempt.id}`)}
                className="btn-secondary flex items-center gap-2"
                data-testid="view-last-result"
              >
                Ver detalhes
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Create Custom Simulation CTA */}
        <div className="bg-gradient-to-r from-primary to-blue-700 rounded-xl p-6 mb-8 text-white" data-testid="create-simulation-cta">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Crie seu simulado personalizado</h3>
                <p className="text-blue-100">
                  Escolha matérias, dificuldade e número de questões para praticar do seu jeito
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/simulations/create')}
              className="bg-white text-primary font-semibold px-6 py-3 rounded-full hover:bg-blue-50 transition-colors flex items-center gap-2 whitespace-nowrap"
              data-testid="create-simulation-button"
            >
              <Sparkles className="w-5 h-5" />
              Criar Simulado
            </button>
          </div>
        </div>

        {/* Ad Placeholder */}
        <div className="mb-8">
          <AdPlaceholder position="banner" />
        </div>

        {/* Exams List */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900" data-testid="exams-heading">
              Simulados Oficiais
            </h2>
            <button
              onClick={() => navigate('/simulations/my')}
              className="text-primary hover:underline font-medium text-sm flex items-center gap-1"
              data-testid="view-my-simulations"
            >
              Meus simulados
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {exams.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhum simulado oficial disponível no momento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <div 
                  key={exam.id} 
                  className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                  data-testid={`exam-card-${exam.id}`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors">
                          {exam.title}
                        </h3>
                        <p className="text-sm text-slate-600">{exam.banca} - {exam.year}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span>{exam.duration_minutes} minutos</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <BookOpen className="w-4 h-4" />
                        <span>{exam.question_count} questões</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartExam(exam.id)}
                      className="w-full btn-primary flex items-center justify-center gap-2"
                      data-testid={`start-exam-${exam.id}`}
                    >
                      <PlayCircle className="w-5 h-5" />
                      Iniciar Simulado
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Attempts */}
        {completedAttempts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6" data-testid="history-heading">Histórico Recente</h2>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Simulado</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Tipo</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Data</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Pontuação</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completedAttempts.slice(0, 5).map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-50 transition-colors" data-testid={`attempt-row-${attempt.id}`}>
                        <td className="px-6 py-4 text-sm text-slate-900">{attempt.exam_title}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            attempt.mode === 'official' 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'bg-purple-50 text-purple-700'
                          }`}>
                            {attempt.mode === 'official' ? 'Oficial' : 'Personalizado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(attempt.start_time).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                            attempt.score?.percentage >= 70 ? 'bg-green-50 text-success'
                            : attempt.score?.percentage >= 50 ? 'bg-amber-50 text-amber-600'
                            : 'bg-red-50 text-red-600'
                          }`}>
                            {attempt.score?.percentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => navigate(`/results/${attempt.id}`)}
                            className="text-primary hover:underline font-medium text-sm"
                            data-testid={`view-result-${attempt.id}`}
                          >
                            Ver Resultado
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
