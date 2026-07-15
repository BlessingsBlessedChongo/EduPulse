import { useEffect, useState } from 'react';
import {
  Container, Grid, Card, CardContent, Typography, CircularProgress,
  List, ListItem, ListItemText, Chip, Button, Box, LinearProgress
} from '@mui/material';
import { getTeacherProfile, getMyClasses, getPendingSubmissions, getClassRoster } from '../api/teacherApi';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import ClassIcon from '@mui/icons-material/Class';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import WarningIcon from '@mui/icons-material/Warning';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classRoster, setClassRoster] = useState({}); // classId -> students

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, classesRes, pendingRes] = await Promise.all([
          getTeacherProfile(),
          getMyClasses(),
          getPendingSubmissions()
        ]);
        setProfile(profileRes.data);
        setClasses(classesRes.data);
        setPendingSubmissions(pendingRes.data);
        // Fetch roster for each class (we can do this lazily, but we'll load all)
        const rosterPromises = classesRes.data.map(cls => getClassRoster(cls.id));
        const rosters = await Promise.all(rosterPromises);
        const rosterMap = {};
        classesRes.data.forEach((cls, idx) => {
          rosterMap[cls.id] = rosters[idx].data;
        });
        setClassRoster(rosterMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 10 }} />;

  const totalStudents = Object.values(classRoster).reduce((sum, arr) => sum + arr.length, 0);
  const pendingCount = pendingSubmissions.length;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Welcome Card */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: '#333' }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Welcome back, {user?.first_name}!
          </Typography>
          <Typography variant="body1">
            You have {pendingCount} submissions to grade.
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* My Classes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ClassIcon sx={{ mr: 1 }} /> My Classes ({classes.length})
              </Typography>
              <List dense>
                {classes.map(cls => (
                  <ListItem key={cls.id} secondaryAction={
                    <Chip label={`${classRoster[cls.id]?.length || 0} students`} size="small" />
                  }>
                    <ListItemText primary={cls.name} secondary={cls.subject} />
                  </ListItem>
                ))}
              </List>
              {/* Manage Classes button */}
              <Button component={Link} to="/teacher/classes" size="small" sx={{ mt: 1 }}>
                Manage Classes
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Grading */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AssignmentIcon sx={{ mr: 1 }} /> Pending Submissions ({pendingCount})
              </Typography>
              <List dense>
                {pendingSubmissions.slice(0, 8).map(sub => (
                  <ListItem key={sub.id}>
                    <ListItemText
                      primary={`${sub.student_name || 'Student'} – ${sub.assignment_title || 'Assignment'}`}
                      secondary={`Submitted: ${new Date(sub.submitted_at).toLocaleDateString()}`}
                    />
                  </ListItem>
                ))}
              </List>
              {pendingCount > 8 && (
                <Button component={Link} to="/teacher/submissions" size="small">
                  View All
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                <PeopleIcon sx={{ mr: 1 }} /> Total Students
              </Typography>
              <Typography variant="h3">{totalStudents}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                <AssignmentIcon sx={{ mr: 1 }} /> Pending
              </Typography>
              <Typography variant="h3">{pendingCount}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                <WarningIcon sx={{ mr: 1 }} /> At-Risk Students (placeholder)
              </Typography>
              <Typography variant="h3">0</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}