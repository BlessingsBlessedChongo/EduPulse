import API from './axios';

export const getClasses = (params = {}) => API.get('/classes/', { params });
export const getClass = (id) => API.get(`/classes/${id}/`);
export const createClass = (data) => API.post('/classes/', data);
export const updateClass = (id, data) => API.put(`/classes/${id}/`, data);
export const deleteClass = (id) => API.delete(`/classes/${id}/`);
export const enrollStudent = (classId, studentId) => API.post(`/classes/${classId}/enroll/`, { student_id: studentId });
export const unenrollStudent = (classId, studentId) => API.post(`/classes/${classId}/unenroll/`, { student_id: studentId });
export const getClassStudents = (classId) => API.get(`/classes/${classId}/students/`);
export const getAllStudents = () => API.get('/students/'); // for enrollment dropdown