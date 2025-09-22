import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if it's not a token verification request
      if (!error.config?.url?.includes('/verify-token')) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/admin/login', credentials),
  verifyToken: () => api.get('/admin/verify-token'),
};

// Student API
export const studentAPI = {
  getFeedbackForm: (formId) => api.get(`/student/feedback-form/${formId}`),
  getCourses: () => api.get('/student/courses'),
  getSubjectsByCourse: (courseId, year, semester) => api.get(`/student/subjects/${courseId}/${year}/${semester}`),
  submitFeedback: (data) => api.post('/student/submit-feedback', data),
};

// Admin API
export const adminAPI = {
  // Faculty
  getFaculty: () => api.get('/admin/faculty'),
  createFaculty: (data) => {
    // Handle custom designation and department
    const payload = { ...data };
    if (data.designation === 'Other' && data.customDesignation) {
      payload.designation = data.customDesignation;
    }
    if (data.department === 'Other' && data.customDepartment) {
      payload.department = data.customDepartment;
    }
    return api.post('/admin/faculty', payload);
  },
  updateFaculty: (id, data) => api.put(`/admin/faculty/${id}`, data),
  deleteFaculty: (id) => api.delete(`/admin/faculty/${id}`),

  // Courses
  getCourses: () => api.get('/admin/courses'),
  createCourse: (data) => api.post('/admin/courses', data),
  updateCourse: (id, data) => api.put(`/admin/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/admin/courses/${id}`),

  // Subjects
  getSubjects: () => api.get('/admin/subjects'),
  createSubject: (data) => api.post('/admin/subjects', data),
  updateSubject: (id, data) => api.put(`/admin/subjects/${id}`, data),
  deleteSubject: (id) => api.delete(`/admin/subjects/${id}`),

  // Feedback Forms
  getFeedbackForms: () => api.get('/admin/feedback-forms'),
  createFeedbackForm: (data) => api.post('/admin/feedback-forms', data),
  updateFeedbackForm: (id, data) => api.put(`/admin/feedback-forms/${id}`, data),
  deleteFeedbackForm: (id) => api.delete(`/admin/feedback-forms/${id}`),
  activateFeedbackForm: (id) => api.patch(`/admin/feedback-forms/${id}/activate`),
  deactivateFeedbackForm: (id) => api.patch(`/admin/feedback-forms/${id}/deactivate`),
};

// Response API
export const responseAPI = {
  getResponses: (params) => api.get('/responses', { params }),
  getResponse: (id) => api.get(`/responses/${id}`),
  getQuestionAnalytics: (params) => api.get('/responses/analytics/questions', { params }),
  getFacultyQuestionAnalytics: (params) => api.get('/responses/analytics/faculty-questions', { params }),
  getStats: (params) => api.get('/responses/stats/overview', { params }),
  getFacultyPerformance: (params) => api.get('/responses/stats/faculty-performance', { params }),
  exportCSV: (params) => api.get('/responses/export/csv', { params, responseType: 'blob' }),
  deleteResponse: (id) => api.delete(`/responses/${id}`),
};

export default api;
