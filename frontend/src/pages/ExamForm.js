import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createExam } from '../api';
import { Header } from '../components/Header';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ExamForm() {
  const [formData, setFormData] = useState({
    title: '',
    year: new Date().getFullYear(),
    banca: '',
    duration_minutes: 180,
    instructions: 'Leia atentamente cada questão antes de responder. Marque apenas uma alternativa por questão.',
    areas: ['Linguagens', 'Humanas', 'Natureza', 'Matemática']
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await createExam(formData);
      toast.success('Prova criada com sucesso!');
      navigate(`/admin/exams/${response.data.id}/questions`);
    } catch (error) {
      toast.error('Erro ao criar prova');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight" data-testid="create-exam-heading">
            Nova Prova
          </h1>
          <button
            onClick={() => navigate('/admin')}
            className="btn-secondary flex items-center gap-2"
            data-testid="cancel-button"
          >
            <X className="w-5 h-5" />
            Cancelar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-8" data-testid="exam-form">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Título da Prova *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Ex: ENEM 2023"
                data-testid="title-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Banca *
                </label>
                <input
                  type="text"
                  required
                  value={formData.banca}
                  onChange={(e) => setFormData({ ...formData, banca: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Ex: INEP"
                  data-testid="banca-input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Ano *
                </label>
                <input
                  type="number"
                  required
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  data-testid="year-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Duração (minutos) *
              </label>
              <input
                type="number"
                required
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                data-testid="duration-input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Instruções *
              </label>
              <textarea
                required
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                data-testid="instructions-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="submit-button"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Criando...' : 'Criar Prova'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}