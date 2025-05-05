import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Link, 
  Paper, 
  Box, 
  Divider, 
  IconButton, 
  InputAdornment, 
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { Visibility, VisibilityOff, Google, GitHub } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import TwoFactorVerification from './TwoFactorVerification';
import { auth } from '../../services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  
  const { login, signInWithGoogle, signInWithGithub, sendEmailVerification, logout, currentUser } = useAuth();
  const { showNotification } = useNotification();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showTwoFactorDialog, setShowTwoFactorDialog] = useState(false);
  
  // Don't automatically log out when visiting the login page
  useEffect(() => {
    // Check if we were redirected here after a successful email verification
    const checkEmailVerificationStatus = async () => {
      if (currentUser && currentUser.emailVerified) {
        console.log('User is already verified, redirecting to dashboard');
        navigate('/dashboard');
      }
    };
    
    checkEmailVerificationStatus();
  }, [currentUser, navigate]);
  
  const validate = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    console.log('Starting login process for:', email);
    
    try {
      const result = await login(email, password);
      console.log('Login result:', result);
      
      // Check if 2FA is required
      if (result.requiresTwoFactor) {
        console.log('Two-factor authentication required');
        setShowTwoFactorDialog(true);
        setLoading(false);
        return;
      }
      
      // If not 2FA, continue with normal flow
      const userCredential = result;
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        console.log('Email not verified, showing verification dialog');
        setShowVerificationDialog(true);
        setLoading(false);
        // Don't logout here - keep the user logged in so we can send the verification email
        return;
      }
      
      // Successful login
      showNotification('Successfully logged in!', 'success');
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      setLoading(false);
      
      // Handle other errors
      let errorMessage = 'Failed to log in';
      
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many unsuccessful login attempts. Please try again later.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled. Please contact support.';
          break;
        default:
          errorMessage = error.message || 'An unexpected error occurred';
      }
      
      showNotification(errorMessage, 'error');
    }
  };
  
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      showNotification('Successfully logged in with Google!', 'success');
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Google sign-in error:', error);
      showNotification(error.message || 'Failed to sign in with Google', 'error');
    }
  };
  
  const handleGithubSignIn = async () => {
    try {
      await signInWithGithub();
      showNotification('Successfully logged in with GitHub!', 'success');
      navigate(from, { replace: true });
    } catch (error) {
      console.error('GitHub sign-in error:', error);
      showNotification(error.message || 'Failed to sign in with GitHub', 'error');
    }
  };
  
  const handleSendVerification = async () => {
    setLoading(true);
    try {
      console.log('Sending verification email...');
      await sendEmailVerification();
      showNotification('Verification email sent! Please check your inbox.', 'success');
      setShowVerificationDialog(false);
      // After sending verification, we can log the user out
      logout();
    } catch (error) {
      console.error('Error sending verification email:', error);
      showNotification('Error sending verification email: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTwoFactorSuccess = (user) => {
    console.log('Two-factor authentication successful, redirecting to dashboard', user);
    setShowTwoFactorDialog(false);
    
    // Create a flag to indicate if we need to sign in again
    const needsSignIn = !user.uid;
    
    if (needsSignIn) {
      // User object doesn't have a uid, meaning we need to sign in again
      console.log('User session expired during 2FA, signing in again');
      setLoading(true);
      
      // Sign in again with the saved credentials
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          console.log('Re-authenticated successfully after 2FA');
          setLoading(false);
          showNotification('Successfully logged in!', 'success');
          navigate(from, { replace: true });
        })
        .catch((error) => {
          console.error('Error re-authenticating after 2FA:', error);
          setLoading(false);
          showNotification('Error completing authentication. Please try again.', 'error');
        });
    } else {
      // User is already authenticated, proceed to dashboard
      showNotification('Successfully logged in!', 'success');
      
      // Ensure we're redirecting to the dashboard or original destination
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500); // Small delay to ensure the notification is shown
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Sign In
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            
            <Grid container>
              <Grid item xs>
                <Link component={RouterLink} to="/forgot-password" variant="body2">
                  Forgot password?
                </Link>
              </Grid>
              <Grid item>
                <Link component={RouterLink} to="/register" variant="body2">
                  {"Don't have an account? Sign Up"}
                </Link>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Google />}
                  onClick={handleGoogleSignIn}
                >
                  Sign in with Google
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<GitHub />}
                  onClick={handleGithubSignIn}
                >
                  Sign in with GitHub
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>
      
      {/* Email Verification Dialog */}
      <Dialog open={showVerificationDialog} onClose={() => setShowVerificationDialog(false)}>
        <DialogTitle>Email Verification Required</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your email address has not been verified. Please verify your email to continue.
            If you haven't received a verification email, you can request a new one.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVerificationDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendVerification} 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Send Verification Email'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Two-Factor Authentication Dialog */}
      <TwoFactorVerification
        open={showTwoFactorDialog}
        onClose={() => setShowTwoFactorDialog(false)}
        onSuccess={handleTwoFactorSuccess}
        email={email}
      />
    </Container>
  );
}