import { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Box,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { getTeacherProfile, getMyClasses, getPendingSubmissions, getClassRoster } from '../api/teacherApi';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import ClassIcon from '@mui/icons-material/Class';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function TeacherDashboard() {
  const user = useSelector((state) => state.auth.user);
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classRoster, setClassRoster] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, classesRes, pendingRes] = await Promise.all([
          getTeacherProfile(),
          getMyClasses(),
          getPendingSubmissions(),
        ]);
        setProfile(profileRes.data);
        setClasses(classesRes.data);
        setPendingSubmissions(pendingRes.data);
        const rosterPromises = classesRes.data.map((cls) => getClassRoster(cls.id));
        const rosters = await Promise.all(rosterPromises);
        const rosterMap = {};
        classesRes.data.forEach((cls, idx) => {
          rosterMap[cls.id] = rosters[idx].data;
        });
        setClassRoster(rosterMap);
      } catch (err) {
        console.error('[v0] TeacherDashboard Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#3b5bde' }} />
      </Box>
    );

  const totalStudents = Object.values(classRoster).reduce((sum, arr) => sum + arr.length, 0);
  const pendingCount = pendingSubmissions.length;
  const submissionRate = classes.length > 0 ? Math.round(((classes.length - pendingCount) / classes.length) * 100) : 0;

  return (
    <Container maxWidth="lg">
      {/* Welcome Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)',
          borderRadius: '16px',
          p: { xs: 3, md: 4 },
          color: 'white',
          mb: 4,
          boxShadow: '0 10px 30px rgba(59, 91, 222, 0.2)',
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                mb: 1,
                fontSize: { xs: '1.75rem', md: '2rem' },
              }}
            >
              Welcome back, {user?.first_name}! 👋
            </Typography>
            <Typography sx={{ fontSize: '1.05rem', opacity: 0.95, mb: 2 }}>
              You have <strong>{pendingCount}</strong> submissions pending review. Keep your classes on track!
            </Typography>
          </Grid>
          <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Box sx={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', px: 3, py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {pendingCount}
                </Typography>
                <Typography sx={{ opacity: 0.8 }}>Pending</Typography>
              </Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {submissionRate}% submissions graded
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    Classes
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#3b5bde' }}>
                    {classes.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                    Teaching
                  </Typography>
                </Box>
                <Box sx={{ background: 'rgba(59, 91, 222, 0.1)', p: 1.5, borderRadius: '8px', color: '#3b5bde' }}>
                  <ClassIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    Students
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#10b981' }}>
                    {totalStudents}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                    Total enrolled
                  </Typography>
                </Box>
                <Box sx={{ background: 'rgba(16, 185, 129, 0.1)', p: 1.5, borderRadius: '8px', color: '#10b981' }}>
                  <PeopleIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    Pending
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#f59e0b' }}>
                    {pendingCount}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                    To review
                  </Typography>
                </Box>
                <Box sx={{ background: 'rgba(245, 158, 11, 0.1)', p: 1.5, borderRadius: '8px', color: '#f59e0b' }}>
                  <WarningIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    Grading Rate
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#10b981' }}>
                    {submissionRate}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                    Completed
                  </Typography>
                </Box>
                <Box sx={{ background: 'rgba(16, 185, 129, 0.1)', p: 1.5, borderRadius: '8px', color: '#10b981' }}>
                  <TrendingUpIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* My Classes */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ClassIcon sx={{ color: '#3b5bde' }} /> My Classes
                </Typography>
                <Chip label={classes.length} variant="outlined" size="small" />
              </Box>
              <List dense sx={{ p: 0 }}>
                {classes.slice(0, 5).map((cls, idx) => (
                  <ListItem
                    key={cls.id}
                    component={Link}
                    to={`/teacher/classes`}
                    sx={{
                      py: 1.5,
                      px: 0,
                      borderBottom: idx < Math.min(4, classes.length - 1) ? '1px solid var(--border-light)' : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                      '&:hover': {
                        background: 'var(--surface-alt)',
                        borderRadius: '4px',
                      },
                      transition: 'all 300ms',
                    }}
                  >
                    <ListItemText
                      primary={<Typography sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cls.name}</Typography>}
                      secondary={
                        <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                          {classRoster[cls.id]?.length || 0} students • {cls.subject}
                        </Typography>
                      }
                    />
                    <Chip label={cls.academic_year} size="small" variant="outlined" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Submissions */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon sx={{ color: '#f59e0b' }} /> Pending Review
                </Typography>
                <Chip label={pendingCount} variant="outlined" size="small" color={pendingCount > 0 ? 'error' : 'success'} />
              </Box>
              {pendingSubmissions.length > 0 ? (
                <List dense sx={{ p: 0 }}>
                  {pendingSubmissions.slice(0, 5).map((submission, idx) => (
                    <ListItem
                      key={submission.id}
                      sx={{
                        py: 1.5,
                        px: 0,
                        borderBottom: idx < Math.min(4, pendingSubmissions.length - 1) ? '1px solid var(--border-light)' : 'none',
                      }}
                    >
                      <ListItemText
                        primary={<Typography sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>{submission.assignment_title}</Typography>}
                        secondary={
                          <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                            {submission.student_name} • Submitted
                          </Typography>
                        }
                      />
                      <Button
                        size="small"
                        component={Link}
                        to={`/teacher/submissions/${submission.assignment_id}`}
                        sx={{ ml: 1, color: '#3b5bde', fontWeight: 600 }}
                      >
                        Grade
                      </Button>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <CheckCircleIcon sx={{ fontSize: '48px', color: '#10b981', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                    All submissions graded! Great job! 🎉
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
