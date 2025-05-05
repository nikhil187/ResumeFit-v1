import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useNotification } from '../../contexts/NotificationContext';

function NotificationSnackbar() {
  const { notification, hideNotification } = useNotification() || { notification: { show: false } };

  // If notification is null or undefined, don't render anything
  if (!notification) {
    return null;
  }

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    hideNotification();
  };

  return (
    <Snackbar
      open={notification.show || false}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert 
        onClose={handleClose} 
        severity={notification.type || 'info'} 
        sx={{ width: '100%' }}
      >
        {notification.message || ''}
      </Alert>
    </Snackbar>
  );
}

export default NotificationSnackbar;