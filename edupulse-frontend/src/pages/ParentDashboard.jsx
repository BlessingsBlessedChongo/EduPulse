import { useEffect, useState } from 'react';
import {
  Container, Grid, Card, CardContent, Typography, CircularProgress,
  List, ListItem, ListItemText, Chip, Button, Box, Accordion, AccordionSummary, AccordionDetails, LinearProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getMyChildren, getChildProgress, getChildAttendance } from '../api/parentApi';
import { useSelector } from 'react-redux';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function ParentDashboard() {
  const user = useSelector((state) => state.auth.user);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [childProgress, setChildProgress] = useState(null);
  const [childAttendance, setChildAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [childLoading, setChildLoading] = useState(false);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await getMyChildren();
        setChildren(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  const handleSelectChild = async (studentId) => {
    setSelectedChildId(studentId);
    setChildLoading(true);
    try {
      const [progressRes, attendanceRes] = await Promise.all([
        getChildProgress(studentId),
        getChildAttendance(studentId)
      ]);
      setChildProgress(progressRes.data);
      setChildAttendance(attendanceRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setChildLoading(false);
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 10 }} />;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', color: 'white' }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Welcome, {user?.first_name}!
          </Typography>
          <Typography variant="body1">
            Stay connected with your children's progress.
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                My Children
              </Typography>
              <List dense>
                {children.map(child => (
                  <ListItem button key={child.student_id} selected={selectedChildId === child.student_id} onClick={() => handleSelectChild(child.student_id)}>
                    <ListItemText primary={child.student_name} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {selectedChildId ? (
            childLoading ? <CircularProgress /> :
            <>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Progress Overview
                  </Typography>
                  <Typography variant="body1">
                    Attendance Rate: {childProgress?.attendance_rate}%
                  </Typography>
                  <Typography variant="body1">
                    Risk Score: {childProgress?.risk_score || 'N/A'}
                  </Typography>
                </CardContent>
              </Card>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Recent Grades</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {childProgress?.grades?.length > 0 ? (
                    <List dense>
                      {childProgress.grades.slice(-5).map((g, idx) => (
                        <ListItem key={idx}>
                          <ListItemText primary={`${g.date} - Grade: ${g.grade}`} />
                        </ListItem>
                      ))}
                    </List>
                  ) : <Typography color="text.secondary">No grades yet.</Typography>}
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Attendance History</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {childAttendance.length > 0 ? (
                    <List dense>
                      {childAttendance.slice(-10).map((att, idx) => (
                        <ListItem key={idx}>
                          <ListItemText primary={`${att.date} - ${att.status}`} />
                        </ListItem>
                      ))}
                    </List>
                  ) : <Typography color="text.secondary">No attendance records.</Typography>}
                </AccordionDetails>
              </Accordion>
            </>
          ) : (
            <Typography variant="body1" sx={{ p: 2 }}>Select a child to view details.</Typography>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
