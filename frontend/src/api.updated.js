import axios from 'axios';

// Backend base URL (configure via Vercel env: REACT_APP_BACKEND_URL)
const ENV_BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || '').trim();

function normalizeBaseUrl(url) {
  if (!url) return '';
  // Remove trailing slash
  const noTrailing = url.replace(/\/+$/, '');
  // If env already points to /api, keep it; otherwise append /api
  return noTrailing.endsWith('/api') ? noTrailing : `${noTrailing}/api`;
}

// If ENV_BACKEND_URL is empty, we fall back to same-origin '/api' (only works if you proxy backend behind the same domain).
export const API_URL = normalizeBaseUrl(ENV_BACKEND_URL) || '/api';

// Helpful runtime check (won't crash the app)
if (!ENV_BACKEND_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    '[api] REACT_APP_BACKEND_URL is not set. Using "/api" as fallback. ' +
      'If your backend is on Render/another domain, set REACT_APP_BACKEND_URL in Vercel.'
  );
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Exams (Student)
export const getExams = () => api.get('/exams');
export const getExam = (id) => api.get(`/exams/${id}`);
export const getExamQuestions = (id) => api.get(`/exams/${id}/questions`);

// Attempts
export const createAttempt = (data) => api.post('/attempts', data);
export const getAttempt = (id) => api.get(`/attempts/${id}`);
export const saveAnswer = (attemptId, data) => api.post(`/attempts/${attemptId}/answer`, data);
export const submitAttempt = (id) => api.post(`/attempts/${id}/submit`, {});
export const getUserAttempts = () => api.get('/attempts');

// Admin - Exams
export const getAdminExams = () => api.get('/admin/exams');
export const createExam = (data) => api.post('/admin/exams', data);
export const getAdminExam = (id) => api.get(`/admin/exams/${id}`);
export const updateExam = (id, data) => api.put(`/admin/exams/${id}`, data);
export const deleteExam = (id) => api.delete(`/admin/exams/${id}`);
export const publishExam = (id) => api.post(`/admin/exams/${id}/publish`);
export const unpublishExam = (id) => api.post(`/admin/exams/${id}/unpublish`);

// Admin - Questions
export const getAdminQuestions = (examId) => api.get(`/admin/exams/${examId}/questions`);
export const createQuestion = (data) => api.post('/admin/questions', data);
export const updateQuestion = (id, data) => api.put(`/admin/questions/${id}`, data);
export const deleteQuestion = (id) => api.delete(`/admin/questions/${id}`);

// Admin - Import
export const importQuestions = (data) => api.post('/admin/import/questions', data);

// Simulations
export const generateSimulation = (data) => api.post('/simulations/generate', data);
export const getMySimulations = () => api.get('/simulations/my');
export const getSimulation = (id) => api.get(`/simulations/${id}`);
export const getSimulationQuestions = (id) => api.get(`/simulations/${id}/questions`);
export const createSimulationAttempt = (simulationId) => api.post(`/simulations/${simulationId}/attempt`);

// Metadata
export const getSubjects = () => api.get('/metadata/subjects');
export const getTopics = (subject) => api.get(`/metadata/topics/${encodeURIComponent(subject)}`);
export const getFilterOptions = () => api.get('/metadata/filters');
export const getQuestionCount = (params) => api.get('/metadata/question-count', { params });

// Stats
export const getDashboardStats = () => api.get('/stats/dashboard');

// User
export const updateSubscription = () => api.put('/users/subscription');

export default api;