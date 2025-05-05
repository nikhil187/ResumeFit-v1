import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton, 
  Divider,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { Delete, Visibility, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import Loading from '../UI/Loading';
import { getUserReports, deleteReport } from '../../services/mongoDb';

function ReportsList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const loadReports = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      console.log('Loading reports for user:', currentUser.uid);
      const reportsData = await getUserReports(currentUser.uid);
      console.log('Reports loaded:', reportsData.length);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
      showNotification('Error loading reports: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, showNotification]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleViewReport = (reportId) => {
    navigate(`/reports/${reportId}`);
  };

  const handleDeleteClick = (report) => {
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setReportToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    
    try {
      await deleteReport(currentUser.uid, reportToDelete.id);
      setReports(reports.filter(report => report.id !== reportToDelete.id));
      showNotification('Report deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting report:', error);
      showNotification('Error deleting report: ' + error.message, 'error');
    } finally {
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={handleBackToDashboard}
        >
          Back to Dashboard
        </Button>
      </Box>
      
      <Typography variant="h4" gutterBottom>
        Your Reports
      </Typography>
      
      <Paper elevation={3} sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ p: 4 }}>
            <Loading message="Loading reports..." />
          </Box>
        ) : reports.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              You don't have any saved reports yet.
            </Typography>
            <Button 
              variant="contained" 
              onClick={handleBackToDashboard}
              sx={{ mt: 2 }}
            >
              Create a Report
            </Button>
          </Box>
        ) : (
          <List>
            {reports.map((report, index) => (
              <React.Fragment key={report.id}>
                {index > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    <Box>
                      <IconButton 
                        edge="end" 
                        aria-label="view"
                        onClick={() => handleViewReport(report.id)}
                        sx={{ mr: 1 }}
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={() => handleDeleteClick(report)}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Typography variant="h6">
                        {report.jobTitle || 'Job Analysis'}
                      </Typography>
                    }
                    secondary={
                      <React.Fragment>
                        <Typography component="span" variant="body2" color="text.primary">
                          Match Score: {report.score}% | Quiz Score: {report.quizScore}/5
                        </Typography>
                        <Typography component="span" variant="body2" display="block">
                          Created: {new Date(report.createdAt).toLocaleDateString()}
                        </Typography>
                      </React.Fragment>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
      >
        <DialogTitle>Delete Report</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this report? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ReportsList;