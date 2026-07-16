import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import {
  AppBar,
  Toolbar,
  Button,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  IconButton,
  useMediaQuery,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MessageIcon from '@mui/icons-material/Message';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SchoolIcon from '@mui/icons-material/School';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import { useState } from 'react';

const drawerWidth = 260;

export default function Layout() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
    setAnchorEl(null);
  };

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const role = user?.role?.toLowerCase();
  const basePath = role ? `/${role}` : '';

  const links = user
    ? [
        { text: 'Dashboard', icon: <DashboardIcon />, to: basePath, roles: ['student', 'teacher', 'admin', 'parent'] },
        { text: 'Classes', icon: <ClassIcon />, to: `${basePath}/classes`, roles: ['admin', 'teacher'] },
        { text: 'Assignments', icon: <AssignmentIcon />, to: `${basePath}/assignments`, roles: ['teacher', 'student'] },
        { text: 'Users', icon: <PeopleIcon />, to: `${basePath}/users`, roles: ['admin'] },
        { text: 'Messages', icon: <MessageIcon />, to: `${basePath}/messages`, roles: ['student', 'teacher', 'admin', 'parent'] },
        { text: 'Notifications', icon: <NotificationsIcon />, to: `${basePath}/notifications`, roles: ['student', 'teacher', 'admin', 'parent'] },
        { text: 'AI Tools', icon: <PsychologyIcon />, to: `${basePath}/ai-tools`, roles: ['admin', 'teacher', 'student'] },
      ].filter((item) => !item.roles || item.roles.includes(role))
    : [];

  const isActive = (path) => location.pathname.startsWith(path);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      {/* Drawer Header */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon sx={{ fontSize: '28px', color: '#3b5bde' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            EduPulse
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={() => setMobileOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Navigation Links */}
      <List sx={{ flex: 1, pt: 2 }}>
        {links.map((link) => (
          <ListItem
            button
            component={Link}
            to={link.to}
            key={link.text}
            onClick={() => isMobile && setMobileOpen(false)}
            sx={{
              mx: 1,
              mb: 1,
              borderRadius: '8px',
              background: isActive(link.to) ? 'linear-gradient(135deg, rgba(59, 91, 222, 0.1) 0%, rgba(91, 78, 247, 0.1) 100%)' : 'transparent',
              borderLeft: isActive(link.to) ? '3px solid #3b5bde' : 'none',
              color: isActive(link.to) ? '#3b5bde' : 'var(--text-primary)',
              '&:hover': {
                background: isActive(link.to) ? 'linear-gradient(135deg, rgba(59, 91, 222, 0.15) 0%, rgba(91, 78, 247, 0.15) 100%)' : 'var(--surface-alt)',
              },
              transition: 'all 300ms',
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: '40px' }}>{link.icon}</ListItemIcon>
            <ListItemText primary={link.text} primaryTypographyProps={{ fontWeight: isActive(link.to) ? 700 : 500, fontSize: '0.95rem' }} />
          </ListItem>
        ))}
      </List>

      {/* User Profile Section */}
      <Box sx={{ p: 2, borderTop: '1px solid var(--border-light)' }}>
        <Box
          onClick={handleProfileClick}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            borderRadius: '8px',
            background: 'var(--surface-alt)',
            cursor: 'pointer',
            '&:hover': {
              background: 'var(--surface)',
              borderColor: '#3b5bde',
            },
            transition: 'all 300ms',
            border: '1px solid transparent',
          }}
        >
          <Avatar
            sx={{
              background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)',
              color: 'white',
              fontWeight: 700,
              width: '40px',
              height: '40px',
            }}
          >
            {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, truncate: true, color: 'var(--text-primary)' }}>
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-tertiary)', display: 'block', truncate: true }}>
              {user?.role}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border-light)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          {isMobile && user && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, color: '#3b5bde' }}>
              <MenuIcon />
            </IconButton>
          )}

          {/* Spacer for larger screens */}
          {!isMobile && user && <Box sx={{ width: drawerWidth }} />}

          {/* Title */}
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              fontSize: { xs: '1.125rem', sm: '1.25rem' },
              color: 'var(--text-primary)',
              display: user ? { xs: 'none', sm: 'block' } : 'block',
            }}
          >
            {user ? 'Dashboard' : 'EduPulse'}
          </Typography>

          {/* Right Side - Notifications & Profile */}
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                component={Link}
                to={`${basePath}/notifications`}
                sx={{ color: '#3b5bde', '&:hover': { background: 'var(--surface-alt)' } }}
              >
                <NotificationsIcon />
              </IconButton>

              <Divider orientation="vertical" flexItem sx={{ background: 'var(--border-light)' }} />

              <Box onClick={handleProfileClick} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', p: 1, borderRadius: '8px', '&:hover': { background: 'var(--surface-alt)' }, transition: 'all 300ms' }}>
                <Avatar
                  sx={{
                    background: 'linear-gradient(135deg, #3b5bde 0%, #5b4ef7 100%)',
                    color: 'white',
                    fontWeight: 700,
                    width: '36px',
                    height: '36px',
                    fontSize: '0.875rem',
                  }}
                >
                  {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                </Avatar>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  {user?.first_name}
                </Typography>
              </Box>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Profile Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} sx={{ '& .MuiPaper-root': { borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border-light)' } }}>
        <MenuItem onClick={handleClose} component={Link} to={`${basePath}/settings`} sx={{ '&:hover': { background: 'var(--surface-alt)' } }}>
          <SettingsIcon sx={{ mr: 1, color: '#3b5bde' }} />
          Settings
        </MenuItem>
        <Divider sx={{ my: 1, background: 'var(--border-light)' }} />
        <MenuItem onClick={handleLogout} sx={{ '&:hover': { background: 'var(--surface-alt)' } }}>
          <LogoutIcon sx={{ mr: 1, color: '#ef4444' }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Sidebar Drawer */}
      {user &&
        (isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                background: 'var(--surface)',
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                background: 'var(--surface)',
                borderRight: '1px solid var(--border-light)',
              },
            }}
          >
            <Toolbar />
            {drawer}
          </Drawer>
        ))}

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, mt: 8, minHeight: 'calc(100vh - 64px)' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
