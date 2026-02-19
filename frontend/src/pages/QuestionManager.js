import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAdminExam, getAdminQuestions, createQuestion, deleteQuestion } from '../api';
import { Header } from '../components/Header';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function QuestionManager() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    statement: '',
    image_url: '',
    alternatives: [
      { letter: 'A', text: '' },
      { letter: 'B', text: '' },
      { letter: 'C', text: '' },
      { letter: 'D', text: '' },
      { letter: 'E', text: '' }
    ],
    correct_answer: 'A',
    tags: [],
    difficulty: 'medium',
    area: 'Linguagens'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [examId]);

  const loadData = async () => {
    try {
      const [examRes, questionsRes] = await Promise.all([
        getAdminExam(examId),
        getAdminQuestions(examId)
      ]);
      setExam(examRes.data);
      setQuestions(questionsRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await createQuestion({
        ...formData,
        exam_id: examId,
        tags: formData.tags.filter(t => t.trim() !== '')
      });
      toast.success('Questão adicionada com sucesso!');
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Erro ao adicionar questão');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta questão?')) return;

    try {
      await deleteQuestion(id);
      toast.success('Questão excluída');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir questão');
    }
  };

  const resetForm = () => {
    setFormData({
      statement: '',
      image_url: '',
      alternatives: [
        { letter: 'A', text: '' },
        { letter: 'B', text: '' },
        { letter: 'C', text: '' },
        { letter: 'D', text: '' },
        { letter: 'E', text: '' }
      ],
      correct_answer: 'A',
      tags: [],
      difficulty: 'medium',
      area: 'Linguagens'
    });
  };

  const updateAlternative = (index, text) => {
    const newAlts = [...formData.alternatives];
    newAlts[index].text = text;
    setFormData({ ...formData, alternatives: newAlts });
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
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 text-slate-600 hover:text-primary mb-2 transition-colors"
              data-testid="back-button"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2" data-testid="exam-title">
              {exam.title}
            </h1>
            <p className="text-slate-600">{questions.length} questões cadastradas</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2"
            data-testid="add-question-button"
          >
            <Plus className="w-5 h-5" />
            {showForm ? 'Cancelar' : 'Nova Questão'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 mb-8" data-testid="question-form">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Nova Questão</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Enunciado *
                </label>
                <textarea
                  required
                  value={formData.statement}
                  onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Digite o enunciado da questão..."
                  data-testid="statement-input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  URL da Imagem (opcional)
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="https://..."
                  data-testid="image-url-input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">
                  Alternativas *
                </label>
                <div className="space-y-3">
                  {formData.alternatives.map((alt, index) => (
                    <div key={alt.letter} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {alt.letter}
                      </div>
                      <input
                        type="text"
                        required
                        value={alt.text}
                        onChange={(e) => updateAlternative(index, e.target.value)}
                        className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder={`Alternativa ${alt.letter}`}
                        data-testid={`alternative-${alt.letter}-input`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Resposta Correta *
                  </label>
                  <select
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    data-testid="correct-answer-select"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Área *
                  </label>
                  <select
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    data-testid="area-select"
                  >
                    <option value="Linguagens">Linguagens</option>
                    <option value="Humanas">Humanas</option>
                    <option value="Natureza">Natureza</option>
                    <option value="Matemática">Matemática</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Dificuldade *
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    data-testid="difficulty-select"
                  >
                    <option value="easy">Fácil</option>
                    <option value="medium">Médio</option>
                    <option value="hard">Difícil</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid="save-question-button"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Salvando...' : 'Salvar Questão'}
              </button>
            </div>
          </form>
        )}

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
            <p className="text-slate-600 mb-4">Nenhuma questão cadastrada ainda</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Adicionar Primeira Questão
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div 
                key={question.id} 
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-6"
                data-testid={`question-${index + 1}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg text-slate-900">Questão {index + 1}</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                        {question.area}
                      </span>
                      <span className="px-3 py-1 bg-blue-50 text-primary rounded-full text-xs font-semibold">
                        {question.difficulty === 'easy' ? 'Fácil' : question.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{question.statement}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    data-testid={`delete-question-${index + 1}`}
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>

                <div className="space-y-2">
                  {question.alternatives.map((alt) => (
                    <div 
                      key={alt.letter}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        alt.letter === question.correct_answer 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        alt.letter === question.correct_answer
                          ? 'bg-success text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {alt.letter}
                      </div>
                      <span className="text-slate-700">{alt.text}</span>
                      {alt.letter === question.correct_answer && (
                        <span className="ml-auto text-xs font-semibold text-success">CORRETA</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
