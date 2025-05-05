import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Link, 
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  FormHelperText
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { FirebaseError } from 'firebase/app';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  
  const { signup, updateUserProfile, logout, currentUser, signInWithGoogle, signInWithGithub, sendEmailVerification } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  // Log out any existing user when visiting the register page
  useEffect(() => {
    const checkAndLogout = async () => {
      if (currentUser) {
        try {
          await logout();
          console.log('Logged out previous user on register page');
        } catch (error) {
          console.error('Error logging out:', error);
        }
      }
    };
    
    checkAndLogout();
  }, [currentUser, logout]);
  
  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return errors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }
    
    const passwordValidationErrors = validatePassword(password);
    if (passwordValidationErrors.length > 0) {
      setPasswordErrors(passwordValidationErrors);
      setError('Please fix the password requirements');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setError('');
      setPasswordErrors([]);
      setLoading(true);
      
      // Create the user and store the credential
      const userCredential = await signup(email, password);
      
      // Use the user from the credential
      if (displayName) {
        await updateUserProfile(displayName);
      }
      
      // Send verification email
      await sendEmailVerification();
      
      showNotification('Account created! Please check your email to verify your account.', 'success');
      navigate('/profile');
    } catch (error) {
      console.error('Registration error:', error);
      
      // Check if the error is a FirebaseError and if it is an email already in use error
      if (error instanceof FirebaseError && error.code === 'auth/email-already-in-use') {
        setError(
          <Box>
            This email is already registered. You're all set! 
            <Button 
              component={RouterLink} 
              to="/login"
              color="primary"
              size="small"
              sx={{ ml: 1 }}
            >
              Go to Login
            </Button>
          </Box>
        );
        showNotification('This email already has an account. Please log in instead.', 'info');
      } else {
        setError(error.message || 'Failed to create an account');
        showNotification('Failed to create account: ' + error.message, 'error');
      }
      
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
      showNotification('Successfully registered with Google!', 'success');
      navigate('/dashboard');
    } catch (error) {
      console.error('Google registration error:', error);
      setError(error.message || 'Failed to register with Google');
      showNotification('Failed to register with Google: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGithubSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGithub();
      showNotification('Successfully registered with GitHub!', 'success');
      navigate('/dashboard');
    } catch (error) {
      console.error('GitHub registration error:', error);
      setError(error.message || 'Failed to register with GitHub');
      showNotification('Failed to register with GitHub: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClickShowPassword = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };
  
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Create Account
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            fullWidth
            id="displayName"
            label="Display Name (optional)"
            name="displayName"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordErrors(validatePassword(e.target.value));
            }}
            disabled={loading}
            error={passwordErrors.length > 0}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => handleClickShowPassword('password')}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <FormHelperText error={passwordErrors.length > 0}>
            {passwordErrors.length > 0 || password === '' ? (
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {passwordErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </Box>
            ) : null}
          </FormHelperText>
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle confirm password visibility"
                    onClick={() => handleClickShowPassword('confirm')}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign Up'}
          </Button>
          
          <Divider sx={{ my: 3 }}>OR</Divider>
          
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignIn}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            Sign up with Google
          </Button>
          
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GitHubIcon />}
            onClick={handleGithubSignIn}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            Sign up with GitHub
          </Button>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link component={RouterLink} to="/login" variant="body2">
              Already have an account? Log In
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

export default Register;