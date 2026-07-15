import API from './axios';

export const loginUser = (credentials) => API.post('/auth/login/', credentials);
export const registerUser = (userData) => API.post('/auth/register/', userData);
export const getProfile = () => API.get('/users/me/');