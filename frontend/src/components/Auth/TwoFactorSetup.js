import React, { useState, useEffect } from 'react';
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
  Alert,
  Paper
} from '@mui/material';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

export default function TwoFactorSetup({ open, onClose }) {
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('generate'); // generate, verify, success
  
  const { currentUser, setupTwoFactorAuth, verifyTwoFactorSetup } = useAuth();
  const { showNotification } = useNotification();
  
  // Generate a secret when the dialog opens
  useEffect(() => {
    if (open && step === 'generate') {
      generateSecret();
    }
  }, [open]);
  
  const generateSecret = async () => {
    setLoading(true);
    try {
      // Generate a new secret
      const newSecret = authenticator.generateSecret();
      setSecret(newSecret);
      
      // Generate QR code
      const otpauth = authenticator.keyuri(
        currentUser.email, 
        'Resume Job Matcher', 
        newSecret
      );
      
      const qrCode = await QRCode.toDataURL(otpauth);
      setQrCodeUrl(qrCode);
      
      setLoading(false);
      setStep('verify');
    } catch (error) {
      console.error('Error generating 2FA setup:', error);
      setError('Failed to generate QR code. Please try again.');
      setLoading(false);
    }
  };
  
  const handleCancel = () => {
    setVerificationCode('');
    setError('');
    setStep('generate');
    onClose();
  };
  
  const handleVerify = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Verify the code locally first
      const isValid = authenticator.verify({ 
        token: verificationCode, 
        secret: secret 
      });
      
      if (!isValid) {
        setError('Invalid verification code. Please try again.');
        setLoading(false);
        return;
      }
      
      // If valid, save the 2FA secret to the user's account
      await setupTwoFactorAuth(secret);
      
      setLoading(false);
      setStep('success');
      showNotification('Two-factor authentication has been set up successfully!', 'success');
    } catch (error) {
      console.error('Error verifying 2FA setup:', error);
      setError(`Failed to verify: ${error.message}`);
      setLoading(false);
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={handleCancel} 
      maxWidth="sm" 
      fullWidth
    >
      <DialogTitle>
        Set Up Two-Factor Authentication
      </DialogTitle>
      <DialogContent>
        {step === 'verify' && (
          <>
            <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
              Scan this QR code with your authenticator app (like Google Authenticator, 
              Microsoft Authenticator, or Authy).
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', my: 3 }}>
                <Paper elevation={2} sx={{ p: 2, display: 'inline-block' }}>
                  <img src={qrCodeUrl} alt="QR Code" style={{ width: '200px', height: '200px' }} />
                </Paper>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    If you can't scan the QR code, use this secret key in your app:
                  </Typography>
                  <Typography variant="body2" component="div" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      backgroundColor: '#f5f5f5', 
                      p: 1, 
                      borderRadius: 1,
                      mt: 1,
                      wordBreak: 'break-all'
                    }}
                  >
                    {secret}
                  </Typography>
                </Box>
              </Box>
            )}
            
            <TextField
              margin="normal"
              fullWidth
              label="Verification Code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code from app"
              variant="outlined"
              inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
              error={!!error}
              helperText={error}
              disabled={loading}
              sx={{ mt: 3 }}
            />
          </>
        )}
        
        {step === 'success' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Two-factor authentication has been successfully enabled for your account!
            You will now be asked for a verification code when signing in.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="primary">
          {step === 'success' ? 'Close' : 'Cancel'}
        </Button>
        {step === 'verify' && (
          <Button 
            onClick={handleVerify} 
            color="primary" 
            variant="contained" 
            disabled={loading || !verificationCode}
          >
            {loading ? <CircularProgress size={24} /> : 'Verify & Activate'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
} 