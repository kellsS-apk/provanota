import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExams, getUserAttempts } from '../api';
import { useAuth } from '../AuthContext';
import { Header } from '../components/Header';
import { AdPlaceholder } from '../components/AdPlaceholder';
import { Clock, BookOpen, PlayCircle, TrendingUp, Award } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [examsRes, attemptsRes] = await Promise.all([
        getExams(),
        getUserAttempts()
      ]);
      setExams(examsRes.data);
      setAttempts(attemptsRes.data);
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
  const avgScore = completedAttempts.length > 0
    ? (completedAttempts.reduce((sum, a) => sum + (a.score?.percentage || 0), 0) / completedAttempts.length).toFixed(1)
    : 0;

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm" data-testid="stat-attempts">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Simulados Realizados</p>
                <p className="text-2xl font-bold text-slate-900">{completedAttempts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm" data-testid="stat-average">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Média Geral</p>
                <p className="text-2xl font-bold text-slate-900">{avgScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm" data-testid="stat-available">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <Award className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Disponíveis</p>
                <p className="text-2xl font-bold text-slate-900">{exams.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ad Placeholder */}
        <div className="mb-8">
          <AdPlaceholder position="banner" />
        </div>

        {/* Exams List */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6" data-testid="exams-heading">Simulados Disponíveis</h2>
          
          {exams.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Nenhum simulado disponível no momento</p>
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
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Data</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Pontuação</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completedAttempts.slice(0, 5).map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-50 transition-colors" data-testid={`attempt-row-${attempt.id}`}>
                        <td className="px-6 py-4 text-sm text-slate-900">{attempt.exam_title}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(attempt.start_time).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-50 text-success">
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