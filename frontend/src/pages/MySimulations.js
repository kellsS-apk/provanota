import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMySimulations, createSimulationAttempt, getUserAttempts } from '../api';
import { Header } from '../components/Header';
import { 
  FileText, 
  Play, 
  Calendar, 
  BookOpen,
  Trophy,
  Clock,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

export default function MySimulations() {
  const [simulations, setSimulations] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [simulationsRes, attemptsRes] = await Promise.all([
        getMySimulations(),
        getUserAttempts()
      ]);
      setSimulations(simulationsRes.data);
      setAttempts(attemptsRes.data);
    } catch (error) {
      toast.error('Erro ao carregar simulados');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSimulation = async (simulationId) => {
    setStartingId(simulationId);
    try {
      const response = await createSimulationAttempt(simulationId);
      navigate(`/simulation/${response.data.id}`);
    } catch (error) {
      toast.error('Erro ao iniciar simulado');
      setStartingId(null);
    }
  };

  const getSimulationAttempts = (simulationId) => {
    return attempts.filter(a => a.simulation_id === simulationId);
  };

  const getBestScore = (simulationId) => {
    const simAttempts = getSimulationAttempts(simulationId);
    const completed = simAttempts.filter(a => a.status === 'completed');
    if (completed.length === 0) return null;
    return Math.max(...completed.map(a => a.score?.percentage || 0));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCriteriaLabel = (simulation) => {
    const criteria = simulation.criteria || {};
    const parts = [];
    
    if (criteria.subjects?.length > 0) {
      parts.push(criteria.subjects.slice(0, 2).join(', '));
      if (criteria.subjects.length > 2) parts[0] += '...';
    }
    
    if (criteria.education_level) {
      const labels = { 'escola': 'Ensino Médio', 'vestibular': 'Vestibular', 'faculdade': 'Faculdade' };
      parts.push(labels[criteria.education_level] || criteria.education_level);
    }
    
    if (criteria.difficulty) {
      const labels = { 'easy': 'Fácil', 'medium': 'Médio', 'hard': 'Difícil' };
      parts.push(labels[criteria.difficulty] || criteria.difficulty);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Simulado Personalizado';
  };

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
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2" data-testid="my-simulations-heading">
              Meus Simulados
            </h1>
            <p className="text-slate-600">
              Simulados personalizados que você criou
            </p>
          </div>
          <button
            onClick={() => navigate('/simulations/create')}
            className="btn-primary flex items-center gap-2"
            data-testid="create-new-simulation"
          >
            <Plus className="w-5 h-5" />
            Novo Simulado
          </button>
        </div>

        {simulations.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum simulado criado</h3>
            <p className="text-slate-600 mb-6">
              Crie seu primeiro simulado personalizado com as questões que você deseja praticar
            </p>
            <button
              onClick={() => navigate('/simulations/create')}
              className="btn-primary"
              data-testid="create-first-simulation"
            >
              Criar Simulado
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {simulations.map((simulation) => {
              const bestScore = getBestScore(simulation.id);
              const attemptCount = getSimulationAttempts(simulation.id).length;
              
              return (
                <div 
                  key={simulation.id}
                  className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all"
                  data-testid={`simulation-card-${simulation.id}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                          {simulation.type === 'custom' ? 'Personalizado' : 'Misto'}
                        </span>
                        <span className="text-sm text-slate-500">
                          {simulation.question_count} questões
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {getCriteriaLabel(simulation)}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(simulation.created_at)}</span>
                        </div>
                        
                        {attemptCount > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>{attemptCount} tentativa(s)</span>
                          </div>
                        )}
                        
                        {bestScore !== null && (
                          <div className="flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <span className="font-medium text-amber-600">
                              Melhor: {bestScore.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {attemptCount > 0 && (
                        <button
                          onClick={() => {
                            const lastAttempt = getSimulationAttempts(simulation.id)
                              .filter(a => a.status === 'completed')[0];
                            if (lastAttempt) {
                              navigate(`/results/${lastAttempt.id}`);
                            }
                          }}
                          className="btn-secondary text-sm py-2"
                          data-testid={`view-results-${simulation.id}`}
                        >
                          Ver Resultado
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleStartSimulation(simulation.id)}
                        disabled={startingId === simulation.id}
                        className="btn-primary flex items-center gap-2 text-sm py-2 disabled:opacity-50"
                        data-testid={`start-simulation-${simulation.id}`}
                      >
                        <Play className="w-4 h-4" />
                        {startingId === simulation.id ? 'Iniciando...' : 'Refazer'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
