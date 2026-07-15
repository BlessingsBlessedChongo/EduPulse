import { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Button, IconButton, Typography, CircularProgress, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getClasses, deleteClass } from '../api/classApi';
import { useAuth } from '../hooks/useAuth';

export default function ClassList() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);

  const fetchClasses = async () => {
    try {
      // Teachers see only their classes, Admin sees all
      const params = user.role === 'TEACHER' ? { my: 'true' } : {};
      const res = await getClasses(params);
      setClasses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      await deleteClass(id);
      fetchClasses();
    }
  };

  const handleEditOpen = (cls) => {
    setSelectedClass(cls);
    setOpenEdit(true);
  };

  const handleEditClose = () => {
    setSelectedClass(null);
    setOpenEdit(false);
  };

  if (loading) return <CircularProgress />;

  return (
    <>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Teacher</TableCell>
              <TableCell>Academic Year</TableCell>
              <TableCell>Students</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {classes.map(cls => (
              <TableRow key={cls.id}>
                <TableCell>{cls.name}</TableCell>
                <TableCell>{cls.subject}</TableCell>
                <TableCell>{cls.teacher_name || 'N/A'}</TableCell>
                <TableCell>{cls.academic_year}</TableCell>
                <TableCell>{cls.enrollment_count || 0}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEditOpen(cls)}><EditIcon /></IconButton>
                  {user.role === 'ADMIN' && (
                    <IconButton onClick={() => handleDelete(cls.id)}><DeleteIcon /></IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog – we'll add full editing later */}
      <Dialog open={openEdit} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Class</DialogTitle>
        <DialogContent>
          {/* Edit form will go here */}
          <Typography>Edit form coming soon.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button variant="contained" color="primary">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}