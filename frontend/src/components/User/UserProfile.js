import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Divider, 
  Alert,
  TextField,
  Grid,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Card,
  CardContent,
  Tabs,
  Tab,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ArticleIcon from '@mui/icons-material/Article';
import WorkIcon from '@mui/icons-material/Work';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SecurityIcon from '@mui/icons-material/Security';
import { styled } from '@mui/material/styles';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject, getMetadata, uploadString } from 'firebase/storage';
import { renderAsync } from 'docx-preview';
import TwoFactorSetup from '../Auth/TwoFactorSetup';

// Styled component for file input
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

function UserProfile() {
  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: '',
    profession: '',
    skills: '',
    bio: ''
  });
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reAuthDialogOpen, setReAuthDialogOpen] = useState(false);
  const [reAuthPassword, setReAuthPassword] = useState('');
  const [reAuthError, setReAuthError] = useState('');
  const [resumeFiles, setResumeFiles] = useState([]);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedResumeUrl, setSelectedResumeUrl] = useState('');
  const [selectedResumeType, setSelectedResumeType] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  
  const { 
    currentUser, 
    sendEmailVerification, 
    isEmailVerified, 
    resetPassword, 
    updateUserProfile,
    logout,
    deleteAccount,
    isTwoFactorEnabled,
    disableTwoFactorAuth
  } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  // Add this ref for the docx viewer
  const docxViewerRef = useRef(null);

  // Load user data when component mounts
  useEffect(() => {
    if (currentUser) {
      setProfileData(prevData => ({
        ...prevData,
        displayName: currentUser.displayName || ''
      }));
      
      // Set profile photo URL if available
      if (currentUser.photoURL) {
        setProfilePhotoUrl(currentUser.photoURL);
      }
      
      // Check email verification more safely
      const checkEmailVerification = async () => {
        try {
          // Only reload if user is not verified
          if (!currentUser.emailVerified) {
            await currentUser.reload();
            // Check verification status after reload
            if (!isEmailVerified()) {
              showNotification('Please verify your email to enable all features', 'warning');
            }
          }
        } catch (error) {
          console.error('Error checking email verification:', error);
          // Don't show notification for network errors to avoid spamming the user
          if (error.code !== 'auth/network-request-failed') {
            showNotification('Error checking verification status', 'warning');
          }
        }
      };
      
      // Only check email verification if we have a valid user
      if (currentUser && currentUser.email) {
        checkEmailVerification();
      }
      
      // Run directory check and resume fetch only once when component mounts
      const loadUserData = async () => {
        await ensureDirectoryExists();
        await fetchUserResumes();
      };
      
      loadUserData();
    }
  }, [currentUser]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      showNotification('You are currently offline. Some features may not work.', 'warning');
    }
  }, [isOnline, showNotification]);

  const handleSendVerification = async () => {
    try {
      setLoading(true);
      await sendEmailVerification();
      setVerificationSent(true);
      showNotification('Verification email sent! Check your inbox.', 'success');
    } catch (error) {
      console.error('Error sending verification email:', error);
      showNotification('Error sending verification email: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setLoading(true);
      await resetPassword(currentUser.email);
      showNotification('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      showNotification('Error sending password reset email: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  const handleEditToggle = () => {
    if (editMode) {
      // If we're currently in edit mode, save changes
      handleSaveProfile();
    }
    setEditMode(!editMode);
  };
  
  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      // Update display name and photo URL in Firebase Auth
      await updateUserProfile(profileData.displayName, profilePhotoUrl || null);
      
      // Here you would also save the other profile fields to your database
      // For example, using Firestore to store additional user data
      // const userRef = doc(db, "users", currentUser.uid);
      // await setDoc(userRef, { 
      //   profession: profileData.profession,
      //   skills: profileData.skills,
      //   bio: profileData.bio
      // }, { merge: true });
      
      showNotification('Profile updated successfully!', 'success');
      setEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('Error updating profile: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Profile photo upload handler
  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Reset the file input to allow re-uploading the same file
    event.target.value = null;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      showNotification('Please upload an image file (JPEG, PNG, etc.)', 'error');
      return;
    }
    
    // Check file size - limit to 2MB
    if (file.size > 2 * 1024 * 1024) {
      showNotification('Image file size must be less than 2MB', 'error');
      return;
    }
    
    try {
      setUploadingPhoto(true);
      
      // Get storage reference
      const storage = getStorage();
      const profilePhotoRef = ref(storage, `users/${currentUser.uid}/profile-photo`);
      
      // Upload file
      await uploadBytes(profilePhotoRef, file);
      
      // Get download URL
      const photoURL = await getDownloadURL(profilePhotoRef);
      
      // Update state
      setProfilePhotoUrl(photoURL);
      
      showNotification('Profile photo uploaded successfully', 'success');
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      showNotification('Error uploading profile photo: ' + error.message, 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Reset the file input to allow re-uploading the same file
    event.target.value = null;
    
    // Extract file extension more safely
    const parts = file.name.split('.');
    const fileExt = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
    
    // Check file extension
    if (!['pdf', 'doc', 'docx'].includes(fileExt)) {
      showNotification('Invalid file format. Please upload PDF, DOC, or DOCX files.', 'error');
      return;
    }
    
    // Check file size - limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      showNotification('File is too large. Maximum size is 5MB.', 'error');
      return;
    }
    
    try {
      setUploadingResume(true);
      
      // Create a reference to Firebase Storage
      const storage = getStorage();
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `resumes/${currentUser.uid}/${fileName}`);
      
      // Log the upload attempt
      console.log('Attempting to upload file to:', storageRef.fullPath);
      
      // Upload the file with metadata
      const metadata = {
        contentType: 
          fileExt === 'pdf' ? 'application/pdf' : 
          fileExt === 'doc' ? 'application/msword' : 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file, metadata);
      console.log('Uploaded file successfully!', snapshot);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('File available at', downloadURL);
      
      // Add newly uploaded file to the resumeFiles state
      await fetchUserResumes();
      showNotification('Resume uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading resume:', error);
      showNotification('Error uploading resume: ' + error.message, 'error');
    } finally {
      setUploadingResume(false);
    }
  };
  
  const handleDeleteAccount = () => {
    setDeleteDialogOpen(true);
  };
  
  const handleReAuthenticate = async () => {
    try {
      setLoading(true);
      setReAuthError('');
      
      // Create credential with the user's email and the provided password
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        reAuthPassword
      );
      
      // Re-authenticate
      await reauthenticateWithCredential(currentUser, credential);
      
      // Close dialog and proceed with account deletion
      setReAuthDialogOpen(false);
      proceedWithAccountDeletion();
    } catch (error) {
      console.error('Re-authentication error:', error);
      setReAuthError('Incorrect password. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const confirmDeleteAccount = async () => {
    try {
      // First try to delete directly
      proceedWithAccountDeletion();
    } catch (error) {
      // If reauthentication is required, show the dialog
      if (error.code === 'auth/requires-recent-login') {
        setReAuthDialogOpen(true);
      } else {
        console.error('Error deleting account:', error);
        showNotification('Error deleting account: ' + error.message, 'error');
      }
    }
  };
  
  const proceedWithAccountDeletion = async () => {
    try {
      setLoading(true);
      await deleteAccount();
      showNotification('Account deleted successfully', 'success');
      localStorage.removeItem('emailForSignIn');
      navigate('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        setReAuthDialogOpen(true);
      } else {
        showNotification('Error deleting account: ' + error.message, 'error');
      }
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      showNotification('Error logging out: ' + error.message, 'error');
    }
  };
  
  const fetchUserResumes = async () => {
    // Add a loading check to prevent multiple simultaneous calls
    if (!currentUser || loading) {
      return;
    }
    
    // Log once per fetch operation
    console.log('Fetching resumes for user:', currentUser.uid);
    
    try {
      setLoading(true);
      const storage = getStorage();
      
      // Ensure this path matches your storage structure
      const listRef = ref(storage, `resumes/${currentUser.uid}`);
      
      console.log('Fetching resumes from path:', `resumes/${currentUser.uid}`);
      
      const result = await listAll(listRef);
      console.log('Files found:', result.items.length);
      
      if (result.items.length === 0) {
        console.log('No files found in directory');
        setResumeFiles([]);
        setLoading(false);
        return;
      }
      
      const files = await Promise.all(
        result.items.map(async (itemRef) => {
          try {
            const url = await getDownloadURL(itemRef);
            const name = itemRef.name;
            // Extract file extension more safely
            const parts = name.split('.');
            const extension = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
            const type = ['pdf', 'doc', 'docx'].includes(extension) ? extension : 'unknown';
            
            // Parse date from filename safely
            let uploadDate = new Date();
            try {
              const timeStamp = name.split('_')[0];
              if (timeStamp && !isNaN(parseInt(timeStamp))) {
                uploadDate = new Date(parseInt(timeStamp));
              }
            } catch (e) {
              console.error('Error parsing date from filename:', e);
            }
            
            return {
              name,
              url,
              type,
              date: uploadDate.toLocaleDateString()
            };
          } catch (error) {
            console.error('Error getting download URL for file:', itemRef.name, error);
            return null;
          }
        })
      );
      
      // Filter out any null items (failed to get URL)
      const validFiles = files.filter(file => file !== null);
      console.log('Processed files:', validFiles);
      setResumeFiles(validFiles);
    } catch (error) {
      console.error('Error fetching resumes:', error);
      showNotification('Error loading resumes: ' + error.message, 'warning');
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewResume = (url, type) => {
    setSelectedResumeUrl(url);
    setSelectedResumeType(type);
    setViewDialogOpen(true);
  };
  
  const renderResumePreview = () => {
    if (!selectedResumeUrl) return null;
    
    if (selectedResumeType === 'pdf') {
      return (
        <iframe 
          src={`${selectedResumeUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          width="100%" 
          height="500px" 
          title="Resume Preview"
          style={{ border: 'none' }}
        />
      );
    } else if (['doc', 'docx'].includes(selectedResumeType)) {
      return (
        <Box>
          {/* DOCX Viewer Container */}
          <div 
            ref={docxViewerRef}
            style={{
              border: "1px solid #ccc",
              padding: "16px",
              height: "500px",
              overflow: "auto",
              backgroundColor: "#fff"
            }}
          >
            {/* DOCX content will be rendered here */}
          </div>
        </Box>
      );
    }
    
    return (
      <Typography variant="body1">
        No preview available for this file type.
      </Typography>
    );
  };
  
  const handleDeleteResume = async (resumeName) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const storage = getStorage();
      const fileRef = ref(storage, `resumes/${currentUser.uid}/${resumeName}`);
      
      await deleteObject(fileRef);
      console.log('File deleted successfully:', resumeName);
      
      // Refresh the list
      await fetchUserResumes();
      showNotification('Resume deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting resume:', error);
      showNotification('Error deleting resume: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const ensureDirectoryExists = async () => {
    // No need for console log here, it's spamming the console
    return true;
  };

  // Add this effect to handle DOCX preview when dialog opens
  useEffect(() => {
    const loadDocxPreview = async () => {
      if (viewDialogOpen && selectedResumeUrl && selectedResumeType === 'docx' && docxViewerRef.current) {
        try {
          // Clear previous content
          docxViewerRef.current.innerHTML = '';
          
          // Show loading indicator
          const loadingElement = document.createElement('div');
          loadingElement.textContent = 'Loading document...';
          loadingElement.style.textAlign = 'center';
          loadingElement.style.padding = '20px';
          docxViewerRef.current.appendChild(loadingElement);
          
          // Fetch the document
          const response = await fetch(selectedResumeUrl);
          if (!response.ok) {
            throw new Error('Failed to fetch the document');
          }
          
          // Get the document as ArrayBuffer
          const arrayBuffer = await response.arrayBuffer();
          
          // Clear loading indicator
          docxViewerRef.current.innerHTML = '';
          
          // Render the document
          await renderAsync(arrayBuffer, docxViewerRef.current);
        } catch (error) {
          console.error('Error rendering DOCX file:', error);
          
          if (docxViewerRef.current) {
            docxViewerRef.current.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Error loading document preview</div>';
          }
          
          showNotification('Error previewing DOCX file', 'error');
        }
      }
    };
    
    loadDocxPreview();
  }, [viewDialogOpen, selectedResumeUrl, selectedResumeType, showNotification]);

  const handleDisableTwoFactor = async () => {
    try {
      setLoading(true);
      await disableTwoFactorAuth();
      showNotification('Two-factor authentication has been disabled', 'success');
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      showNotification('Error disabling 2FA: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading profile...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Profile" />
          <Tab label="Account Security" />
          <Tab label="Resume & Jobs" />
        </Tabs>
        
        {/* Profile Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h4" component="h1">
                User Profile
              </Typography>
              <Button 
                variant="outlined" 
                startIcon={editMode ? null : <EditIcon />} 
                onClick={handleEditToggle}
              >
                {editMode ? 'Save Changes' : 'Edit Profile'}
              </Button>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
                <Box sx={{ position: 'relative', width: 'fit-content', mx: 'auto' }}>
                  <Avatar
                    src={profilePhotoUrl}
                    sx={{
                      width: 120,
                      height: 120,
                      mx: 'auto',
                      bgcolor: 'primary.main',
                      fontSize: '3rem'
                    }}
                  >
                    {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                  </Avatar>
                  
                  {editMode && (
                    <Box sx={{ mt: 2 }}>
                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<CloudUploadIcon />}
                        disabled={uploadingPhoto}
                        size="small"
                      >
                        {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                        <VisuallyHiddenInput 
                          type="file" 
                          accept="image/*"
                          onChange={handlePhotoUpload}
                        />
                      </Button>
                    </Box>
                  )}
                </Box>
                
                {!editMode ? (
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    {currentUser.displayName || 'Set your name'}
                  </Typography>
                ) : (
                  <TextField
                    margin="normal"
                    fullWidth
                    name="displayName"
                    label="Display Name"
                    value={profileData.displayName}
                    onChange={handleInputChange}
                  />
                )}
                
                <Typography variant="body2" color="text.secondary">
                  {currentUser.email}
                  {!isEmailVerified() && (
                    <Box component="span" sx={{ color: 'error.main', ml: 1 }}>
                      (Not verified)
                    </Box>
                  )}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={8}>
                {editMode ? (
                  <>
                    <TextField
                      fullWidth
                      label="Profession"
                      name="profession"
                      value={profileData.profession}
                      onChange={handleInputChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Skills (comma separated)"
                      name="skills"
                      value={profileData.skills}
                      onChange={handleInputChange}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Bio"
                      name="bio"
                      value={profileData.bio}
                      onChange={handleInputChange}
                      margin="normal"
                      multiline
                      rows={4}
                    />
                  </>
                ) : (
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <WorkIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Profession" 
                        secondary={profileData.profession || 'Not specified'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <AccountCircleIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Skills" 
                        secondary={profileData.skills || 'Not specified'} 
                      />
                    </ListItem>
                    <Divider />
                    <ListItem sx={{ display: 'block' }}>
                      <ListItemText 
                        primary="Bio" 
                        secondary={profileData.bio || 'Tell us about yourself'} 
                      />
                    </ListItem>
                  </List>
                )}
              </Grid>
            </Grid>
            
            {!isEmailVerified() && (
              <Box sx={{ mt: 3 }}>
                <Alert 
                  severity="warning" 
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={handleSendVerification}
                      disabled={loading || verificationSent}
                    >
                      {loading ? <CircularProgress size={16} /> : 'Verify Email'}
                    </Button>
                  }
                >
                  Your email is not verified. Verify your email to enable all features.
                </Alert>
                {verificationSent && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    Verification email sent! Please check your inbox.
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        )}
        
        {/* Account Security Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h4" component="h1">
                Account Security
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Email Verification
                  </Typography>
                  
                  {isEmailVerified() ? (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Your email is verified! Your account is secure.
                    </Alert>
                  ) : (
                    <Box>
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        Your email is not verified. This may limit your access to certain features.
                      </Alert>
                      
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSendVerification}
                        disabled={loading || verificationSent}
                        sx={{ mt: 2 }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Send Verification Email'}
                      </Button>
                      
                      {verificationSent && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          Verification email sent! Please check your inbox and click the link to verify your email.
                        </Alert>
                      )}
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="body2">
                      Email verification helps secure your account and enables all features of the application.
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Email" 
                      secondary={
                        <>
                          {currentUser.email}
                          {!isEmailVerified() && (
                            <Box component="span" sx={{ color: 'error.main', ml: 1 }}>
                              (Not verified)
                            </Box>
                          )}
                        </>
                      } 
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <LockIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Password" 
                      secondary="Reset your password if needed" 
                    />
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={handleResetPassword}
                      disabled={loading}
                    >
                      Reset
                    </Button>
                  </ListItem>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <ListItem>
                    <ListItemIcon>
                      <SecurityIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Two-Factor Authentication" 
                      secondary={
                        isTwoFactorEnabled() 
                          ? "Two-factor authentication is enabled" 
                          : "Add an extra layer of security to your account"
                      } 
                    />
                    {isTwoFactorEnabled() ? (
                      <Button 
                        variant="outlined" 
                        color="error"
                        onClick={handleDisableTwoFactor} 
                        disabled={loading}
                      >
                        {loading ? <CircularProgress size={24} /> : "Disable 2FA"}
                      </Button>
                    ) : (
                      <Button 
                        variant="outlined" 
                        color="primary"
                        onClick={() => setShowTwoFactorSetup(true)} 
                        disabled={loading || !isEmailVerified()}
                      >
                        {loading ? <CircularProgress size={24} /> : "Enable 2FA"}
                      </Button>
                    )}
                  </ListItem>
                  
                  <ListItem sx={{ display: 'block' }}>
                    <ListItemText 
                      primary="Delete Account" 
                      secondary="This action cannot be undone" 
                      sx={{ mb: 1 }}
                    />
                    <Button 
                      variant="outlined" 
                      color="error" 
                      startIcon={<DeleteIcon />}
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={loading}
                    >
                      Delete My Account
                    </Button>
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Resume & Jobs Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Resume & Job Preferences
            </Typography>
            
            <Divider sx={{ my: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ArticleIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Resume Management</Typography>
                    </Box>
                    
                    <Typography variant="body2" paragraph>
                      Upload your resume to analyze it against job descriptions
                    </Typography>
                    
                    <Button
                      component="label"
                      variant="contained"
                      startIcon={uploadingResume ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                      sx={{ mb: 2 }}
                      disabled={uploadingResume}
                    >
                      {uploadingResume ? 'Uploading...' : 'Upload Resume'}
                      <VisuallyHiddenInput 
                        type="file" 
                        accept=".pdf,.doc,.docx" 
                        onChange={handleFileUpload} 
                      />
                    </Button>
                    
                    <Typography variant="body2" gutterBottom>
                      Supported formats: PDF, DOC, DOCX
                    </Typography>
                    
                    {resumeFiles.length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Your Resumes:
                        </Typography>
                        <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: '#f5f5f5', borderRadius: 1 }}>
                          {resumeFiles.map((resume, index) => (
                            <ListItem
                              key={index}
                              secondaryAction={
                                <Box>
                                  <IconButton edge="end" onClick={() => handleViewResume(resume.url, resume.type)}>
                                    <VisibilityIcon />
                                  </IconButton>
                                  <IconButton edge="end" onClick={() => handleDeleteResume(resume.name)} color="error">
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              }
                            >
                              <ListItemIcon>
                                <DescriptionIcon color={resume.type === 'pdf' ? 'error' : 'primary'} />
                              </ListItemIcon>
                              <ListItemText 
                                primary={resume.name.substring(resume.name.indexOf('_') + 1)} 
                                secondary={`Uploaded: ${resume.date}`} 
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <WorkIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Job History</Typography>
                    </Box>
                    
                    <Button 
                      variant="outlined" 
                      color="primary"
                      onClick={() => navigate('/reports')}
                      sx={{ mb: 2 }}
                    >
                      View Saved Reports
                    </Button>
                    
                    <Typography variant="body2">
                      View your previous job match analyses and saved reports
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ mt: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <WorkIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Quick Actions</Typography>
                    </Box>
                    
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={() => navigate('/dashboard')}
                      sx={{ mr: 2 }}
                    >
                      New Resume Analysis
                    </Button>
                    
                    <Button 
                      variant="outlined" 
                      color="primary"
                      onClick={() => navigate('/quiz')}
                    >
                      Take Skills Quiz
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
      
      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteAccount} color="error" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Re-Authentication Dialog */}
      <Dialog
        open={reAuthDialogOpen}
        onClose={() => setReAuthDialogOpen(false)}
      >
        <DialogTitle>Confirm Your Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            For security reasons, please enter your password to continue with account deletion.
          </DialogContentText>
          {reAuthError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {reAuthError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            id="password"
            label="Password"
            type="password"
            fullWidth
            value={reAuthPassword}
            onChange={(e) => setReAuthPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReAuthDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleReAuthenticate} color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Resume View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Resume Preview</DialogTitle>
        <DialogContent>
          {renderResumePreview()}
        </DialogContent>
        <DialogActions>
          <Button 
            href={selectedResumeUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            color="primary"
          >
            Download
          </Button>
          <Button onClick={() => setViewDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Two-Factor Setup Dialog */}
      <TwoFactorSetup 
        open={showTwoFactorSetup} 
        onClose={() => setShowTwoFactorSetup(false)} 
      />
    </Container>
  );
}

export default UserProfile; 