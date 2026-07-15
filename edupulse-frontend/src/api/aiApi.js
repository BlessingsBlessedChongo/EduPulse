import API from './axios';

export const analyzeSentiment = (text) => API.post('/ai/sentiment/', { text });
export const checkGrammar = (text) => API.post('/ai/grammar/', { text });
export const getRiskAssessment = (studentId) => API.get(`/ai/risk/${studentId}/`);