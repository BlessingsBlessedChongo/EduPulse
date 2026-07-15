import API from './axios';

export const getNotifications = () => API.get('/notifications/');
export const markRead = (id) => API.post(`/notifications/${id}/mark_read/`);
export const markAllRead = () => API.post('/notifications/mark_all_read/');