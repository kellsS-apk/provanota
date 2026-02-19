import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Header } from '../components/Header';
import { User, Mail, Crown, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { updateSubscription } from '../api';

export default function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const isPremium = user?.subscription_status === 'premium';

  const handleUpgrade = async () => {
    try {
      await updateSubscription();
      setUser({ ...user, subscription_status: 'premium' });
      toast.success('Parabéns! Você é Premium agora!');
    } catch (error) {
      toast.error('Erro ao atualizar inscrição');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-8" data-testid="profile-heading">
          Meu Perfil
        </h1>

        {/* Profile Info */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-10 h-10 text-white" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900" data-testid="user-name">{user?.name}</h2>
                {isPremium && (
                  <span className="premium-badge" data-testid="premium-badge">
                    <Crown className="w-3 h-3 inline mr-1" />
                    Premium
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <Mail className="w-4 h-4" />
                <span data-testid="user-email">{user?.email}</span>
              </div>
              
              <div className="text-sm text-slate-500">
                <span className="capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        {!isPremium ? (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-8" data-testid="upgrade-card">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  Upgrade para Premium
                </h3>
                <p className="text-slate-700 leading-relaxed">
                  Aproveite todos os benefícios sem interrupções de anúncios
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-700 font-medium">Sem anúncios</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-700 font-medium">Análises detalhadas de desempenho</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-700 font-medium">Acesso prioritário a novos simulados</span>
              </div>
            </div>

            <button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold py-4 rounded-full hover:from-amber-500 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              data-testid="upgrade-button"
            >
              <Sparkles className="w-5 h-5 inline mr-2" />
              Fazer Upgrade Agora
            </button>

            <p className="text-center text-sm text-slate-600 mt-4">
              Atualização instantânea - Mockup para demonstração
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-8 text-center">
            <Crown className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Você é Premium!</h3>
            <p className="text-slate-700">
              Aproveite todos os benefícios da sua inscrição Premium
            </p>
          </div>
        )}
      </main>
    </div>
  );
}