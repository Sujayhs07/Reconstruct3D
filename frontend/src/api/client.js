import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = () => api.get('/health');
export const getNetworkInfo = () => api.get('/network-info');

// Projects
export const getProjects = () => api.get('/projects');
export const getProjectStatsSummary = () => api.get('/projects/stats/summary');
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Images
export const getProjectImages = (projectId) => api.get(`/projects/${projectId}/images`);
export const uploadImages = (projectId, formData, onUploadProgress) => {
  return api.post(`/projects/${projectId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
};
export const deleteImage = (projectId, imageId) => api.delete(`/projects/${projectId}/images/${imageId}`);

// Analysis & Angle Coverage
export const getImageAnalysis = (projectId) => api.get(`/projects/${projectId}/analysis`);
export const getAngleCoverage = (projectId) => api.get(`/projects/${projectId}/analysis/coverage`);

// Features
export const getFeatureMatches = (projectId) => api.get(`/projects/${projectId}/features`);
export const runFeatureMatch = (projectId, data) => api.post(`/projects/${projectId}/features`, data);

// Reconstruction
export const startReconstruction = (projectId, data) => api.post(`/projects/${projectId}/reconstruct`, data);
export const cancelReconstruction = (projectId) => api.post(`/projects/${projectId}/cancel`);
export const getReconstructionStatus = (projectId) => api.get(`/projects/${projectId}/status`);
export const getReconstructionLogs = (projectId, limit = 200) => api.get(`/projects/${projectId}/logs?limit=${limit}`);
export const getCameraPoses = (projectId) => api.get(`/projects/${projectId}/camera_poses`);

// 3D Models & Point Clouds
export const getProjectModels = (projectId) => api.get(`/projects/${projectId}/models`);
export const getModelStats = (projectId) => api.get(`/projects/${projectId}/models/stats`);
export const getModelDownloadUrl = (projectId, filename) => `/api/projects/${projectId}/models/download/${filename}`;

// Settings & AI Engine
export const getAppSettings = () => api.get('/settings');
export const updateAppSettings = (data) => api.post('/settings', data);
export const testMeshyApiKey = () => api.post('/settings/test-meshy');

// WebSocket URL
export const getProjectWsUrl = (projectId) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws/projects/${projectId}`;
};

export default api;
