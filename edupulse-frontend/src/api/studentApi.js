import API from './axios';

export const getStudentProfile = () => API.get('/students/me/');
export const getEnrolledClasses = () => API.get('/classes/?enrolled=true');
export const getClassAssignments = (classId) => API.get(`/assignments/?class_id=${classId}`);
export const getUpcomingAssignments = () => API.get('/assignments/?upcoming=true');
export const getSubmissions = () => API.get('/submissions/');
export const getGamificationProfile = () => API.get('/gamification/my_profile/');
export const getLeaderboard = () => API.get('/gamification/leaderboard/');
export const getNotifications = () => API.get('/notifications/');
export const markNotificationRead = (id) => API.post(`/notifications/${id}/mark_read/`);
export const markAllNotificationsRead = () => API.post('/notifications/mark_all_read/');
export const submitAssignment = (formData) => API.post('/submissions/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getAttendance = () => API.get('/attendance/');
