
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminExams, deleteExam, publishExam, unpublishExam } from '../api';
import { Header } from '../components/Header';
import { Plus, Edit, Trash2, Eye, EyeOff, BookOpen, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | published | draft

  const navigate = useNavigate();

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const response = await getAdminExams();
      setExams(response.data || []);
    } catch (error) {
      toast.error('Erro ao carregar provas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${title}"?`)) return;

    try {
      await deleteExam(id);
      toast.success('Prova excluída com sucesso');
      loadExams();
    } catch (error) {
      toast.error('Erro ao excluir prova');
    }
  };

  const handleTogglePublish = async (exam) => {
    try {
      if (exam.published) {
        await unpublishExam(exam.id);
        toast.success('Prova despublicada');
      } else {
        await publishExam(exam.id);
        toast.success('Prova publicada');
      }
      loadExams();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const stats = useMemo(() => {
    const total = exams.length;
    const published = exams.filter(e => e.published).length;
    const drafts = total - published;
    const totalQuestions = exams.reduce((sum, e) => sum + (Number(e.question_count) || 0), 0);
    return { total, published, drafts, totalQuestions };
  }, [exams]);

  const filteredExams = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (exams || [])
      .filter(e => (q ? (e.title || '').toLowerCase().includes(q) : true))
      .filter(e => {
        if (statusFilter === 'published') return !!e.published;
        if (statusFilter === 'draft') return !e.published;
        return true;
      });
  }, [exams, search, statusFilter]);

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Painel Administrativo</h1>
            <p className="text-slate-600 mt-1">Crie, publique e organize suas provas.</p>
          </div>

          <button
            onClick={() => navigate('/admin/exams/new')}
            className="btn-primary inline-flex items-center gap-2 justify-center"
          >
            <Plus className="w-5 h-5" />
            Nova Prova
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total de provas</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-sm text-slate-500">Publicadas</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.published}</p>
          </div>
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-sm text-slate-500">Rascunhos</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{stats.drafts}</p>
          </div>
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total de questões</p>
            <p className="text-2xl font-bold text-primary mt-1">{stats.totalQuestions}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título..."
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48 px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">Todas</option>
              <option value="published">Publicadas</option>
              <option value="draft">Rascunhos</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {filteredExams.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900">Nenhuma prova encontrada</h2>
            <p className="text-slate-600 mt-1">Crie sua primeira prova para começar.</p>
            <button onClick={() => navigate('/admin/exams/new')} className="btn-primary mt-5 inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nova Prova
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Título</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Ano</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Questões</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{exam.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{exam.banca}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{exam.year}</td>
                    <td className="px-6 py-4 text-slate-700">{exam.question_count || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${exam.published ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {exam.published ? 'Publicada' : 'Rascunho'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/admin/exams/${exam.id}/questions`)}
                          className="p-2 rounded-lg hover:bg-slate-100"
                          title="Gerenciar questões"
                        >
                          <Edit className="w-4 h-4 text-slate-700" />
                        </button>

                        <button
                          onClick={() => handleTogglePublish(exam)}
                          className="p-2 rounded-lg hover:bg-slate-100"
                          title={exam.published ? 'Despublicar' : 'Publicar'}
                        >
                          {exam.published ? (
                            <EyeOff className="w-4 h-4 text-slate-700" />
                          ) : (
                            <Eye className="w-4 h-4 text-slate-700" />
                          )}
                        </button>

                        <button
                          onClick={() => handleDelete(exam.id, exam.title)}
                          className="p-2 rounded-lg hover:bg-red-50"
                          title="Excluir prova"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
