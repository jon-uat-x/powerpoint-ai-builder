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

// Template Prompts APIs
export const templatePromptsAPI = {
  getAll: () => api.get('/template-prompts'),
  getByLayout: (layoutName) => api.get(`/template-prompts/${encodeURIComponent(layoutName)}`),
  updateAll: (layoutName, prompts) => api.put(`/template-prompts/${encodeURIComponent(layoutName)}`, { prompts }),
  updateSingle: (layoutName, placeholderId, prompt) => 
    api.patch(`/template-prompts/${encodeURIComponent(layoutName)}/${encodeURIComponent(placeholderId)}`, { prompt }),
  delete: (layoutName, placeholderId) => 
    api.delete(`/template-prompts/${encodeURIComponent(layoutName)}/${encodeURIComponent(placeholderId)}`),
};

export default api;