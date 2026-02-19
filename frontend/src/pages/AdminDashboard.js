import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminExams, deleteExam, publishExam, unpublishExam } from '../api';
import { Header } from '../components/Header';
import { Plus, Edit, Trash2, Eye, EyeOff, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const response = await getAdminExams();
      setExams(response.data);
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2" data-testid="admin-heading">
              Painel Administrativo
            </h1>
            <p className="text-lg text-slate-600">Gerencie provas e questões</p>
          </div>
          <button
            onClick={() => navigate('/admin/exams/new')}
            className="btn-primary flex items-center gap-2"
            data-testid="create-exam-button"
          >
            <Plus className="w-5 h-5" />
            Nova Prova
          </button>
        </div>

        {exams.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">Nenhuma prova criada ainda</p>
            <button
              onClick={() => navigate('/admin/exams/new')}
              className="btn-primary"
            >
              Criar Primeira Prova
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Título</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Banca</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Ano</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Questões</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50 transition-colors" data-testid={`exam-row-${exam.id}`}>
                    <td className="px-6 py-4 font-medium text-slate-900">{exam.title}</td>
                    <td className="px-6 py-4 text-slate-600">{exam.banca}</td>
                    <td className="px-6 py-4 text-slate-600">{exam.year}</td>
                    <td className="px-6 py-4 text-slate-600">{exam.question_count}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        exam.published 
                          ? 'bg-green-50 text-success' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {exam.published ? 'Publicada' : 'Rascunho'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/exams/${exam.id}/questions`)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Gerenciar Questões"
                          data-testid={`manage-questions-${exam.id}`}
                        >
                          <Edit className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                          onClick={() => handleTogglePublish(exam)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title={exam.published ? 'Despublicar' : 'Publicar'}
                          data-testid={`toggle-publish-${exam.id}`}
                        >
                          {exam.published ? (
                            <EyeOff className="w-4 h-4 text-slate-600" />
                          ) : (
                            <Eye className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(exam.id, exam.title)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                          data-testid={`delete-exam-${exam.id}`}
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