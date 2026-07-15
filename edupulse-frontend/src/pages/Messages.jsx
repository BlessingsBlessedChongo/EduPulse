import { useState, useEffect } from 'react';
import {
  Container, Typography, List, ListItem, ListItemText, TextField, Button, Paper, Grid, Divider
} from '@mui/material';
import { getMessages, sendMessage } from '../api/messageApi';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [newMessage, setNewMessage] = useState({ receiver: '', subject: '', body: '' });

  useEffect(() => {
    getMessages().then(res => setMessages(res.data)).catch(console.error);
  }, []);

  const handleSendReply = async () => {
    if (!selectedMessage) return;
    try {
      await sendMessage({
        receiver: selectedMessage.sender.id,
        subject: `Re: ${selectedMessage.subject}`,
        body: replyContent,
      });
      setReplyContent('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendNew = async () => {
    try {
      await sendMessage(newMessage);
      setNewMessage({ receiver: '', subject: '', body: '' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Messages</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Inbox</Typography>
            <List dense>
              {messages.map(msg => (
                <ListItem button key={msg.id} selected={selectedMessage?.id === msg.id} onClick={() => setSelectedMessage(msg)}>
                  <ListItemText primary={msg.subject || 'No subject'} secondary={`From: ${msg.sender.email}`} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          {selectedMessage ? (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">{selectedMessage.subject}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body1">{selectedMessage.body}</Typography>
              <Divider sx={{ my: 2 }} />
              <TextField
                label="Reply"
                fullWidth
                multiline
                rows={3}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
              />
              <Button variant="contained" sx={{ mt: 1 }} onClick={handleSendReply}>Send Reply</Button>
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">New Message</Typography>
              <TextField
                label="Receiver Email"
                fullWidth
                margin="dense"
                value={newMessage.receiver}
                onChange={(e) => setNewMessage({ ...newMessage, receiver: e.target.value })}
              />
              <TextField
                label="Subject"
                fullWidth
                margin="dense"
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
              />
              <TextField
                label="Message"
                fullWidth
                multiline
                rows={4}
                margin="dense"
                value={newMessage.body}
                onChange={(e) => setNewMessage({ ...newMessage, body: e.target.value })}
              />
              <Button variant="contained" sx={{ mt: 1 }} onClick={handleSendNew}>Send</Button>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}