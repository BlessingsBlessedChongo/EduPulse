import { useState, useEffect } from 'react';
import {
  Container, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField
} from '@mui/material';
import { getMyStudentAssignments, submitAssignment } from '../api/assignmentApi';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [openSubmit, setOpenSubmit] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [file, setFile] = useState(null);
  const [textContent, setTextContent] = useState('');

  const fetchAssignments = async () => {
    try {
      const res = await getMyStudentAssignments();
      setAssignments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleOpenSubmit = (assignment) => {
    setSelectedAssignment(assignment);
    setOpenSubmit(true);
  };

  const handleCloseSubmit = () => {
    setSelectedAssignment(null);
    setOpenSubmit(false);
    setFile(null);
    setTextContent('');
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    const formData = new FormData();
    formData.append('assignment', selectedAssignment.id);
    if (file) formData.append('file', file);
    if (textContent) formData.append('text_content', textContent);

    try {
      await submitAssignment(selectedAssignment.id, formData);
      handleCloseSubmit();
      fetchAssignments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Assignments
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Max Points</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assignments.map(asgn => (
              <TableRow key={asgn.id}>
                <TableCell>{asgn.title}</TableCell>
                <TableCell>{asgn.class_obj_name}</TableCell>
                <TableCell>{new Date(asgn.due_date).toLocaleDateString()}</TableCell>
                <TableCell>{asgn.max_points}</TableCell>
                <TableCell>
                  {asgn.has_submitted ? 'Submitted' : 'Not Submitted'}
                </TableCell>
                <TableCell>
                  {!asgn.has_submitted && (
                    <Button variant="contained" size="small" onClick={() => handleOpenSubmit(asgn)}>
                      Submit
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Submit Dialog */}
      <Dialog open={openSubmit} onClose={handleCloseSubmit} maxWidth="sm" fullWidth>
        <DialogTitle>Submit Assignment: {selectedAssignment?.title}</DialogTitle>
        <DialogContent>
          <TextField
            label="Text Response"
            multiline
            rows={4}
            fullWidth
            margin="dense"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
          />
          <Button variant="outlined" component="label" sx={{ mt: 2 }}>
            Upload File
            <input type="file" hidden onChange={handleFileChange} />
          </Button>
          {file && <Typography variant="body2" sx={{ mt: 1 }}>{file.name}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSubmit}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}