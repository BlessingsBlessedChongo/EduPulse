import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../store/authSlice';
import {
  TextField,
  Button,
  Typography,
  Box,
  Container,
  Card,
  CircularProgress,
  Alert,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login({ email, password }));
    if (!result.error) {
      const role = result.payload.role.toLowerCase();
      navigate(`/${role}`);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--accent-500) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            p: { xs: 3, sm: 5 },
            background: 'var(--surface)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
              <SchoolIcon sx={{ fontSize: '40px', color: '#3b5bde' }} />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                EduPulse
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              Sign in to your account to continue
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="label" sx={{ fontWeight: 600, mb: 1, display: 'block', color: 'var(--text-primary)' }}>
                Email Address
              </Typography>
              <TextField
                fullWidth
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    background: 'var(--surface-alt)',
                    transition: 'all 300ms',
                    '&:hover fieldset': {
                      borderColor: '#3b5bde',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3b5bde',
                      boxShadow: '0 0 0 3px rgba(59, 91, 222, 0.1)',
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="label" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Password
                </Typography>
                <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                  <Typography variant="caption" sx={{ color: '#3b5bde', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                    Forgot?
                  </Typography>
                </Link>
              </Box>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      background: 'var(--surface-alt)',
                      transition: 'all 300ms',
                      '&:hover fieldset': {
                        borderColor: '#3b5bde',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3b5bde',
                        boxShadow: '0 0 0 3px rgba(59, 91, 222, 0.1)',
                      },
                    },
                  }}
                />
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  sx={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
                  disabled={loading}
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </Box>
            </Box>

            {/* Submit Button */}
            <Button
              fullWidth
              type="submit"
              disabled={loading}
              sx={{
                mt: 3,
                py: 1.5,
                background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)',
                color: 'white',
                fontWeight: 700,
                fontSize: '1rem',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(59, 91, 222, 0.2)',
                textTransform: 'none',
                '&:hover': {
                  boxShadow: '0 15px 35px rgba(59, 91, 222, 0.3)',
                  transform: 'translateY(-2px)',
                },
                '&:disabled': {
                  opacity: 0.7,
                },
                transition: 'all 300ms',
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                  Signing in...
                </Box>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Divider */}
          <Box sx={{ my: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
            <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>
              New to EduPulse?
            </Typography>
            <Box sx={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
          </Box>

          {/* Sign Up Link */}
          <Button
            fullWidth
            component={Link}
            to="/register"
            variant="outlined"
            disabled={loading}
            sx={{
              py: 1.5,
              borderColor: '#3b5bde',
              color: '#3b5bde',
              fontWeight: 700,
              fontSize: '1rem',
              borderRadius: '8px',
              border: '2px solid',
              textTransform: 'none',
              '&:hover': {
                background: 'rgba(59, 91, 222, 0.05)',
              },
              transition: 'all 300ms',
            }}
          >
            Create Account
          </Button>
        </Card>
      </Container>
    </Box>
  );
}
