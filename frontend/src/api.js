import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
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

// User
export const updateSubscription = () => api.put('/users/subscription');

export default api;