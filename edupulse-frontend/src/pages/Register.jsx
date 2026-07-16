import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../store/authSlice';
import {
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Box,
  Container,
  Card,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const steps = ['Account Details', 'Personal Info', 'Choose Role'];

export default function Register() {
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'STUDENT',
    password: '',
    password2: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(register(form));
    if (!result.error) {
      navigate('/login');
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
              Create Your Account
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              Join thousands of educators transforming education
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label, index) => (
              <Step key={label} completed={activeStep > index}>
                <StepLabel sx={{
                  '& .MuiStepLabel-label': {
                    fontSize: '0.875rem',
                    fontWeight: activeStep === index ? 600 : 500,
                  },
                }}>
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
              {typeof error === 'object' ? JSON.stringify(error) : error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Step 0: Email & Password */}
            {activeStep === 0 && (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="label" sx={{ fontWeight: 600, mb: 1, display: 'block', color: 'var(--text-primary)' }}>
                    Email Address
                  </Typography>
                  <TextField
                    fullWidth
                    type="email"
                    placeholder="you@example.com"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        background: 'var(--surface-alt)',
                        '&:hover fieldset': { borderColor: '#3b5bde' },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b5bde',
                          boxShadow: '0 0 0 3px rgba(59, 91, 222, 0.1)',
                        },
                      },
                    }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="label" sx={{ fontWeight: 600, mb: 1, display: 'block', color: 'var(--text-primary)' }}>
                    Password
                  </Typography>
                  <Box sx={{ position: 'relative' }}>
                    <TextField
                      fullWidth
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          background: 'var(--surface-alt)',
                          '&:hover fieldset': { borderColor: '#3b5bde' },
                          '&.Mui-focused fieldset': {
                            borderColor: '#3b5bde',
                            boxShadow: '0 0 0 3px rgba(59, 91, 222, 0.1)',
                          },
                        },
                      }}
                    />
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="label" sx={{ fontWeight: 600, mb: 1, display: 'block', color: 'var(--text-primary)' }}>
                    Confirm Password
                  </Typography>
                  <Box sx={{ position: 'relative' }}>
                    <TextField
                      fullWidth
                      type={showPasswordConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      name="password2"
                      value={form.password2}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          background: 'var(--surface-alt)',
                          '&:hover fieldset': { borderColor: '#3b5bde' },
                          '&.Mui-focused fieldset': {
                            borderColor: '#3b5bde',
                            boxShadow: '0 0 0 3px rgba(59, 91, 222, 0.1)',
                          },
                        },
                      }}
                    />
                    <IconButton
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      sx={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}
                      disabled={loading}
                    >
                      {showPasswordConfirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Step 1: Personal Info */}
            {activeStep === 1 && (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="label" sx={{ fontWeight: 600, mb: 1, display: 'block', color: 'var(--text-primary)' }}>
                    First Name
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="John"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        background: 'var(--surface-alt)',
                        '&:hover fieldset': { borderColor: '#3b5bde' },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b5bde',
                          boxShadow: '0 0 0 3px rgba(59, 91, 222, 0.1)',
                        },
                      },
                    }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="label" sx={{ fontWeight: 600, mb: 1, display: 'block', color: 'var(--text-primary)' }}>
                    Last Name
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Doe"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        background: 'var(--surface-alt)',
                        '&:hover fieldset': { borderColor: '#3b5bde' },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b5bde',
                          boxShadow: '0 0 0 3px rgba(59, 91, 222, 0.1)',
                        },
                      },
                    }}
                  />
                </Box>
              </Box>
            )}

            {/* Step 2: Role */}
            {activeStep === 2 && (
              <Box>
                <Typography variant="label" sx={{ fontWeight: 600, mb: 2, display: 'block', color: 'var(--text-primary)' }}>
                  Select Your Role
                </Typography>
                <FormControl fullWidth>
                  <Select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    sx={{
                      borderRadius: '8px',
                      background: 'var(--surface-alt)',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'var(--border-base)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b5bde',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b5bde',
                      },
                    }}
                  >
                    <MenuItem value="STUDENT">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>👨‍🎓</span> Student
                      </Box>
                    </MenuItem>
                    <MenuItem value="TEACHER">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>👨‍🏫</span> Teacher
                      </Box>
                    </MenuItem>
                    <MenuItem value="ADMIN">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>👨‍💼</span> Administrator
                      </Box>
                    </MenuItem>
                    <MenuItem value="PARENT">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>👨‍👩‍👧</span> Parent
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ mt: 4, p: 3, background: 'var(--surface-alt)', borderRadius: '8px' }}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <CheckCircleIcon sx={{ color: '#10b981', fontSize: '20px', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                      Enterprise-grade security with end-to-end encryption
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <CheckCircleIcon sx={{ color: '#10b981', fontSize: '20px', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                      30-day free trial with full access to all features
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <CheckCircleIcon sx={{ color: '#10b981', fontSize: '20px', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                      No credit card required to get started
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
              {activeStep > 0 && (
                <Button
                  onClick={handleBack}
                  variant="outlined"
                  disabled={loading}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    borderColor: '#3b5bde',
                    color: '#3b5bde',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: '2px solid',
                    textTransform: 'none',
                    '&:hover': { background: 'rgba(59, 91, 222, 0.05)' },
                  }}
                >
                  Back
                </Button>
              )}

              {activeStep < 2 ? (
                <Button
                  onClick={handleNext}
                  variant="contained"
                  disabled={loading}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)',
                    color: 'white',
                    fontWeight: 700,
                    borderRadius: '8px',
                    textTransform: 'none',
                    boxShadow: '0 10px 25px rgba(59, 91, 222, 0.2)',
                    '&:hover': {
                      boxShadow: '0 15px 35px rgba(59, 91, 222, 0.3)',
                    },
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  fullWidth
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)',
                    color: 'white',
                    fontWeight: 700,
                    borderRadius: '8px',
                    textTransform: 'none',
                    boxShadow: '0 10px 25px rgba(59, 91, 222, 0.2)',
                    '&:hover': {
                      boxShadow: '0 15px 35px rgba(59, 91, 222, 0.3)',
                    },
                  }}
                >
                  {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} sx={{ color: 'white' }} />
                      Creating Account...
                    </Box>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              )}
            </Box>
          </form>

          {/* Divider */}
          <Box sx={{ my: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
            <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>
              Already have an account?
            </Typography>
            <Box sx={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
          </Box>

          {/* Sign In Link */}
          <Button
            fullWidth
            component={Link}
            to="/login"
            variant="outlined"
            disabled={loading}
            sx={{
              py: 1.5,
              borderColor: '#3b5bde',
              color: '#3b5bde',
              fontWeight: 700,
              borderRadius: '8px',
              border: '2px solid',
              textTransform: 'none',
              '&:hover': {
                background: 'rgba(59, 91, 222, 0.05)',
              },
            }}
          >
            Sign In
          </Button>
        </Card>
      </Container>
    </Box>
  );
}
