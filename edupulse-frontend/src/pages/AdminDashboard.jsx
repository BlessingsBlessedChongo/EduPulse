import { useEffect, useState } from 'react';
import {
  Container, Grid, Card, CardContent, Typography, CircularProgress,
  List, ListItem, ListItemText, Chip, Button, Box
} from '@mui/material';
import { getSchoolOverview, getAllUsers, getAllClasses } from '../api/adminApi';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import SchoolIcon from '@mui/icons-material/School';
import AssessmentIcon from '@mui/icons-material/Assessment';

export default function AdminDashboard() {
  const { user } = useAuth();
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
          getAllClasses()
        ]);
        setOverview(overviewRes.data);
        setUsers(usersRes.data);
        setClasses(classesRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 10 }} />;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Welcome Card */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Welcome, {user?.first_name}! (Admin)
          </Typography>
          <Typography variant="body1">
            Manage your school with ease.
          </Typography>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                <PeopleIcon sx={{ mr: 1 }} /> Total Users
              </Typography>
              <Typography variant="h3">{users.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                <SchoolIcon sx={{ mr: 1 }} /> Students
              </Typography>
              <Typography variant="h3">{overview?.total_students || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                <ClassIcon sx={{ mr: 1 }} /> Classes
              </Typography>
              <Typography variant="h3">{overview?.total_classes || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                <AssessmentIcon sx={{ mr: 1 }} /> Avg Grade
              </Typography>
              <Typography variant="h3">{overview?.average_grade ? `${overview.average_grade}%` : 'N/A'}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Users & Classes Lists */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                All Users ({users.length})
              </Typography>
              <List dense>
                {users.slice(0, 8).map(u => (
                  <ListItem key={u.id} secondaryAction={
                    <Chip label={u.role} size="small" color="primary" variant="outlined" />
                  }>
                    <ListItemText primary={`${u.first_name} ${u.last_name}`} secondary={u.email} />
                  </ListItem>
                ))}
              </List>
              <Button component={Link} to="/admin/users" size="small">
                Manage All Users
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Classes ({classes.length})
              </Typography>
              <List dense>
                {classes.slice(0, 8).map(cls => (
                  <ListItem key={cls.id}>
                    <ListItemText primary={cls.name} secondary={`${cls.subject} - ${cls.academic_year}`} />
                  </ListItem>
                ))}
              </List>
              <Button component={Link} to="/admin/classes" size="small">
                Manage Classes
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}