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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import { getSchoolOverview, getAllUsers, getAllClasses } from '../api/adminApi';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import SchoolIcon from '@mui/icons-material/School';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function AdminDashboard() {
  const user = useSelector((state) => state.auth.user);
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, usersRes, classesRes] = await Promise.all([
          getSchoolOverview(),
          getAllUsers(),
          getAllClasses(),
        ]);
        setOverview(overviewRes.data);
        setUsers(usersRes.data);
        setClasses(classesRes.data);
      } catch (err) {
        console.error('[v0] AdminDashboard Error:', err);
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

  const stats = {
    totalUsers: users.length,
    totalClasses: classes.length,
    totalStudents: users.filter((u) => u.role === 'STUDENT').length,
    totalTeachers: users.filter((u) => u.role === 'TEACHER').length,
  };

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
              Welcome, {user?.first_name}! 🎓
            </Typography>
            <Typography sx={{ fontSize: '1.05rem', opacity: 0.95 }}>
              School administration dashboard. Manage all users, classes, and system settings from here.
            </Typography>
          </Grid>
          <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 2, flexWrap: 'wrap' }}>
            <Button
              component={Link}
              to="/admin/users"
              variant="contained"
              sx={{ background: 'white', color: '#3b5bde', fontWeight: 700, '&:hover': { background: 'rgba(255,255,255,0.9)' } }}
            >
              Manage Users
            </Button>
            <Button
              component={Link}
              to="/admin/classes"
              variant="outlined"
              sx={{ borderColor: 'white', color: 'white', fontWeight: 700, '&:hover': { background: 'rgba(255,255,255,0.1)' } }}
            >
              Manage Classes
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Key Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    Total Users
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#3b5bde' }}>
                    {stats.totalUsers}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                    Active accounts
                  </Typography>
                </Box>
                <Box sx={{ background: 'rgba(59, 91, 222, 0.1)', p: 1.5, borderRadius: '8px', color: '#3b5bde' }}>
                  <PeopleIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    Classes
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#10b981' }}>
                    {stats.totalClasses}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                    Active
                  </Typography>
                </Box>
                <Box sx={{ background: 'rgba(16, 185, 129, 0.1)', p: 1.5, borderRadius: '8px', color: '#10b981' }}>
                  <ClassIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    Students
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#3b82f6' }}>
                    {stats.totalStudents}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                    Enrolled
                  </Typography>
                </Box>
                <Box sx={{ background: 'rgba(59, 130, 246, 0.1)', p: 1.5, borderRadius: '8px', color: '#3b82f6' }}>
                  <SchoolIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    Teachers
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#f59e0b' }}>
                    {stats.totalTeachers}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                    Faculty
                  </Typography>
                </Box>
                <Box sx={{ background: 'rgba(245, 158, 11, 0.1)', p: 1.5, borderRadius: '8px', color: '#f59e0b' }}>
                  <AssessmentIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Users */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PeopleIcon sx={{ color: '#3b5bde' }} /> Recent Users
                </Typography>
                <Button component={Link} to="/admin/users" size="small" sx={{ color: '#3b5bde' }}>
                  View All
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ background: 'var(--surface-alt)' }}>
                      <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.slice(0, 5).map((u) => (
                      <TableRow key={u.id} sx={{ '&:hover': { background: 'var(--surface-alt)' } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {u.first_name} {u.last_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={u.role} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <IconButton size="small" sx={{ color: '#3b5bde' }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Classes */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ClassIcon sx={{ color: '#10b981' }} /> Recent Classes
                </Typography>
                <Button component={Link} to="/admin/classes" size="small" sx={{ color: '#10b981' }}>
                  View All
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ background: 'var(--surface-alt)' }}>
                      <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Subject</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {classes.slice(0, 5).map((cls) => (
                      <TableRow key={cls.id} sx={{ '&:hover': { background: 'var(--surface-alt)' } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {cls.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                            {cls.subject}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <IconButton size="small" sx={{ color: '#3b5bde' }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChartIcon sx={{ color: '#3b5bde' }} /> System Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, background: 'var(--surface-alt)', borderRadius: '8px', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600, display: 'block' }}>
                      User Signup Rate
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, my: 1, color: '#10b981' }}>
                      +12%
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                      vs last month
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, background: 'var(--surface-alt)', borderRadius: '8px', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600, display: 'block' }}>
                      System Uptime
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, my: 1, color: '#10b981' }}>
                      99.9%
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                      Excellent
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, background: 'var(--surface-alt)', borderRadius: '8px', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600, display: 'block' }}>
                      Active Sessions
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, my: 1, color: '#3b82f6' }}>
                      {stats.totalUsers}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                      Users online
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, background: 'var(--surface-alt)', borderRadius: '8px', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600, display: 'block' }}>
                      Storage Used
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, my: 1, color: '#f59e0b' }}>
                      45%
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                      Of capacity
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
