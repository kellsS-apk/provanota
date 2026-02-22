import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAdminExam, getAdminQuestions, createQuestion, deleteQuestion } from '../api';
import { Header } from '../components/Header';
import { Plus, Trash2, ArrowLeft, Upload, FileJson, X } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_FORM = {
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
};

function parseImport(text) {
  const raw = JSON.parse(text);
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.questions)) return raw.questions;
  if (Array.isArray(raw.items)) return raw.items;
  return [];
}

export default function QuestionManager() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState('manual'); // manual | import
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { loadData(); }, [examId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [examRes, qRes] = await Promise.all([getAdminExam(examId), getAdminQuestions(examId)]);
      setExam(examRes.data);
      setQuestions(qRes.data || []);
    } catch (e) {
      toast.error('Erro ao carregar dados');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const canSave = useMemo(() => {
    if (!formData.statement?.trim()) return false;
    const filled = formData.alternatives.filter(a => a.text?.trim()).length;
    return filled >= 2;
  }, [formData]);

  const updateAlternative = (index, text) => {
    const next = [...formData.alternatives];
    next[index].text = text;
    setFormData({ ...formData, alternatives: next });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return toast.error('Preencha o enunciado e pelo menos 2 alternativas.');
    setSaving(true);
    try {
      await createQuestion({ ...formData, exam_id: examId });
      toast.success('Questão adicionada!');
      setShowForm(false);
      setFormData(DEFAULT_FORM);
      await loadData();
    } catch (e2) {
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
      await loadData();
    } catch (e) {
      toast.error('Erro ao excluir questão');
    }
  };

  const pickFile = () => fileRef.current?.click();
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportText(await file.text());
    e.target.value = '';
  };

  const runImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    let inserted = 0, failed = 0;
    try {
      let items = [];
      try { items = parseImport(importText); } catch (err) { toast.error('JSON inválido'); return; }
      if (!items.length) { toast.error('Não encontrei array de questões no JSON.'); return; }

      for (const item of items) {
        try {
          const payload = {
            exam_id: examId,
            statement: item.statement || '',
            image_url: item.image_url || '',
            alternatives: item.alternatives || DEFAULT_FORM.alternatives,
            correct_answer: (item.correct_answer || 'A').toString().toUpperCase(),
            tags: item.tags || [],
            difficulty: (item.difficulty || 'medium').toString().toLowerCase(),
            area: item.area || 'Linguagens'
          };
          await createQuestion(payload);
          inserted += 1;
        } catch (err) {
          failed += 1;
        }
      }

      toast.success(`Importação concluída: ${inserted} inseridas, ${failed} falharam.`);
      await loadData();
    } finally {
      setImporting(false);
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{exam?.title}</h1>
            <p className="text-slate-600 mt-1">{questions.length} questões cadastradas</p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setTab('manual'); setShowForm(true); }} className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" /> Nova Questão
            </button>
            <button onClick={() => { setTab('import'); setShowForm(false); }} className="btn-secondary flex items-center gap-2">
              <FileJson className="w-5 h-5" /> Importar JSON
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('manual')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'manual' ? 'bg-primary text-white' : 'bg-white border hover:bg-slate-50'}`}>
            Manual
          </button>
          <button onClick={() => setTab('import')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'import' ? 'bg-primary text-white' : 'bg-white border hover:bg-slate-50'}`}>
            Importar
          </button>
        </div>

        {tab === 'import' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Importar em lote</h2>
                <p className="text-sm text-slate-600">Cole o JSON ou faça upload do arquivo .json.</p>
              </div>

              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
                <button onClick={pickFile} className="btn-secondary flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Upload
                </button>
                <button onClick={runImport} disabled={importing || !importText.trim()} className="btn-primary disabled:opacity-50">
                  {importing ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </div>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full min-h-[220px] p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
              placeholder='Ex: { "questions": [ { "statement": "...", "alternatives": [...], "correct_answer":"A" } ] }'
            />
          </div>
        )}

        {tab === 'manual' && showForm && (
          <div className="bg-white rounded-xl border shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Nova Questão</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Enunciado</label>
                <textarea
                  value={formData.statement}
                  onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
                  className="w-full min-h-[120px] p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Alternativas</label>
                <div className="space-y-3">
                  {formData.alternatives.map((alt, index) => (
                    <div key={alt.letter} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                        {alt.letter}
                      </div>
                      <textarea
                        value={alt.text}
                        onChange={(e) => updateAlternative(index, e.target.value)}
                        className="flex-1 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder={`Alternativa ${alt.letter}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Resposta correta</label>
                  <select value={formData.correct_answer} onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg">
                    {['A','B','C','D','E'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Dificuldade</label>
                  <select value={formData.difficulty} onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg">
                    <option value="easy">Fácil</option>
                    <option value="medium">Médio</option>
                    <option value="hard">Difícil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Área</label>
                  <select value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg">
                    {['Linguagens','Humanas','Natureza','Matemática'].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving || !canSave} className="btn-primary disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar questão'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Questões</h2>
            <span className="text-sm text-slate-500">{questions.length} total</span>
          </div>

          {questions.length === 0 ? (
            <div className="p-10 text-center text-slate-600">Nenhuma questão cadastrada ainda.</div>
          ) : (
            <div className="divide-y">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-6 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-sm text-slate-500 mb-1">Questão {idx + 1}</div>
                      <div className="font-medium text-slate-900 whitespace-pre-line">{q.statement}</div>
                    </div>
                    <button onClick={() => handleDelete(q.id)} className="p-2 rounded-lg hover:bg-red-50" title="Excluir">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
