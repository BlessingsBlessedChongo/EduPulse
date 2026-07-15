import API from './axios';

export const getStudentProfile = () => API.get('/students/me/'); // We'll need a student profile endpoint that returns the logged-in student's profile (including id). Let's add a custom view for that or use /students/?user=me. We'll solve with a custom action.
export const getEnrolledClasses = () => API.get('/classes/?enrolled=true');  // we need to implement filtering
export const getClassAssignments = (classId) => API.get(`/assignments/?class_id=${classId}`);
export const getUpcomingAssignments = () => API.get('/assignments/upcoming/');
export const getSubmissions = () => API.get('/submissions/');
export const getGamificationProfile = () => API.get('/gamification/my_profile/');
export const getLeaderboard = () => API.get('/gamification/leaderboard/');
export const getNotifications = () => API.get('/notifications/');
export const markNotificationRead = (id) => API.post(`/notifications/${id}/mark_read/`);
export const markAllNotificationsRead = () => API.post('/notifications/mark_all_read/');
export const submitAssignment = (formData) => API.post('/submissions/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getAttendance = () => API.get('/attendance/');
export const getStudentProfile = () => API.get('/students/me/');
export const getEnrolledClasses = () => API.get('/classes/?enrolled=true');
export const getUpcomingAssignments = () => API.get('/assignments/?upcoming=true');
export const getSubmissions = () => API.get('/submissions/');
export const getGamificationProfile = () => API.get('/gamification/my_profile/');