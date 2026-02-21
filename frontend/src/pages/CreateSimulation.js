import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSimulation, getFilterOptions, createSimulationAttempt } from '../api';
import { Header } from '../components/Header';
import { 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  Target, 
  Calendar,
  X,
  Loader2,
  Play,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';

export default function CreateSimulation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterOptions, setFilterOptions] = useState(null);
  
  // Form state
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [educationLevel, setEducationLevel] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [questionLimit, setQuestionLimit] = useState(10);
  const [availableCount, setAvailableCount] = useState(0);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const response = await getFilterOptions();
      setFilterOptions(response.data);
      setAvailableCount(response.data.total_questions);
    } catch (error) {
      toast.error('Erro ao carregar opções');
    } finally {
      setLoading(false);
    }
  };

  // Debounced count update
  const updateAvailableCount = useCallback(async () => {
    if (!filterOptions) return;
    
    try {
      // Build params based on current filters
      let count = filterOptions.total_questions;
      
      // For now, just show total - real count would need backend call
      // This is a simplified version
      if (selectedSubjects.length > 0 || educationLevel || difficulty) {
        // Estimate based on filters
        count = Math.max(1, Math.floor(count * 0.3)); // Rough estimate
      }
      
      setAvailableCount(count);
    } catch (error) {
      console.error('Error updating count:', error);
    }
  }, [filterOptions, selectedSubjects, educationLevel, difficulty]);

  useEffect(() => {
    updateAvailableCount();
  }, [updateAvailableCount]);

  const handleSubjectToggle = (subject) => {
    setSelectedSubjects(prev => 
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    
    try {
      const criteria = {
        limit: questionLimit,
        type: 'custom'
      };
      
      if (selectedSubjects.length > 0) {
        criteria.subjects = selectedSubjects;
      }
      
      if (educationLevel) {
        criteria.education_level = educationLevel;
      }
      
      if (difficulty) {
        criteria.difficulty = difficulty;
      }
      
      const response = await generateSimulation(criteria);
      
      if (response.data.question_count === 0) {
        toast.error('Nenhuma questão encontrada com os filtros selecionados');
        setGenerating(false);
        return;
      }
      
      toast.success(`Simulado criado com ${response.data.question_count} questões!`);
      
      // Create attempt and start
      const attemptResponse = await createSimulationAttempt(response.data.id);
      navigate(`/simulation/${attemptResponse.data.id}`);
      
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao gerar simulado';
      toast.error(message);
      setGenerating(false);
    }
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

  const educationLevelLabels = {
    'escola': 'Ensino Médio',
    'vestibular': 'Vestibular',
    'faculdade': 'Faculdade'
  };

  const difficultyLabels = {
    'easy': 'Fácil',
    'medium': 'Médio',
    'hard': 'Difícil'
  };

  const subjectsToShow = filterOptions?.valid_subjects || filterOptions?.subjects || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight" data-testid="create-simulation-heading">
              Criar Simulado Personalizado
            </h1>
          </div>
          <p className="text-slate-600">
            Monte seu simulado com questões filtradas por matéria, dificuldade e nível
          </p>
        </div>

        {/* No Questions Warning */}
        {filterOptions?.total_questions === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">Banco de questões vazio</h3>
                <p className="text-amber-700 text-sm">
                  Ainda não há questões cadastradas no banco. Um administrador precisa importar questões para que você possa criar simulados personalizados.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Subjects Selection */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6" data-testid="subjects-section">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-slate-900">Matérias</h2>
              {selectedSubjects.length > 0 && (
                <span className="ml-auto text-sm text-slate-500">
                  {selectedSubjects.length} selecionada(s)
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4" data-testid="subjects-chips">
              {selectedSubjects.map(subject => (
                <button
                  key={subject}
                  onClick={() => handleSubjectToggle(subject)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
                  data-testid={`selected-subject-${subject}`}
                >
                  {subject}
                  <X className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-2" data-testid="subjects-list">
              {subjectsToShow.filter(s => !selectedSubjects.includes(s)).map(subject => (
                <button
                  key={subject}
                  onClick={() => handleSubjectToggle(subject)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium hover:bg-slate-200 transition-colors"
                  data-testid={`subject-option-${subject}`}
                >
                  {subject}
                </button>
              ))}
            </div>
            
            {selectedSubjects.length > 0 && (
              <button 
                onClick={() => setSelectedSubjects([])}
                className="mt-3 text-sm text-slate-500 hover:text-slate-700"
              >
                Limpar seleção
              </button>
            )}
          </div>

          {/* Education Level */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6" data-testid="education-level-section">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-slate-900">Nível de Ensino</h2>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setEducationLevel('')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  educationLevel === '' 
                    ? 'bg-primary text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid="education-level-all"
              >
                Todos
              </button>
              {(filterOptions?.education_levels || ['escola', 'vestibular', 'faculdade']).map(level => (
                <button
                  key={level}
                  onClick={() => setEducationLevel(level)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    educationLevel === level 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  data-testid={`education-level-${level}`}
                >
                  {educationLevelLabels[level] || level}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6" data-testid="difficulty-section">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-slate-900">Dificuldade</h2>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setDifficulty('')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  difficulty === '' 
                    ? 'bg-primary text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid="difficulty-all"
              >
                Todas
              </button>
              {['easy', 'medium', 'hard'].map(level => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    difficulty === level 
                      ? level === 'easy' ? 'bg-green-600 text-white'
                        : level === 'medium' ? 'bg-amber-500 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  data-testid={`difficulty-${level}`}
                >
                  {difficultyLabels[level]}
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6" data-testid="question-count-section">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-slate-900">Número de Questões</h2>
              </div>
              <span className="text-2xl font-bold text-primary" data-testid="question-limit-value">
                {questionLimit}
              </span>
            </div>
            
            <Slider
              value={[questionLimit]}
              onValueChange={(value) => setQuestionLimit(value[0])}
              min={5}
              max={Math.min(50, Math.max(5, availableCount))}
              step={5}
              className="mb-4"
              data-testid="question-limit-slider"
            />
            
            <div className="flex justify-between text-sm text-slate-500">
              <span>5 questões</span>
              <span>{Math.min(50, Math.max(5, availableCount))} questões</span>
            </div>
            
            <p className="mt-3 text-sm text-slate-600">
              <span className="font-medium text-primary">{availableCount}</span> questões disponíveis no banco
            </p>
          </div>

          {/* Generate Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
              data-testid="cancel-button"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || availableCount === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="generate-simulation-button"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Gerar e Iniciar Simulado
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
