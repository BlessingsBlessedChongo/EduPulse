import { Box, Container, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import ErrorIcon from '@mui/icons-material/Error';

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--accent-500) 100%)',
        p: 3,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          <ErrorIcon sx={{ fontSize: '80px', mb: 2, opacity: 0.9 }} />
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '3rem', md: '4rem' },
              fontWeight: 700,
              mb: 2,
              letterSpacing: '-0.02em',
            }}
          >
            404
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 2,
              fontSize: { xs: '1.5rem', md: '1.75rem' },
            }}
          >
            Page Not Found
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontSize: '1.1rem',
              mb: 4,
              opacity: 0.95,
              maxWidth: '400px',
              mx: 'auto',
            }}
          >
            The page you are looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
          </Typography>
          <Button
            component={Link}
            to="/"
            startIcon={<HomeIcon />}
            sx={{
              px: 4,
              py: 1.5,
              background: 'white',
              color: '#3b5bde',
              fontWeight: 700,
              fontSize: '1rem',
              borderRadius: '8px',
              textTransform: 'none',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.9)',
              },
              transition: 'all 300ms',
            }}
          >
            Back to Home
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
