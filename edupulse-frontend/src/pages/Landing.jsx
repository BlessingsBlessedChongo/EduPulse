import { Link } from 'react-router-dom';
import { Button, Typography, Container, Box, Grid } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import GroupsIcon from '@mui/icons-material/Groups';
import SecurityIcon from '@mui/icons-material/Security';

const features = [
  { icon: <SchoolIcon fontSize="large" />, title: 'Smart Academics', desc: 'Classes, assignments, grades — all in one place.' },
  { icon: <AutoGraphIcon fontSize="large" />, title: 'AI Insights', desc: 'Sentiment analysis, risk detection, and grammar checking.' },
  { icon: <GroupsIcon fontSize="large" />, title: 'Parent Engagement', desc: 'Real-time progress, messaging, and attendance alerts.' },
  { icon: <SecurityIcon fontSize="large" />, title: 'Secure & Free', desc: 'Zero-cost with enterprise-grade security and backups.' },
];

export default function Landing() {
  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box sx={{ pt: 10, pb: 6, textAlign: 'center', color: 'white' }}>
          <Typography variant="h2" fontWeight="bold" gutterBottom>
            Welcome to EduPulse
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
            The intelligent school management system that brings students, teachers, and parents together.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button component={Link} to="/register" variant="contained" size="large" color="secondary">
              Get Started Free
            </Button>
            <Button component={Link} to="/login" variant="outlined" size="large" sx={{ color: 'white', borderColor: 'white' }}>
              Login
            </Button>
          </Box>
        </Box>

        {/* Features Grid */}
        <Grid container spacing={4} sx={{ pb: 10 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Box sx={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, p: 3, textAlign: 'center', color: 'white', backdropFilter: 'blur(10px)' }}>
                {feature.icon}
                <Typography variant="h6" fontWeight="bold" sx={{ mt: 2 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {feature.desc}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', pb: 4 }}>
          <Typography variant="body2" color="white" sx={{ opacity: 0.7 }}>
            © 2026 BBC INNOVATIONS – EduPulse. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}