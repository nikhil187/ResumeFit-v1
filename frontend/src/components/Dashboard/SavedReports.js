import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Card,
  CardContent,
  CardActions,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getUserReports, deleteReport, updateReportTitle } from '../../services/mongoDb';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';

function SavedReports() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentReportId, setCurrentReportId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewJobDescription, setPreviewJobDescription] = useState('');
  
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  
  useEffect(() => {
    // If no user, redirect to login
    if (!currentUser || !currentUser.uid) {
      showNotification('You must be logged in to view saved reports', 'error');
      navigate('/login');
      return;
    }
    
    const loadReports = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Loading reports for user:", currentUser.uid);
        
        // Get reports from MongoDB
        const userReports = await getUserReports(currentUser.uid);
        
        console.log("Reports loaded:", userReports);
        
        setReports(userReports);
        setLoading(false);
      } catch (error) {
        console.error('Error loading reports:', error);
        setError(error.message || "Failed to load reports");
        showNotification('Failed to load reports: ' + error.message, 'error');
        setLoading(false);
      }
    };
    
    loadReports();
  }, [currentUser, navigate, showNotification]);
  
  const handleViewReport = (reportId) => {
    if (!reportId) {
      showNotification('Invalid report ID', 'error');
      return;
    }
    console.log(`Navigating to report: ${reportId}`);
    navigate(`/reports/${reportId}`);
  };
  
  const handleDeleteReport = async (reportId) => {
    if (!reportId) {
      showNotification('Invalid report ID', 'error');
      return;
    }
    
    try {
      await deleteReport(currentUser.uid, reportId);
      
      // Remove the deleted report from the state
      setReports(reports.filter(report => report._id !== reportId));
      
      showNotification('Report deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting report:', error);
      showNotification('Failed to delete report: ' + error.message, 'error');
    }
  };
  
  const openEditTitleDialog = (reportId, currentTitle) => {
    console.log(`Opening edit dialog for report: ${reportId} with current title: "${currentTitle}"`);
    setCurrentReportId(reportId);
    setEditTitle(currentTitle);
    setEditDialogOpen(true);
  };
  
  const closeEditTitleDialog = () => {
    setEditDialogOpen(false);
    setCurrentReportId(null);
  };
  
  const handleUpdateTitle = async () => {
    if (!currentReportId || !editTitle.trim()) {
      showNotification('Invalid report ID or title', 'error');
      return;
    }
    
    try {
      console.log(`Attempting to update title for report: ${currentReportId}`);
      
      // Update the title in the database
      const newTitle = await updateReportTitle(currentUser.uid, currentReportId, editTitle);
      
      // Update the reports state
      setReports(reports.map(report => 
        report._id === currentReportId 
          ? { ...report, title: newTitle } 
          : report
      ));
      
      showNotification('Report title updated successfully', 'success');
      closeEditTitleDialog();
    } catch (error) {
      console.error('Error updating report title:', error);
      showNotification('Failed to update title: ' + error.message, 'error');
    }
  };
  
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };
  
  const openJobDescriptionPreview = (jobDescription) => {
    setPreviewJobDescription(jobDescription || 'No job description available');
    setPreviewDialogOpen(true);
  };
  
  const closeJobDescriptionPreview = () => {
    setPreviewDialogOpen(false);
  };
  
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading saved reports...
        </Typography>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Failed to load reports
          </Typography>
          <Typography variant="body1" paragraph>
            We encountered an error while loading your saved reports. Please try again later.
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={handleBackToDashboard}>
              Back to Dashboard
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Saved Reports</Typography>
        <Button variant="contained" onClick={handleBackToDashboard}>
          Back to Dashboard
        </Button>
      </Box>
      
      {reports.length === 0 ? (
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No saved reports
          </Typography>
          <Typography variant="body1" paragraph>
            You haven't saved any reports yet. Complete a job compatibility analysis to save a report.
          </Typography>
          <Button variant="contained" onClick={handleBackToDashboard}>
            Go to Dashboard
          </Button>
        </Paper>
      ) : (
        <Box sx={{ mb: 4 }}>
          {reports.map((report, index) => {
            // Debug logging
            console.log(`Report ${index} - ID: ${report._id}, title: ${report.title || "No title"}`);
            // Log the analysis data to see actual values
            console.log(`Report ${index} - Analysis data:`, { 
              skillsMatchPercentage: report.analysis?.skillsMatchPercentage,
              score: report.analysis?.score,
              categoryScores: report.analysis?.categoryScores
            });
            
            // Format date safely
            const createdDate = report.createdAt ? 
              new Date(report.createdAt).toLocaleString() : 
              'Unknown date';
            
            return (
              <Card key={report._id || index} sx={{ 
                mb: 2, 
                borderRadius: 2, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transform: 'translateY(-2px)'
                }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 500, color: 'primary.main' }} gutterBottom>
                      {report.title || "Job Analysis Report"}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => openEditTitleDialog(report._id, report.title || "Job Analysis Report")}
                      aria-label="Edit title"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Created: {createdDate}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    {/* Display match percentage with several fallbacks to ensure we always show a value */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                      p: 0.75,
                      pl: 1.5,
                      pr: 1.5,
                      borderRadius: 5,
                    }}>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>
                        Match Score: {
                         // Use a series of fallbacks to ensure we display a score
                         // Prioritize score over skillsMatchPercentage since that seems to be more accurate
                         report.analysis?.score || 
                         report.analysis?.skillsMatchPercentage || 
                         (report.analysis?.categoryScores ? 
                           // If categoryScores is available but skillsMatchPercentage isn't, calculate weighted average
                           Math.round(
                             (report.analysis.categoryScores.technicalSkills * 0.35) +
                             (report.analysis.categoryScores.experience * 0.25) + 
                             (report.analysis.categoryScores.education * 0.15) +
                             (report.analysis.categoryScores.quizPerformance * 0.15) +
                             (report.analysis.categoryScores.careerTrajectory * 0.10)
                           ) : 0
                         )
                        }%
                     </Typography>
                    </Box>
                  </Box>
                </CardContent>
                <CardActions sx={{ pt: 0, pb: 1.5, pl: 2, pr: 2 }}>
                  <Button 
                    size="small" 
                    onClick={() => handleViewReport(report._id)}
                    disabled={!report._id}
                    variant="outlined"
                    sx={{ borderRadius: 4 }}
                  >
                    View
                  </Button>
                  <Button 
                    size="small" 
                    color="primary"
                    startIcon={<VisibilityIcon />}
                    onClick={() => openJobDescriptionPreview(report.jobDescription)}
                    variant="outlined"
                    sx={{ borderRadius: 4 }}
                  >
                    Preview JD
                  </Button>
                  <Button 
                    size="small" 
                    color="error"
                    onClick={() => handleDeleteReport(report._id)}
                    disabled={!report._id}
                    variant="outlined"
                    sx={{ borderRadius: 4, ml: 'auto' }}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}
      
      {/* Job Description Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={closeJobDescriptionPreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Job Description</Typography>
          <IconButton onClick={closeJobDescriptionPreview} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Paper sx={{ p: 3, maxHeight: '60vh', overflow: 'auto' }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {previewJobDescription}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeJobDescriptionPreview}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Title Dialog */}
      <Dialog open={editDialogOpen} onClose={closeEditTitleDialog}>
        <DialogTitle>Edit Report Title</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="report-title"
            label="Report Title"
            type="text"
            fullWidth
            variant="outlined"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditTitleDialog}>Cancel</Button>
          <Button 
            onClick={handleUpdateTitle} 
            variant="contained"
            disabled={!editTitle.trim()}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default SavedReports;