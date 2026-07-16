import { Link, useNavigate } from 'react-router-dom';
import { Box, Container, Button, Typography, Grid, Card, CardContent } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import GroupsIcon from '@mui/icons-material/Groups';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { useState } from 'react';

const features = [
  { 
    icon: <SchoolIcon fontSize="large" />, 
    title: 'Smart Academics', 
    desc: 'Classes, assignments, grades — all in one unified platform.' 
  },
  { 
    icon: <AutoGraphIcon fontSize="large" />, 
    title: 'AI Insights', 
    desc: 'Sentiment analysis, risk detection, and intelligent recommendations.' 
  },
  { 
    icon: <GroupsIcon fontSize="large" />, 
    title: 'Parent Engagement', 
    desc: 'Real-time progress updates, messaging, and attendance alerts.' 
  },
  { 
    icon: <SecurityIcon fontSize="large" />, 
    title: 'Enterprise Security', 
    desc: 'Industry-grade encryption, backups, and compliance standards.' 
  },
  {
    icon: <SpeedIcon fontSize="large" />,
    title: 'Lightning Fast',
    desc: 'Optimized performance with instant sync across all devices.'
  },
  {
    icon: <IntegrationInstructionsIcon fontSize="large" />,
    title: 'Seamless Integration',
    desc: 'Connect with existing systems and tools effortlessly.'
  }
];

const testimonials = [
  { name: 'Dr. Sarah Johnson', role: 'Principal, City School', text: 'EduPulse transformed how our school communicates with parents and manages classes.' },
  { name: 'Mr. Ahmed Khan', role: 'Teacher, Cambridge Academy', text: 'The AI insights help me identify students who need extra support instantly.' },
  { name: 'Mrs. Lisa Chen', role: 'Parent', text: 'I love seeing my child\'s progress in real-time. The notifications keep me involved.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [hoveredFeature, setHoveredFeature] = useState(null);

  return (
    <Box sx={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--text-primary)' }}>
      {/* Navigation Bar with Glassmorphism */}
      <Box sx={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(10px)',
        background: 'rgba(255, 255, 255, 0.7)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        '@media (prefers-color-scheme: dark)': {
          background: 'rgba(15, 23, 46, 0.7)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }
      }}>
        <Container maxWidth="lg">
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 3,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon sx={{ fontSize: '32px', color: '#3b5bde' }} />
              <Typography variant="h6" sx={{ fontWeight: 700, background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                EduPulse
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                component={Link}
                to="/login"
                sx={{
                  px: 3,
                  py: 1,
                  color: 'var(--text-primary)',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'var(--surface-alt)',
                    transition: 'all 300ms'
                  }
                }}
              >
                Sign In
              </Button>
              <Button
                component={Link}
                to="/register"
                sx={{
                  px: 3,
                  py: 1,
                  background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(59, 91, 222, 0.2)',
                  '&:hover': {
                    boxShadow: '0 15px 35px rgba(59, 91, 222, 0.3)',
                    transform: 'translateY(-2px)',
                    transition: 'all 300ms'
                  }
                }}
              >
                Get Started Free
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box sx={{ pt: { xs: 8, md: 16 }, pb: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    fontWeight: 700,
                    lineHeight: 1.1,
                    mb: 3,
                    letterSpacing: '-0.02em',
                  }}
                >
                  Elevate Education with
                  <Typography
                    component="span"
                    sx={{
                      background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      display: 'block',
                    }}
                  >
                    Intelligent Management
                  </Typography>
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    color: 'var(--text-secondary)',
                    mb: 4,
                    fontSize: { xs: '1rem', md: '1.25rem' },
                    lineHeight: 1.6,
                    fontWeight: 500,
                  }}
                >
                  Connect students, teachers, and parents on one powerful platform. Powered by AI-driven insights and enterprise-grade security.
                </Typography>

                <Box sx={{ display: 'flex', gap: 3, mb: 6, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                  <Button
                    component={Link}
                    to="/register"
                    endIcon={<ArrowRightIcon />}
                    sx={{
                      px: 4,
                      py: 1.5,
                      background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)',
                      color: 'white',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '1rem',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(59, 91, 222, 0.2)',
                      '&:hover': {
                        boxShadow: '0 15px 35px rgba(59, 91, 222, 0.3)',
                        transform: 'translateY(-2px)',
                        transition: 'all 300ms'
                      }
                    }}
                  >
                    Start Free Trial
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderColor: '#3b5bde',
                      color: '#3b5bde',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '1rem',
                      borderRadius: '8px',
                      border: '2px solid',
                      '&:hover': {
                        background: 'rgba(59, 91, 222, 0.05)',
                        transition: 'all 300ms'
                      }
                    }}
                  >
                    Watch Demo
                  </Button>
                </Box>

                <Typography variant="body2" sx={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                  ✓ No credit card required  ✓ 30-day free trial  ✓ Full access to all features
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  background: 'linear-gradient(135deg, rgba(59, 91, 222, 0.1) 0%, rgba(91, 78, 247, 0.1) 100%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(59, 91, 222, 0.2)',
                  p: 4,
                  textAlign: 'center',
                  minHeight: '400px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Box sx={{ fontSize: '80px' }}>📊</Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Grid Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, background: 'var(--surface-alt)' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', md: '2.5rem' },
                fontWeight: 700,
                mb: 2,
                letterSpacing: '-0.02em',
              }}
            >
              Powerful Features for Every Role
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'var(--text-secondary)',
                fontWeight: 500,
                maxWidth: '600px',
                mx: 'auto',
              }}
            >
              Everything you need to succeed in modern education management
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '12px',
                    p: 3,
                    h: '100%',
                    cursor: 'pointer',
                    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: hoveredFeature === index ? 'translateY(-4px)' : 'none',
                    boxShadow: hoveredFeature === index ? '0 20px 25px rgba(0, 0, 0, 0.1)' : '0 4px 6px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                      borderColor: '#3b5bde',
                    }
                  }}
                  onMouseEnter={() => setHoveredFeature(index)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  <CardContent sx={{ p: 0 }}>
                    <Box sx={{
                      background: 'linear-gradient(135deg, rgba(59, 91, 222, 0.1) 0%, rgba(91, 78, 247, 0.1) 100%)',
                      width: '56px',
                      height: '56px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                      color: '#3b5bde',
                      fontSize: '28px',
                    }}>
                      {feature.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        mb: 1,
                        fontSize: '1.125rem',
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                      }}
                    >
                      {feature.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', color: 'white' }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '2rem', md: '2.5rem' },
                fontWeight: 700,
                mb: 3,
                letterSpacing: '-0.02em',
              }}
            >
              Ready to Transform Your School?
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 500,
                mb: 4,
                opacity: 0.9,
                fontSize: '1.125rem',
              }}
            >
              Join hundreds of schools using EduPulse to deliver better education
            </Typography>
            <Button
              component={Link}
              to="/register"
              sx={{
                px: 4,
                py: 1.5,
                background: 'white',
                color: '#3b5bde',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '1rem',
                borderRadius: '8px',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.9)',
                  transition: 'all 300ms'
                }
              }}
            >
              Start Your Free Trial Today
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 4, background: 'var(--surface)', borderTop: '1px solid var(--border-light)' }}>
        <Container maxWidth="lg">
          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: '0.875rem',
            }}
          >
            © 2026 BBC INNOVATIONS – EduPulse. All rights reserved. | Privacy Policy | Terms of Service
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
