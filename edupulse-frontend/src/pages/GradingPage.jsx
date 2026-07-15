import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField
} from '@mui/material';
import { getSubmissionsForAssignment, gradeSubmission } from '../api/assignmentApi';

export default function GradingPage() {
  const { assignmentId } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [openGrade, setOpenGrade] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');

  const fetchSubmissions = async () => {
    try {
      const res = await getSubmissionsForAssignment(assignmentId);
      setSubmissions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId]);

  const handleOpenGrade = (submission) => {
    setSelectedSubmission(submission);
    setGrade(submission.grade || '');
    setFeedback(submission.feedback || '');
    setOpenGrade(true);
  };

  const handleCloseGrade = () => {
    setSelectedSubmission(null);
    setOpenGrade(false);
  };

  const handleSubmitGrade = async () => {
    if (!selectedSubmission) return;
    try {
      await gradeSubmission(selectedSubmission.id, { grade, feedback });
      handleCloseGrade();
      fetchSubmissions();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Submissions for Assignment
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Submitted At</TableCell>
              <TableCell>File</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.map(sub => (
              <TableRow key={sub.id}>
                <TableCell>{sub.student_name}</TableCell>
                <TableCell>{new Date(sub.submitted_at).toLocaleString()}</TableCell>
                <TableCell>{sub.file ? <a href={sub.file} target="_blank">View</a> : 'N/A'}</TableCell>
                <TableCell>{sub.grade !== null ? `${sub.grade}%` : 'Ungraded'}</TableCell>
                <TableCell>
                  <Button variant="contained" size="small" onClick={() => handleOpenGrade(sub)}>
                    {sub.grade !== null ? 'Edit Grade' : 'Grade'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Grade Dialog */}
      <Dialog open={openGrade} onClose={handleCloseGrade} maxWidth="sm" fullWidth>
        <DialogTitle>Grade Submission</DialogTitle>
        <DialogContent>
          <TextField
            label="Grade (out of 100)"
            type="number"
            fullWidth
            margin="dense"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          />
          <TextField
            label="Feedback"
            multiline
            rows={4}
            fullWidth
            margin="dense"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGrade}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmitGrade}>Save Grade</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}