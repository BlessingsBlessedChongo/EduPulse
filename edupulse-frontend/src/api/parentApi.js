import API from './axios';

export const getMyChildren = () => API.get('/parents/my-children/');
export const getChildProgress = (studentId) => API.get(`/analytics/student-progress/${studentId}/`);
export const getChildAttendance = (studentId) => API.get(`/attendance/?student_id=${studentId}`);  // we'll need to add filter