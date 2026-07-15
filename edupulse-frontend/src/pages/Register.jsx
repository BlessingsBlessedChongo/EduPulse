import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../store/authSlice';
import { TextField, Button, Typography, Select, MenuItem, InputLabel, FormControl } from '@mui/material';

export default function Register() {
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', role: 'STUDENT', password: '', password2: '' });
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(register(form));
    if (!result.error) {
      navigate('/login');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <Typography variant="h4" gutterBottom>Create Account</Typography>
      {error && <Typography color="error">{typeof error === 'object' ? JSON.stringify(error) : error}</Typography>}
      <form onSubmit={handleSubmit}>
        <TextField fullWidth label="Email" name="email" margin="normal" value={form.email} onChange={handleChange} required />
        <TextField fullWidth label="First Name" name="first_name" margin="normal" value={form.first_name} onChange={handleChange} required />
        <TextField fullWidth label="Last Name" name="last_name" margin="normal" value={form.last_name} onChange={handleChange} required />
        <FormControl fullWidth margin="normal">
          <InputLabel>Role</InputLabel>
          <Select name="role" value={form.role} label="Role" onChange={handleChange}>
            <MenuItem value="STUDENT">Student</MenuItem>
            <MenuItem value="TEACHER">Teacher</MenuItem>
            <MenuItem value="ADMIN">Admin</MenuItem>
            <MenuItem value="PARENT">Parent</MenuItem>
          </Select>
        </FormControl>
        <TextField fullWidth label="Password" name="password" type="password" margin="normal" value={form.password} onChange={handleChange} required />
        <TextField fullWidth label="Confirm Password" name="password2" type="password" margin="normal" value={form.password2} onChange={handleChange} required />
        <Button variant="contained" type="submit" disabled={loading} sx={{ mt: 2 }}>
          {loading ? 'Registering...' : 'Register'}
        </Button>
      </form>
      <Typography sx={{ mt: 2 }}>
        Already have an account? <Link to="/login">Login</Link>
      </Typography>
    </div>
  );
}