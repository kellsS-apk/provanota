import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, API_URL } from '../api';
import { useAuth } from '../AuthContext';
import { BookOpen, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
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
        : await register({ email: formData.email, password: formData.password, name: formData.name });
      
      loginUser(response.data.token, response.data.user);
      toast.success(isLogin ? 'Login realizado!' : 'Conta criada com sucesso!');
      
      if (response.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
  console.error('Auth error:', error);

  const status = error?.response?.status;
  const detail =
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    (Array.isArray(error?.response?.data) ? JSON.stringify(error.response.data) : null);

  // Network / CORS / backend asleep (Render free tier)
  if (!error?.response) {
    toast.error(
      `Não consegui falar com o backend (${API_URL}). Verifique se o backend está online e se o CORS permite o domínio do Vercel.`
    );
  } else if (status === 401) {
    toast.error(detail || 'Email ou senha inválidos.');
  } else if (status === 409) {
    toast.error(detail || 'Este email já está cadastrado.');
  } else if (status === 422) {
    toast.error(detail || 'Dados inválidos. Confira os campos e tente novamente.');
  } else {
    toast.error(detail || 'Ocorreu um erro. Tente novamente.');
  }
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
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="••••••••"
                  data-testid="password-input"
                />
              </div>
              {!isLogin && (
                <p className="text-xs text-slate-500 mt-1">Mínimo 8 caracteres</p>
              )}
            </div>

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
