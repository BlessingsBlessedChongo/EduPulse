import { useState, useEffect } from 'react';
import {
  Container, Typography, List, ListItem, ListItemText, ListItemIcon, Checkbox, Button, Paper
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { getNotifications, markRead, markAllRead } from '../api/notificationApi';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  const fetch = async () => {
    const res = await getNotifications();
    setNotifications(res.data);
  };

  useEffect(() => { fetch(); }, []);

  const handleMarkRead = async (id) => {
    await markRead(id);
    fetch();
  };

  const handleMarkAll = async () => {
    await markAllRead();
    fetch();
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        <NotificationsIcon sx={{ mr: 1 }} /> Notifications
      </Typography>
      <Button variant="outlined" onClick={handleMarkAll} sx={{ mb: 2 }}>
        Mark All as Read
      </Button>
      <Paper>
        <List>
          {notifications.map(notif => (
            <ListItem
              key={notif.id}
              secondaryAction={
                !notif.is_read && (
                  <Checkbox
                    edge="end"
                    checked={false}
                    onChange={() => handleMarkRead(notif.id)}
                  />
                )
              }
            >
              <ListItemText
                primary={notif.message}
                secondary={new Date(notif.created_at).toLocaleString()}
                sx={{ fontWeight: notif.is_read ? 'normal' : 'bold' }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
}