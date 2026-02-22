
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createExam } from '../api';
import { Header } from '../components/Header';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT = {
  title: '',
  year: new Date().getFullYear(),
  banca: 'INEP',
  duration_minutes: 180,
  instructions: '',
  areas: ['Linguagens', 'Humanas', 'Natureza', 'Matemática'],
};

export default function ExamForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULT);
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(() => {
    if (!form.title.trim()) return false;
    if (!String(form.banca).trim()) return false;
    const year = Number(form.year);
    if (!Number.isFinite(year) || year < 1900 || year > 2100) return false;
    const dur = Number(form.duration_minutes);
    if (!Number.isFinite(dur) || dur <= 0) return false;
    if (!Array.isArray(form.areas) || form.areas.length === 0) return false;
    return true;
  }, [form]);

  const toggleArea = (area) => {
    setForm((prev) => {
      const selected = prev.areas.includes(area);
      return { ...prev, areas: selected ? prev.areas.filter(a => a !== area) : [...prev.areas, area] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) {
      toast.error('Preencha os campos obrigatórios corretamente.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        year: Number(form.year),
        duration_minutes: Number(form.duration_minutes),
      };

      const res = await createExam(payload);
      toast.success('Prova criada! Agora adicione as questões.');
      navigate(`/admin/exams/${res.data.id}/questions`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Erro ao criar prova');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="bg-white rounded-2xl border shadow-sm p-6 md:p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Nova Prova</h1>
          <p className="text-slate-600 mb-6">Crie a prova e depois adicione as questões.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Título *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Ex: ENEM 2025 - Prova Azul"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ano *</label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg"
                  min={1900}
                  max={2100}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Banca *</label>
                <input
                  value={form.banca}
                  onChange={(e) => setForm({ ...form, banca: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg"
                  placeholder="INEP"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Duração (min) *</label>
                <input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg"
                  min={1}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Áreas *</label>
              <div className="flex flex-wrap gap-2">
                {['Linguagens', 'Humanas', 'Natureza', 'Matemática'].map((a) => {
                  const selected = form.areas.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleArea(a)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                        selected ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Instruções (opcional)</label>
              <textarea
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                className="w-full min-h-[110px] px-4 py-3 border border-slate-200 rounded-lg"
                placeholder="Ex: Leia atentamente e responda todas as questões."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => navigate('/admin')}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !canSave}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Criar prova'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
