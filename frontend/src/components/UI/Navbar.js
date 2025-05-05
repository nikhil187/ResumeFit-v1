import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Avatar, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import WorkIcon from '@mui/icons-material/Work';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [userPhotoURL, setUserPhotoURL] = useState('');
  
  const isDashboardPage = location.pathname === '/dashboard';
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname);
  
  // Update profile picture URL when currentUser changes
  useEffect(() => {
    if (currentUser && currentUser.photoURL) {
      setUserPhotoURL(currentUser.photoURL);
    } else {
      setUserPhotoURL('');
    }
  }, [currentUser]);
  
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
    handleClose();
  };
  
  const handleReports = () => {
    navigate('/reports');
    handleClose();
  };

  const handleDashboard = () => {
    navigate('/dashboard');
    handleClose();
  };

  const goToHome = () => {
    navigate('/');
  };

  const handleProfile = () => {
    navigate('/profile');
    handleClose();
  };

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        borderRadius: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
      }}
    >
      <Toolbar>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            flexGrow: 1 
          }}
          onClick={goToHome}
        >
          <WorkIcon sx={{ mr: 1, fontSize: 28 }} />
          <Typography variant="h6" component="div">
            ResumeFit
          </Typography>
        </Box>
        
        {/* Don't show user profile on auth pages, regardless of login state */}
        {!isAuthPage && (
          <>
            {currentUser ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {!isDashboardPage && (
                  <Button 
                    color="inherit" 
                    onClick={handleDashboard}
                    sx={{ mr: 2, borderRadius: 0 }}
                  >
                    Dashboard
                  </Button>
                )}
                <Typography variant="body1" sx={{ mr: 2 }}>
                  {currentUser.displayName || currentUser.email}
                </Typography>
                <Avatar 
                  src={userPhotoURL}
                  onClick={handleMenu}
                  sx={{ 
                    cursor: 'pointer',
                    bgcolor: userPhotoURL ? 'transparent' : 'primary.main' 
                  }}
                >
                  {!userPhotoURL && (currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U')}
                </Avatar>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  PaperProps={{
                    sx: { borderRadius: 0 }
                  }}
                >
                  {isDashboardPage ? null : (
                    <MenuItem onClick={handleDashboard}>Dashboard</MenuItem>
                  )}
                  <MenuItem onClick={handleReports}>My Reports</MenuItem>
                  <MenuItem onClick={handleProfile}>
                    <ListItemIcon>
                      <AccountCircleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Profile</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </Menu>
              </Box>
            ) : (
              <Box>
                <Button 
                  color="inherit" 
                  onClick={() => navigate('/login')}
                  sx={{ mr: 1, borderRadius: 0 }}
                >
                  Login
                </Button>
                <Button 
                  variant="outlined" 
                  color="inherit"
                  onClick={() => navigate('/register')}
                  sx={{ borderRadius: 0 }}
                >
                  Sign Up
                </Button>
              </Box>
            )}
          </>
        )}
        
        {/* Always show auth buttons on auth pages */}
        {isAuthPage && (
          <Box>
            {location.pathname !== '/login' && (
              <Button 
                color="inherit" 
                onClick={() => navigate('/login')}
                sx={{ mr: 1, borderRadius: 0 }}
              >
                Login
              </Button>
            )}
            {location.pathname !== '/register' && (
              <Button 
                variant="outlined" 
                color="inherit"
                onClick={() => navigate('/register')}
                sx={{ borderRadius: 0 }}
              >
                Sign Up
              </Button>
            )}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;