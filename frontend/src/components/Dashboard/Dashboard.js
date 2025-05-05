import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Avatar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import ResumeForm from './ResumeForm';
// Import worker config first (important for initialization order)
import '../../pdfWorkerConfig';
// Import our configured PDF.js
import pdfjsLib from '../../pdfWorkerConfig';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import WorkIcon from '@mui/icons-material/Work';
import AnalyticsIcon from '@mui/icons-material/Analytics';

function Dashboard() {
  const [activeStep, setActiveStep] = useState(0);
  const [resumeData, setResumeData] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const steps = [
    { label: 'Upload Resume', icon: <UploadFileIcon /> },
    { label: 'Enter Job Description', icon: <WorkIcon /> },
    { label: 'Analysis', icon: <AnalyticsIcon /> }
  ];

  // Add custom PDF extraction function
  const extractTextFromPDF = (file) => {
    return new Promise((resolve, reject) => {
      // Create a FileReader to read the file
      const fileReader = new FileReader();
      
      fileReader.onload = function() {
        try {
          // Load document as array buffer
          const typedArray = new Uint8Array(this.result);
          
          // Load the PDF document
          const loadingTask = pdfjsLib.getDocument(typedArray);
          
          loadingTask.promise.then(function(pdf) {
            console.log('PDF loaded successfully');
            
            // Array to store all page text promises
            const pageTextPromises = [];
            
            // Process each page
            for (let i = 1; i <= pdf.numPages; i++) {
              pageTextPromises.push(
                pdf.getPage(i).then(function(page) {
                  return page.getTextContent().then(function(textContent) {
                    return textContent.items.map(item => item.str).join(' ');
                  });
                })
              );
            }
            
            // When all pages are processed
            Promise.all(pageTextPromises).then(function(pageTexts) {
              const text = pageTexts.join('\n\n');
              resolve(text);
            });
          }).catch(function(error) {
            console.error('Error loading PDF:', error);
            reject(error);
          });
        } catch (error) {
          console.error('PDF processing error:', error);
          reject(error);
        }
      };
      
      fileReader.onerror = function() {
        reject(new Error('Error reading file'));
      };
      
      // Read the file as an ArrayBuffer
      fileReader.readAsArrayBuffer(file);
    });
  };

  const handleResumeSubmit = (data) => {
    console.log("Resume data received:", data);
    
    // If data already has text, just use it
    if (data.text && data.text.trim() !== '') {
      console.log("Using provided text:", data.text.substring(0, 50) + "...");
      setResumeData(data);
      setActiveStep(1);
      return;
    }
    
    // If file is PDF but no text, try to extract
    if (data.file && (data.file.type === 'application/pdf' || 
        data.file.name.toLowerCase().endsWith('.pdf'))) {
      
      showNotification('Processing PDF file...', 'info');
      
      // Process the PDF file using our custom extraction function
      extractTextFromPDF(data.file)
        .then(text => {
          if (text && text.trim() !== '') {
            console.log("Successfully extracted PDF text:", text.substring(0, 50) + "...");
            const updatedData = { ...data, text: text };
            setResumeData(updatedData);
            showNotification('Resume text extracted successfully', 'success');
          } else {
            console.warn("PDF extraction returned empty text");
            setResumeData(data);
            showNotification('Could not extract text from PDF. Please enter it manually.', 'warning');
          }
          setActiveStep(1);
        })
        .catch(error => {
          console.error('PDF extraction error:', error);
          setResumeData(data);
          showNotification('Error extracting text from PDF. Please enter it manually.', 'warning');
          setActiveStep(1);
        });
    } else {
      // Non-PDF file or no file
      console.log("No PDF to process or text already provided");
      setResumeData(data);
      setActiveStep(1);
    }
  };

  const handleJobDescriptionSubmit = () => {
    if (!jobDescription.trim()) {
      showNotification('Please enter a job description', 'error');
      return;
    }
    
    console.log("Navigating to quiz with data:", { resumeData, jobDescription });
    
    // Make sure resumeData has a text property
    const formattedResumeData = resumeData && !resumeData.text 
      ? { ...resumeData, text: resumeData.fileName || 'Resume' }
      : resumeData;
    
    // Navigate to Quiz page with resume and job description data
    navigate('/quiz', { 
      state: { 
        resumeData: formattedResumeData, 
        jobDescription 
      } 
    });
  };

  // Debug effect to check resume data when step changes
  useEffect(() => {
    if (activeStep === 1) {
      console.log("Step 2 - Resume Data:", resumeData);
      if (resumeData && resumeData.text) {
        console.log("Resume text length:", resumeData.text.length);
      } else {
        console.warn("No resume text available to display");
      }
    }
  }, [activeStep, resumeData]);

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ mb: 5, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Resume Job Matcher
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '800px', mx: 'auto' }}>
          Match your resume against job descriptions to improve your chances of landing that dream job
        </Typography>
      </Box>
      
      <Card elevation={3} sx={{ borderRadius: 2, overflow: 'hidden', mb: 6 }}>
        <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
            {steps.map((step) => (
              <Step key={step.label}>
                <StepLabel StepIconComponent={({ active, completed }) => (
                  <Avatar 
                    sx={{ 
                      bgcolor: active || completed ? 'secondary.main' : 'rgba(255, 255, 255, 0.3)',
                      color: active || completed ? 'white' : 'rgba(255, 255, 255, 0.7)',
                      width: 40, 
                      height: 40 
                    }}
                  >
                    {step.icon}
                  </Avatar>
                )}>
                  <Typography sx={{ color: 'white', fontWeight: activeStep === steps.indexOf(step) ? 600 : 400 }}>
                    {step.label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        
        <CardContent sx={{ p: 4 }}>
          {activeStep === 0 && (
            <ResumeForm onSubmit={handleResumeSubmit} />
          )}
          
          {activeStep === 1 && (
            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Enter Job Description
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Paste the job description you want to match your resume against.
              </Typography>
              
              <Divider sx={{ my: 3 }} />
              
              {/* Show extracted resume text if available */}
              {resumeData && (
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    bgcolor: '#f8f9fa',
                    mb: 4,
                    maxHeight: '200px',
                    overflow: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Your Resume:
                  </Typography>
                  {resumeData.text ? (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {resumeData.text}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="error">
                      No text was extracted from the resume. Please go back and try again.
                    </Typography>
                  )}
                </Paper>
              )}
              
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Job Description:
              </Typography>
              
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '250px',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  fontFamily: 'inherit',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  marginBottom: '24px',
                  resize: 'vertical'
                }}
                placeholder="Paste job description here..."
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button 
                  variant="outlined" 
                  size="large"
                  onClick={() => setActiveStep(0)}
                >
                  Back
                </Button>
                <Button 
                  variant="contained" 
                  size="large"
                  onClick={handleJobDescriptionSubmit}
                  disabled={!jobDescription.trim()}
                >
                  Continue to Analysis
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
      
      <Grid container spacing={4} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>1</Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Upload Your Resume</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Upload your resume in PDF, DOCX, or TXT format. Our system will extract the text and prepare it for analysis.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>2</Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Enter Job Description</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Paste the job description you're interested in. Be sure to include all requirements and qualifications mentioned.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>3</Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Get Detailed Analysis</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Receive a comprehensive analysis of how well your resume matches the job requirements, with specific recommendations for improvement.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;