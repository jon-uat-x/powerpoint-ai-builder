import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error.response?.data || error.message);
  }
);

// Layout APIs
export const layoutAPI = {
  getAll: () => api.get('/layouts'),
  getByName: (name) => api.get(`/layouts/${encodeURIComponent(name)}`),
};

// Pitchbook APIs
export const pitchbookAPI = {
  getAll: () => api.get('/pitchbooks'),
  getById: (id) => api.get(`/pitchbooks/${id}`),
  create: (data) => api.post('/pitchbooks', data),
  update: (id, data) => api.put(`/pitchbooks/${id}`, data),
  delete: (id) => api.delete(`/pitchbooks/${id}`),
};

// Thumbnail APIs
export const thumbnailAPI = {
  getAll: (format = 'base64') => api.get(`/thumbnails?format=${format}`),
  getByLayout: (layoutName, format = 'base64') => 
    api.get(`/thumbnails/${encodeURIComponent(layoutName)}?format=${format}`),
};

// Generate APIs
export const generateAPI = {
  generate: (pitchbookId) => api.post(`/generate/${pitchbookId}`),
  getStatus: (pitchbookId) => api.get(`/generate/${pitchbookId}/status`),
};

export default api;