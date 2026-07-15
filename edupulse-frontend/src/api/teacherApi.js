import API from './axios';

export const getTeacherProfile = () => API.get('/teachers/me/');
export const getMyClasses = () => API.get('/classes/?my=true');   // we'll add filter
export const getPendingSubmissions = () => API.get('/submissions/pending/');
export const getClassRoster = (classId) => API.get(`/classes/${classId}/students/`);
export const createAssignment = (data) => API.post('/assignments/', data);
export const gradeSubmission = (submissionId, data) => API.post(`/submissions/${submissionId}/grade/`, data);
export const markAttendance = (data) => API.post('/attendance/', data);
export const getClassAttendance = (classId) => API.get(`/attendance/?class_id=${classId}`);
export const getRiskAssessment = (studentId) => API.get(`/ai/risk/${studentId}/`);