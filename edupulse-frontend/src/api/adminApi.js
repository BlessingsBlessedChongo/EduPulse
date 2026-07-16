import API from './axios';

export const getSchoolOverview = () => API.get('/analytics/school-overview/');
export const getAllUsers = () => API.get('/users/');
export const createUser = (userData) => API.post('/users/', userData);
export const updateUser = (userId, userData) => API.put(`/users/${userId}/`, userData);
export const deleteUser = (userId) => API.delete(`/users/${userId}/`);
export const getAllClasses = () => API.get('/classes/');
export const getAllStudents = () => API.get('/students/');
export const getAllTeachers = () => API.get('/teachers/');
export const getAttendanceReport = (classId) => API.get(`/analytics/class-performance/${classId}/`);
