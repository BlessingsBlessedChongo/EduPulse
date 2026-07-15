import { useEffect, useState } from 'react';
import {
  Container, Grid, Card, CardContent, Typography, CircularProgress,
  Box, List, ListItem, ListItemText, Chip, Button, Badge, LinearProgress
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { getStudentProfile, getEnrolledClasses, getUpcomingAssignments, getGamificationProfile, getLeaderboard, getNotifications } from '../api/studentApi';
import { Link } from 'react-router-dom';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [gamification, setGamification] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, classesRes, assignmentsRes, gamificationRes, leaderboardRes, notifRes] = await Promise.all([
          getStudentProfile(),
          getEnrolledClasses(),
          getUpcomingAssignments(),
          getGamificationProfile(),
          getLeaderboard(),
          getNotifications()
        ]);
        setProfile(profileRes.data);
        setClasses(classesRes.data);
        setUpcomingAssignments(assignmentsRes.data);
        setGamification(gamificationRes.data);
        setLeaderboard(leaderboardRes.data);
        setNotifications(notifRes.data.filter(n => !n.is_read));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 10 }} />;

  const xpToNextLevel = (gamification?.level || 1) * 100;
  const currentXP = gamification?.total_xp || 0;
  const progress = (currentXP % xpToNextLevel) / xpToNextLevel * 100;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Welcome Card */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Welcome back, {user?.first_name || 'Student'}!
          </Typography>
          <Typography variant="body1">
            Keep up the great work. You have {upcomingAssignments.length} upcoming assignments.
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip icon={<EmojiEventsIcon />} label={`Level ${gamification?.level} (${gamification?.total_xp} XP)`} color="secondary" />
            <Box sx={{ width: 200 }}>
              <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5 }} />
              <Typography variant="caption">{currentXP % xpToNextLevel}/{xpToNextLevel} XP to next level</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Enrolled Classes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SchoolIcon sx={{ mr: 1 }} /> My Classes
              </Typography>
              <List dense>
                {classes.map(cls => (
                  <ListItem key={cls.id}>
                    <ListItemText primary={cls.name} secondary={`${cls.subject} - ${cls.academic_year}`} />
                  </ListItem>
                ))}
              </List>
              {classes.length === 0 && <Typography color="text.secondary">No classes enrolled.</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Assignments */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AssignmentIcon sx={{ mr: 1 }} /> Upcoming Assignments
              </Typography>
              <List dense>
                {upcomingAssignments.slice(0, 5).map(asgn => (
                  <ListItem key={asgn.id}>
                    <ListItemText
                      primary={asgn.title}
                      secondary={`Due: ${new Date(asgn.due_date).toLocaleDateString()} - ${asgn.class_obj_name || 'Class'}`}
                    />
                    <Chip label={`${asgn.max_points} pts`} size="small" />
                  </ListItem>
                ))}
              </List>
              {upcomingAssignments.length === 0 && <Typography color="text.secondary">No upcoming assignments. Great job!</Typography>}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Grades (submissions) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CheckCircleIcon sx={{ mr: 1 }} /> Recent Grades
              </Typography>
              {/* We'll fetch submissions from API, but for now a placeholder */}
              <Typography color="text.secondary">Grade data will appear here.</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Leaderboard Snippet */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <EmojiEventsIcon sx={{ mr: 1 }} /> Top Students
              </Typography>
              <List dense>
                {leaderboard.slice(0, 5).map((entry, idx) => (
                  <ListItem key={idx}>
                    <ListItemText primary={entry.student_name} secondary={`Level ${entry.level} - ${entry.total_xp} XP`} />
                    <Chip label={`#${idx+1}`} color={idx===0?'primary':'default'} size="small" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <NotificationsIcon sx={{ mr: 1 }} /> Notifications
                <Badge badgeContent={notifications.length} color="error" sx={{ ml: 1 }} />
              </Typography>
              <List dense>
                {notifications.slice(0, 5).map(notif => (
                  <ListItem key={notif.id}>
                    <ListItemText primary={notif.message} secondary={new Date(notif.created_at).toLocaleString()} />
                  </ListItem>
                ))}
              </List>
              {notifications.length === 0 && <Typography color="text.secondary">No new notifications.</Typography>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}