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
  const \[saving, setSaving\] = useState\(false\);


  // Import options (3 ways): manual (existing), paste JSON, upload JSON file
  const [importMode, setImportMode] = useState('manual'); // 'manual' | 'paste' | 'file'
  const [importText, setImportText] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { inserted, skipped, failed, errors: [] }
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


  const normalizeImportQuestion = (q) => {
    // Accept either our internal shape or the /api/admin/import/questions shape
    const alternatives = (q.alternatives || q.options || []).map((a, i) => {
      if (typeof a === 'string') {
        return { letter: String.fromCharCode(65 + i), text: a };
      }
      return { letter: a.letter || String.fromCharCode(65 + i), text: a.text || '' };
    });

    return {
      statement: q.statement || q.enunciado || '',
      image_url: q.image_url || q.imageUrl || '',
      alternatives: alternatives.length ? alternatives : [
        { letter: 'A', text: '' },
        { letter: 'B', text: '' },
        { letter: 'C', text: '' },
        { letter: 'D', text: '' },
        { letter: 'E', text: '' }
      ],
      correct_answer: (q.correct_answer || q.correctAnswer || 'A').toString().toUpperCase(),
      tags: Array.isArray(q.tags) ? q.tags : [],
      difficulty: (q.difficulty || 'medium').toString(),
      area: q.area || 'Linguagens',
      subject: q.subject || '',
      topic: q.topic || '',
      education_level: q.education_level || 'vestibular',
      source_exam: q.source_exam || '',
      year: q.year || new Date().getFullYear()
    };
  };

  const parseImportPayload = async () => {
    let raw = importText?.trim();
    if (importMode === 'file') {
      if (!importFile) throw new Error('Nenhum arquivo selecionado');
      raw = await importFile.text();
    }
    if (!raw) throw new Error('JSON vazio');

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error('JSON inválido (verifique vírgulas e aspas)');
    }

    const questions = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.items || []);
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Não encontrei "questions" no JSON');
    }

    return questions.map(normalizeImportQuestion);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    setImporting(true);
    setImportResult(null);

    try {
      const questions = await parseImportPayload();

      let inserted = 0;
      let skipped = 0;
      let failed = 0;
      const errors = [];

      // Import sequentially to avoid rate limits and keep progress predictable
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        try {
          await createQuestion({
            ...q,
            exam_id: examId,
            tags: (q.tags || []).filter(t => (t || '').toString().trim() !== '')
          });
          inserted++;
        } catch (err) {
          // If backend enforces unique hash it may return 409; treat as skipped
          const status = err?.response?.status;
          if (status === 409) {
            skipped++;
          } else {
            failed++;
            errors.push({ index: i + 1, message: err?.response?.data?.detail || err?.message || 'Erro desconhecido' });
          }
        }
      }

      setImportResult({ inserted, skipped, failed, errors });
      toast.success(`Importação finalizada: ${inserted} inseridas, ${skipped} duplicadas, ${failed} com erro`);
      setShowForm(false);
      setImportText('');
      setImportFile(null);
      loadData();
    } catch (error) {
      toast.error(error?.message || 'Erro ao importar');
      setImportResult({ inserted: 0, skipped: 0, failed: 0, errors: [{ index: '-', message: error?.message || 'Erro ao importar' }] });
    } finally {
      setImporting(false);
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
          <form onSubmit={importMode === 'manual' ? handleSubmit : handleImport} className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 mb-8" data-testid="question-form">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Adicionar Questões</h2>
            <p className="text-sm text-slate-600 mb-6">Escolha uma forma de adicionar questões: manual, colar JSON ou enviar um arquivo.</p>

            <div className="flex flex-wrap gap-2 mb-6">
              <button
                type="button"
                onClick={() => setImportMode('manual')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  importMode === 'manual' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid="mode-manual"
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setImportMode('paste')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  importMode === 'paste' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid="mode-paste"
              >
                Colar JSON
              </button>
              <button
                type="button"
                onClick={() => setImportMode('file')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  importMode === 'file' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid="mode-file"
              >
                Upload JSON
              </button>
            </div>

            
            {importMode === 'manual' ? (
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
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-sm text-slate-700">
                  O JSON pode ser um objeto com <code className="px-1 py-0.5 bg-white border rounded">{"questions":[...]}</code>
                  ou um array direto <code className="px-1 py-0.5 bg-white border rounded">[ ... ]</code>.
                </p>
                <p className="text-sm text-slate-700 mt-2">
                  Campos esperados: <span className="font-mono">statement</span>, <span className="font-mono">alternatives</span>,
                  <span className="font-mono">correct_answer</span>, <span className="font-mono">area</span> (e opcionais como
                  <span className="font-mono"> image_url, difficulty, tags, subject, topic, education_level, source_exam, year</span>).
                </p>
              </div>

              {importMode === 'paste' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Cole o JSON aqui</label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full h-64 px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                    placeholder='{"questions":[{"statement":"...","alternatives":[{"letter":"A","text":"..."},{"letter":"B","text":"..."}],"correct_answer":"A","area":"Linguagens"}]}'
                  />
                </div>
              )}

              {importMode === 'file' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Envie um arquivo .json</label>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  {importFile && (
                    <p className="text-sm text-slate-600 mt-2">Selecionado: <span className="font-semibold">{importFile.name}</span></p>
                  )}
                </div>
              )}

              {importResult && (
                <div className="border border-slate-200 rounded-xl p-4">
                  <p className="text-sm text-slate-700">
                    Resultado: <span className="font-semibold">{importResult.inserted}</span> inseridas,
                    <span className="font-semibold"> {importResult.skipped}</span> duplicadas,
                    <span className="font-semibold"> {importResult.failed}</span> com erro.
                  </p>
                  {importResult.errors?.length > 0 && (
                    <div className="mt-3 max-h-40 overflow-auto text-sm text-red-700">
                      {importResult.errors.slice(0, 20).map((e, idx) => (
                        <div key={idx} className="mb-1">
                          <span className="font-semibold">#{e.index}:</span> {e.message}
                        </div>
                      ))}
                      {importResult.errors.length > 20 && (
                        <div className="text-slate-600 mt-2">Mostrando 20 de {importResult.errors.length} erros.</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setImportText('');
                    setImportFile(null);
                    setImportResult(null);
                    setImportMode('manual');
                  }}
                  className="px-6 py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-8 py-3 rounded-xl font-semibold text-white bg-primary hover:bg-primary-dark transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Importar Questões
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          </form>
        )}

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
            <p className="text-slate-600 mb-4">Nenhuma questão cadastrada ainda</p>
            <button
              onClick={() => { setShowForm(true); setImportMode('manual'); setImportText(''); setImportFile(null); setImportResult(null); }}
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
