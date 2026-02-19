import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, register } from '../api';
import { useAuth } from '../AuthContext';
import { BookOpen, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = isLogin 
        ? await login({ email: formData.email, password: formData.password })
        : await register(formData);
      
      loginUser(response.data.token, response.data.user);
      toast.success(isLogin ? 'Login realizado!' : 'Conta criada com sucesso!');
      
      if (response.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BookOpen className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">ProvaNota</h1>
          <p className="text-blue-100">Domine o ENEM com precisão</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                isLogin ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
              }`}
              data-testid="login-tab"
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                !isLogin ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
              }`}
              data-testid="register-tab"
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-form">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Seu nome"
                    data-testid="name-input"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="seu@email.com"
                  data-testid="email-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="••••••••"
                  data-testid="password-input"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de Conta
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  data-testid="role-select"
                >
                  <option value="student">Estudante</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-button"
            >
              {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            {isLogin ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-semibold hover:underline"
              data-testid="toggle-auth-mode"
            >
              {isLogin ? 'Criar agora' : 'Faça login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}