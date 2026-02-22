// src/api.js
import axios from 'axios';

const API_BASE =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
});

// Se você usa token (AuthContext), pode setar em algum lugar do app assim:
// api.defaults.headers.common.Authorization = `Bearer ${token}`;

// ---------- Auth ----------
export const login = (email, password) => api.post('/login', { email, password });
export const register = (email, password, name) => api.post('/register', { email, password, name });

// ---------- Exams ----------
export const getExams = () => api.get('/exams');
export const getExam = (id) => api.get(`/exams/${id}`);
export const createExam = (payload) => api.post('/exams', payload);
export const publishExam = (id) => api.post(`/exams/${id}/publish`);

// ---------- Questions ----------
export const importQuestions = (payload) => api.post('/admin/import/questions', payload);
export const createQuestion = (payload) => api.post('/questions', payload);
export const updateQuestion = (id, payload) => api.put(`/questions/${id}`, payload);
export const deleteQuestion = (id) => api.delete(`/questions/${id}`);

// ---------- Attempts / Simulation ----------
export const createAttempt = (exam_id) => api.post('/attempts', { exam_id });
export const getAttempt = (attemptId) => api.get(`/attempts/${attemptId}`);

// ✅ ESSA É A FUNÇÃO QUE ESTAVA FALTANDO
export const getAttemptReview = (attemptId) => api.get(`/attempts/${attemptId}/review`);

export const saveAnswer = (attemptId, payload) => api.post(`/attempts/${attemptId}/answer`, payload);
export const submitAttempt = (attemptId) => api.post(`/attempts/${attemptId}/submit`);
export const getMyAttempts = () => api.get('/attempts');

export default api;
