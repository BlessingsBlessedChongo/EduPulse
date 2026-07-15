import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import {
  AppBar, Toolbar, Button, Typography, Drawer, List, ListItem, ListItemIcon, ListItemText,
  Box, IconButton, useMediaQuery, useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MessageIcon from '@mui/icons-material/Message';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useState } from 'react';

const drawerWidth = 240;

export default function Layout() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const role = user?.role?.toLowerCase();
  const basePath = role ? `/${role}` : '';

  const links = user ? [
    { text: 'Dashboard', icon: <DashboardIcon />, to: basePath },
    { text: 'Classes', icon: <ClassIcon />, to: `${basePath}/classes`, roles: ['admin','teacher'] },
    { text: 'Assignments', icon: <AssignmentIcon />, to: `${basePath}/assignments`, roles: ['teacher','student'] },
    { text: 'Users', icon: <PeopleIcon />, to: `${basePath}/users`, roles: ['admin'] },
    { text: 'Messages', icon: <MessageIcon />, to: `${basePath}/messages` },
    { text: 'Notifications', icon: <NotificationsIcon />, to: `${basePath}/notifications` },
    { text: 'AI Tools', icon: <PsychologyIcon />, to: `${basePath}/ai-tools`, roles: ['admin','teacher','student'] },
    { text: 'Reports', icon: <AssessmentIcon />, to: `${basePath}/reports`, roles: ['admin','teacher'] },
  ].filter(item => !item.roles || item.roles.includes(role)) : [];

  const drawer = (
    <Box sx={{ pt: 2 }}>
      <Typography variant="h6" sx={{ textAlign: 'center', mb: 2 }}>
        EduPulse
      </Typography>
      <List>
        {links.map(link => (
          <ListItem button component={Link} to={link.to} key={link.text} onClick={() => setMobileOpen(false)}>
            <ListItemIcon>{link.icon}</ListItemIcon>
            <ListItemText primary={link.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && user && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            EduPulse
          </Typography>
          {user && (
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {user && (
        isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
            }}
          >
            <Toolbar />
            {drawer}
          </Drawer>
        )
      )}

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
}