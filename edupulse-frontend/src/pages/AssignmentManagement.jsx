import { useState, useEffect } from 'react';
import {
  Container, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, IconButton, MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { getMyAssignments, createAssignment } from '../api/assignmentApi';
import { getMyClasses } from '../api/classApi';
import { Link } from 'react-router-dom';

export default function AssignmentManagement() {
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [formData, setFormData] = useState({
    class_obj: '',
    title: '',
    description: '',
    due_date: '',
    max_points: 100,
  });

  const fetchData = async () => {
    try {
      const [assignRes, classesRes] = await Promise.all([
        getMyAssignments(),
        getMyClasses()
      ]);
      setAssignments(assignRes.data);
      setClasses(classesRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      await createAssignment(formData);
      setOpenCreate(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Assignment Management
      </Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)} sx={{ mb: 2 }}>
        Create New Assignment
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Max Points</TableCell>
              <TableCell>Submissions</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assignments.map(asgn => (
              <TableRow key={asgn.id}>
                <TableCell>{asgn.title}</TableCell>
                <TableCell>{asgn.class_obj_name}</TableCell>
                <TableCell>{new Date(asgn.due_date).toLocaleDateString()}</TableCell>
                <TableCell>{asgn.max_points}</TableCell>
                <TableCell>{asgn.submission_count || 0}</TableCell>
                <TableCell>
                  <IconButton component={Link} to={`/teacher/submissions/${asgn.id}`}>
                    <VisibilityIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Assignment Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Assignment</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Class</InputLabel>
            <Select name="class_obj" value={formData.class_obj} label="Class" onChange={handleChange}>
              {classes.map(cls => (
                <MenuItem key={cls.id} value={cls.id}>{cls.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField name="title" label="Title" fullWidth margin="dense" value={formData.title} onChange={handleChange} />
          <TextField name="description" label="Description" fullWidth multiline rows={3} margin="dense" value={formData.description} onChange={handleChange} />
          <TextField name="due_date" label="Due Date & Time" type="datetime-local" fullWidth margin="dense" InputLabelProps={{ shrink: true }} value={formData.due_date} onChange={handleChange} />
          <TextField name="max_points" label="Max Points" type="number" fullWidth margin="dense" value={formData.max_points} onChange={handleChange} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit}>Create</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
