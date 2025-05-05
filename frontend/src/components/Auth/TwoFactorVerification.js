import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Typography, 
  Box, 
  CircularProgress,
  Alert
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

export default function TwoFactorVerification({ open, onClose, onSuccess, email }) {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { verifyTwoFactorAuth } = useAuth();
  const { showNotification } = useNotification();
  
  const handleCancel = () => {
    setVerificationCode('');
    setError('');
    onClose();
  };
  
  const handleVerify = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }
    
    if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
      setError('Verification code must be 6 digits');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Verifying 2FA code for email:', email);
      const result = await verifyTwoFactorAuth(email, verificationCode);
      setLoading(false);
      
      if (result.success) {
        console.log('2FA verification successful, calling onSuccess with:', result.user);
        showNotification('Two-factor authentication verified successfully!', 'success');
        setVerificationCode('');
        
        // Call onSuccess with the user data, always pass the email in case we need it
        onSuccess({...result.user, email});
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      setError(`Verification failed: ${error.message}`);
      setLoading(false);
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={handleCancel} 
      maxWidth="xs" 
      fullWidth
    >
      <DialogTitle>
        Two-Factor Authentication
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
          Enter the 6-digit verification code from your authenticator app.
        </Typography>
        
        <TextField
          margin="normal"
          fullWidth
          label="Verification Code"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          placeholder="Enter 6-digit code"
          variant="outlined"
          inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
          error={!!error}
          helperText={error}
          disabled={loading}
          autoFocus
        />
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="primary">
          Cancel
        </Button>
        <Button 
          onClick={handleVerify} 
          color="primary" 
          variant="contained" 
          disabled={loading || !verificationCode}
        >
          {loading ? <CircularProgress size={24} /> : 'Verify'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 