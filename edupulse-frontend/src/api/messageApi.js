import API from './axios';

export const getMessages = () => API.get('/messages/');
export const sendMessage = (data) => API.post('/messages/', data);