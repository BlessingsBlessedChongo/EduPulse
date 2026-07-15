import { useState } from 'react';
import { Container, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClassList from '../components/ClassList';
import { createClass } from '../api/classApi';
import { useAuth } from '../hooks/useAuth';

export default function ClassManagement() {
  const { user } = useAuth();
  const [openCreate, setOpenCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    teacher: '',  // teacher profile id
    room: '',
    schedule: '',
    academic_year: '',
    max_students: 30,
    description: ''
  });

  const handleOpenCreate = () => setOpenCreate(true);
  const handleCloseCreate = () => setOpenCreate(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      await createClass(formData);
      handleCloseCreate();
      // refresh list
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Class Management
      </Typography>
      {user.role === 'ADMIN' && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} sx={{ mb: 2 }}>
          Add New Class
        </Button>
      )}
      <ClassList />

      {/* Create Class Dialog */}
      <Dialog open={openCreate} onClose={handleCloseCreate} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Class</DialogTitle>
        <DialogContent>
          <TextField name="name" label="Class Name" fullWidth margin="dense" value={formData.name} onChange={handleChange} />
          <TextField name="subject" label="Subject" fullWidth margin="dense" value={formData.subject} onChange={handleChange} />
          {/* Teacher field: ideally a dropdown of teachers; for now manual input of teacher ID */}
          <TextField name="teacher" label="Teacher ID" fullWidth margin="dense" value={formData.teacher} onChange={handleChange} />
          <TextField name="room" label="Room" fullWidth margin="dense" value={formData.room} onChange={handleChange} />
          <TextField name="schedule" label="Schedule" fullWidth margin="dense" value={formData.schedule} onChange={handleChange} />
          <TextField name="academic_year" label="Academic Year" fullWidth margin="dense" value={formData.academic_year} onChange={handleChange} />
          <TextField name="max_students" label="Max Students" type="number" fullWidth margin="dense" value={formData.max_students} onChange={handleChange} />
          <TextField name="description" label="Description" multiline rows={3} fullWidth margin="dense" value={formData.description} onChange={handleChange} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreate}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit}>Create</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}