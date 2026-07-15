import { useState, useEffect } from 'react';
import {
  Container, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, InputLabel, FormControl, IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getAllUsers, createUser, updateUser, deleteUser } from '../api/adminApi';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '', first_name: '', last_name: '', role: 'STUDENT', password: ''
  });

  const fetchUsers = async () => {
    const res = await getAllUsers();
    setUsers(res.data);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({ email: '', first_name: '', last_name: '', role: 'STUDENT', password: '' });
    setOpenForm(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      password: '',
    });
    setOpenForm(true);
  };

  const handleClose = () => setOpenForm(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, formData);
      } else {
        await createUser(formData);
      }
      handleClose();
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Delete this user?')) {
      await deleteUser(userId);
      fetchUsers();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>User Management</Typography>
      <Button variant="contained" onClick={handleOpenCreate} sx={{ mb: 2 }}>
        Add New User
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.first_name} {u.last_name}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenEdit(u)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(u.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openForm} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent>
          <TextField name="email" label="Email" fullWidth margin="dense" value={formData.email} onChange={handleChange} required />
          <TextField name="first_name" label="First Name" fullWidth margin="dense" value={formData.first_name} onChange={handleChange} required />
          <TextField name="last_name" label="Last Name" fullWidth margin="dense" value={formData.last_name} onChange={handleChange} required />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select name="role" value={formData.role} label="Role" onChange={handleChange}>
              <MenuItem value="STUDENT">Student</MenuItem>
              <MenuItem value="TEACHER">Teacher</MenuItem>
              <MenuItem value="ADMIN">Admin</MenuItem>
              <MenuItem value="PARENT">Parent</MenuItem>
            </Select>
          </FormControl>
          <TextField name="password" label={editingUser ? "New Password (leave blank to keep)" : "Password"} type="password" fullWidth margin="dense" value={formData.password} onChange={handleChange} required={!editingUser} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>{editingUser ? 'Save' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}