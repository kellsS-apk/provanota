import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { BookOpen, User, LogOut, Crown } from 'lucide-react';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50" data-testid="main-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <BookOpen className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold text-primary tracking-tight">ProvaNota</span>
          </Link>

          <nav className="flex items-center gap-6">
            {user.role === 'admin' && (
              <Link 
                to="/admin" 
                className="text-slate-600 hover:text-primary transition-colors font-medium"
                data-testid="admin-link"
              >
                Admin
              </Link>
            )}
            
            <Link 
              to="/dashboard" 
              className="text-slate-600 hover:text-primary transition-colors font-medium"
              data-testid="dashboard-link"
            >
              Simulados
            </Link>

            <Link 
              to="/profile" 
              className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors"
              data-testid="profile-link"
            >
              <User className="w-5 h-5" />
              <span className="font-medium">{user.name}</span>
              {user.subscription_status === 'premium' && (
                <Crown className="w-4 h-4 text-accent" data-testid="premium-crown-icon" />
              )}
            </Link>

            <button 
              onClick={handleLogout} 
              className="text-slate-600 hover:text-red-600 transition-colors"
              data-testid="logout-button"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};