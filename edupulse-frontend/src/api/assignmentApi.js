import API from './axios';

// Teacher: create assignment
export const createAssignment = (data) => API.post('/assignments/', data);

// Teacher: get all assignments for a specific class
export const getClassAssignments = (classId) => API.get(`/assignments/?class_id=${classId}`);

// Teacher: get assignments for all my classes (optional filter)
export const getMyAssignments = () => API.get('/assignments/?my=true');  // we'll add backend filter

// Student: get assignments for my enrolled classes (upcoming or all)
export const getMyStudentAssignments = (upcoming = false) => {
  const params = upcoming ? { upcoming: 'true' } : {};
  return API.get('/assignments/', { params });
};

// Student: submit assignment
export const submitAssignment = (assignmentId, formData) => 
  API.post(`/submissions/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }); // note: assignment ID is inside formData

// Teacher: get submissions for an assignment
export const getSubmissionsForAssignment = (assignmentId) =>
  API.get(`/submissions/?assignment_id=${assignmentId}`);  // we'll add backend filter

// Teacher: grade a submission
export const gradeSubmission = (submissionId, data) =>
  API.post(`/submissions/${submissionId}/grade/`, data);