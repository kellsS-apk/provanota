import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Toaster } from 'sonner';
import '@/App.css';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ExamDetail from './pages/ExamDetail';
import Simulation from './pages/Simulation';
import Results from './pages/Results';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import ExamForm from './pages/ExamForm';
import QuestionManager from './pages/QuestionManager';
import CreateSimulation from './pages/CreateSimulation';
import MySimulations from './pages/MySimulations';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      <Route path="/exam/:examId" element={
        <ProtectedRoute>
          <ExamDetail />
        </ProtectedRoute>
      } />

      <Route path="/simulation/:attemptId" element={
        <ProtectedRoute>
          <Simulation />
        </ProtectedRoute>
      } />

      <Route path="/results/:attemptId" element={
        <ProtectedRoute>
          <Results />
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />

      {/* Simulation Routes */}
      <Route path="/simulations/create" element={
        <ProtectedRoute>
          <CreateSimulation />
        </ProtectedRoute>
      } />

      <Route path="/simulations/my" element={
        <ProtectedRoute>
          <MySimulations />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="/admin/exams/new" element={
        <ProtectedRoute adminOnly>
          <ExamForm />
        </ProtectedRoute>
      } />

      <Route path="/admin/exams/:examId/questions" element={
        <ProtectedRoute adminOnly>
          <QuestionManager />
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
