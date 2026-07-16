import { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Badge,
  LinearProgress,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { getStudentProfile, getEnrolledClasses, getUpcomingAssignments, getGamificationProfile, getLeaderboard, getNotifications } from '../api/studentApi';
import { Link } from 'react-router-dom';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SchoolIcon from '@mui/icons-material/School';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function StudentDashboard() {
  const user = useSelector((state) => state.auth.user);
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
          getNotifications(),
        ]);
        setProfile(profileRes.data);
        setClasses(classesRes.data);
        setUpcomingAssignments(assignmentsRes.data);
        setGamification(gamificationRes.data);
        setLeaderboard(leaderboardRes.data);
        setNotifications(notifRes.data.filter((n) => !n.is_read));
      } catch (err) {
        console.error('[v0] StudentDashboard Error:', err);
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

  const xpToNextLevel = (gamification?.level || 1) * 100;
  const currentXP = gamification?.total_xp || 0;
  const progress = ((currentXP % xpToNextLevel) / xpToNextLevel) * 100;

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
              You have <strong>{upcomingAssignments.length}</strong> upcoming assignments this week. Keep up the momentum!
            </Typography>
          </Grid>
          <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Box sx={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', px: 3, py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {gamification?.level || 1}
                </Typography>
                <Typography sx={{ opacity: 0.8 }}>Level</Typography>
              </Box>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {currentXP % xpToNextLevel}/{xpToNextLevel} XP to next
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
                    Enrolled
                  </Typography>
                </Box>
                <Box sx={{ background: 'rgba(59, 91, 222, 0.1)', p: 1.5, borderRadius: '8px', color: '#3b5bde' }}>
                  <SchoolIcon />
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
                    Assignments
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#f59e0b' }}>
                    {upcomingAssignments.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                    Upcoming
                  </Typography>
                </Box>
                <Box sx={{ background: 'rgba(245, 158, 11, 0.1)', p: 1.5, borderRadius: '8px', color: '#f59e0b' }}>
                  <AssignmentIcon />
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
                    Level
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#10b981' }}>
                    {gamification?.level || 1}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                    {currentXP} XP
                  </Typography>
                </Box>
                <Box sx={{ background: 'rgba(16, 185, 129, 0.1)', p: 1.5, borderRadius: '8px', color: '#10b981' }}>
                  <TrendingUpIcon />
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
                    Notifications
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#ef4444' }}>
                    {notifications.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                    New
                  </Typography>
                </Box>
                <Box sx={{ background: 'rgba(239, 68, 68, 0.1)', p: 1.5, borderRadius: '8px', color: '#ef4444' }}>
                  <NotificationsIcon />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* My Classes */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SchoolIcon sx={{ color: '#3b5bde' }} /> My Classes
                </Typography>
                <Chip label={classes.length} variant="outlined" size="small" />
              </Box>
              <Box sx={{ flex: 1 }}>
                {classes.length > 0 ? (
                  <List dense sx={{ p: 0 }}>
                    {classes.slice(0, 4).map((cls, idx) => (
                      <ListItem key={cls.id} sx={{ py: 1, px: 0, borderBottom: idx < Math.min(3, classes.length - 1) ? '1px solid var(--border-light)' : 'none' }}>
                        <ListItemText
                          primary={<Typography sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cls.name}</Typography>}
                          secondary={<Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>{cls.subject}</Typography>}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                    No classes enrolled yet.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Assignments */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon sx={{ color: '#f59e0b' }} /> Upcoming
                </Typography>
                <Chip label={upcomingAssignments.length} variant="outlined" size="small" />
              </Box>
              <Box sx={{ flex: 1 }}>
                {upcomingAssignments.length > 0 ? (
                  <List dense sx={{ p: 0 }}>
                    {upcomingAssignments.slice(0, 4).map((asgn, idx) => (
                      <ListItem key={asgn.id} sx={{ py: 1.5, px: 0, borderBottom: idx < Math.min(3, upcomingAssignments.length - 1) ? '1px solid var(--border-light)' : 'none' }}>
                        <ListItemText
                          primary={<Typography sx={{ fontWeight: 600, color: 'var(--text-primary)', mb: 0.25 }}>{asgn.title}</Typography>}
                          secondary={
                            <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                              Due: {new Date(asgn.due_date).toLocaleDateString()}
                            </Typography>
                          }
                        />
                        <Chip label={`${asgn.max_points}pts`} size="small" variant="outlined" sx={{ ml: 1 }} />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                    No upcoming assignments. Great job! 🎉
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Students Leaderboard */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EmojiEventsIcon sx={{ color: '#f59e0b' }} /> Leaderboard
              </Typography>
              <List dense sx={{ p: 0 }}>
                {leaderboard.slice(0, 5).map((entry, idx) => (
                  <ListItem key={idx} sx={{ py: 1, px: 0, borderBottom: idx < 4 ? '1px solid var(--border-light)' : 'none' }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '1.125rem',
                        color: idx === 0 ? '#f59e0b' : 'var(--text-secondary)',
                        mr: 2,
                        minWidth: '30px',
                      }}
                    >
                      #{idx + 1}
                    </Typography>
                    <ListItemText
                      primary={<Typography sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.student_name}</Typography>}
                      secondary={<Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>Level {entry.level} • {entry.total_xp} XP</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* XP Progress */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Progress to Next Level
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Level {gamification?.level || 1} → {(gamification?.level || 1) + 1}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    {Math.round(progress)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: '8px',
                    borderRadius: '4px',
                    background: 'var(--surface-alt)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)',
                      borderRadius: '4px',
                    },
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: 'var(--text-tertiary)' }}>
                {currentXP % xpToNextLevel} / {xpToNextLevel} XP earned
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
