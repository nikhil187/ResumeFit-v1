import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField,
  Grid,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Tab,
  Tabs,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import { CloudUpload, Description, UploadFile, InsertDriveFileOutlined, Visibility } from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
// Import worker config first (important for initialization order)
import '../../pdfWorkerConfig';
// Remove the direct pdfToText import as we now use our custom implementation
import PizZip from "pizzip";
import { DOMParser } from "@xmldom/xmldom";
import { getUserResumes, fetchResumeContent, uploadResume } from '../../services/resumeService';
import { renderAsync } from 'docx-preview';

function ResumeForm({ onSubmit }) {
  const [resumeText, setResumeText] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [savedResumes, setSavedResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  
  const { showNotification } = useNotification();
  const { currentUser } = useAuth();
  
  // Load user's saved resumes when component mounts
  useEffect(() => {
    const loadSavedResumes = async () => {
      if (!currentUser) return;
      
      try {
        setLoadingResumes(true);
        const resumes = await getUserResumes(currentUser.uid);
        setSavedResumes(resumes);
      } catch (error) {
        console.error('Error loading saved resumes:', error);
        showNotification('Failed to load your saved resumes', 'error');
      } finally {
        setLoadingResumes(false);
      }
    };
    
    loadSavedResumes();
  }, [currentUser, showNotification]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Helper function to parse DOCX files
  function str2xml(str) {
    if (str.charCodeAt(0) === 65279) {
      // BOM sequence
      str = str.substr(1);
    }
    return new DOMParser().parseFromString(str, "text/xml");
  }

  // Get paragraphs from DOCX as javascript array
  function getParagraphsFromDocx(content) {
    try {
      const zip = new PizZip(content);
      const xml = str2xml(zip.files["word/document.xml"].asText());
      const paragraphsXml = xml.getElementsByTagName("w:p");
      const paragraphs = [];

      for (let i = 0, len = paragraphsXml.length; i < len; i++) {
        let fullText = "";
        const textsXml = paragraphsXml[i].getElementsByTagName("w:t");
        for (let j = 0, len2 = textsXml.length; j < len2; j++) {
          const textXml = textsXml[j];
          if (textXml.childNodes && textXml.childNodes[0]) {
            fullText += textXml.childNodes[0].nodeValue;
          }
        }
        if (fullText) {
          paragraphs.push(fullText);
        }
      }
      return paragraphs.join('\n');
    } catch (error) {
      console.error("Error parsing DOCX:", error);
      throw new Error("Failed to parse DOCX file");
    }
  }
  
  const extractTextFromDocx = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const text = getParagraphsFromDocx(content);
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };
  
  // Add this new function to extract text without dynamic imports
  const simpleExtractTextFromPDF = (file) => {
    return new Promise((resolve, reject) => {
      // Create a FileReader to read the file
      const fileReader = new FileReader();
      
      fileReader.onload = function() {
        try {
          // Use the already configured PDF.js from pdfWorkerConfig
          const pdfjsLib = require('../../pdfWorkerConfig').default;
          
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
  
  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsUploading(true);
    
    try {
      // For logged in users, upload the file to firebase
      if (currentUser) {
        try {
          // Upload the file to firebase and get the file info back
          const uploadedFile = await uploadResume(currentUser.uid, selectedFile);
          
          // Set the selected resume
          setSelectedResume(uploadedFile);
          
          // Fetch the content to display in the preview
          const resumeData = await fetchResumeContent(uploadedFile.url, uploadedFile.type);
          setResumeText(resumeData.text);
          
          // Refresh the resume list
          const resumes = await getUserResumes(currentUser.uid);
          setSavedResumes(resumes);
          
          showNotification('Resume uploaded and processed successfully', 'success');
        } catch (error) {
          console.error('Error uploading to Firebase:', error);
          showNotification(error.message, 'error');
          
          // Continue to process locally even if firebase upload fails
          processFileLocally(selectedFile);
        }
      } else {
        // If not logged in, just process the file locally
        await processFileLocally(selectedFile);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      showNotification('Error processing file: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Process file locally - update to use our consistent PDF processing
  const processFileLocally = async (selectedFile) => {
    try {
      let extractedText = '';
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
      
      // Extract text based on file type
      if (fileExtension === 'pdf') {
        console.log("Processing PDF file locally...");
        try {
          // Use our simpleExtractTextFromPDF method
          extractedText = await simpleExtractTextFromPDF(selectedFile);
          
          console.log("PDF text extracted, length:", extractedText?.length || 0);
          
          // Check if we got meaningful text
          if (!extractedText || extractedText.trim() === '') {
            console.log("PDF extraction failed, using filename as placeholder");
            extractedText = `[PDF Content from ${selectedFile.name}]\n\nPlease manually enter the content of your PDF resume here.`;
          }
        } catch (err) {
          console.error("PDF extraction error:", err);
          showNotification('Error extracting text from PDF: ' + err.message, 'error');
          extractedText = `[PDF Content from ${selectedFile.name}]\n\nPlease manually enter the content of your PDF resume here.`;
        }
      } else if (fileExtension === 'docx') {
        extractedText = await extractTextFromDocx(selectedFile);
      } else if (fileExtension === 'txt') {
        extractedText = await readFileAsText(selectedFile);
      } else {
        throw new Error('Unsupported file type');
      }
      
      setResumeText(extractedText);
      showNotification('Resume text extracted successfully', 'success');
    } catch (error) {
      console.error('Error extracting text locally:', error);
      throw error;
    }
  };
  
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };
  
  const handleSelectResume = async (resume) => {
    try {
      setIsUploading(true);
      
      if (!resume || !resume.url || !resume.type) {
        throw new Error('Invalid resume data');
      }
      
      console.log(`Selecting resume: ${resume.name}, type: ${resume.type}, url: ${resume.url}`);
      setSelectedResume(resume);
      
      const resumeData = await fetchResumeContent(resume.url, resume.type);
      
      if (!resumeData || !resumeData.text) {
        throw new Error('Failed to extract text from the selected resume');
      }
      
      setResumeText(resumeData.text);
      showNotification('Resume loaded successfully', 'success');
    } catch (error) {
      console.error('Error loading resume:', error);
      showNotification('Error loading resume: ' + error.message, 'error');
      // Reset selected resume on error
      setSelectedResume(null);
    } finally {
      setIsUploading(false);
    }
  };
  
  // Add docx viewer ref
  const docxViewerRef = useRef(null);

  // Add useEffect for docx preview
  useEffect(() => {
    const loadDocxPreview = async () => {
      if (previewDialogOpen && selectedResume?.type === 'docx' && docxViewerRef.current) {
        try {
          const response = await fetch(selectedResume.url);
          const blob = await response.blob();
          await renderAsync(blob, docxViewerRef.current);
        } catch (error) {
          console.error('Error rendering DOCX:', error);
          showNotification('Error previewing DOCX file', 'error');
        }
      }
    };

    loadDocxPreview();
  }, [previewDialogOpen, selectedResume]);

  const handlePreviewResume = async (resume) => {
    try {
      setIsUploading(true);
      setSelectedResume(resume);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error('Error previewing resume:', error);
      showNotification('Error previewing resume: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Add preview dialog render function
  const renderPreviewDialog = () => {
    if (!selectedResume) return null;

    return (
      <Dialog 
        open={previewDialogOpen} 
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Resume Preview</DialogTitle>
        <DialogContent>
          {selectedResume.type === 'pdf' ? (
            <Box sx={{ width: '100%', height: '80vh' }}>
              <iframe
                src={`${selectedResume.url}#toolbar=0&navpanes=0&scrollbar=0`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title="Resume Preview"
              />
            </Box>
          ) : selectedResume.type === 'docx' ? (
            <Box ref={docxViewerRef} sx={{ width: '100%', minHeight: '80vh' }} />
          ) : (
            <Typography>Preview not available for this file type</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          <Button 
            component="a" 
            href={selectedResume.url} 
            target="_blank" 
            rel="noopener noreferrer"
            color="primary"
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    );
  };
  
  const handleSubmit = () => {
    if (!resumeText.trim()) {
      showNotification('Please enter or upload your resume', 'error');
      return;
    }
    
    try {
      // Safety check to ensure the file name is a string
      const fileName = (() => {
        if (file && typeof file.name === 'string') {
          return file.name;
        } else if (selectedResume && typeof selectedResume.displayName === 'string') {
          return selectedResume.displayName;
        } else {
          return 'Manual Entry';
        }
      })();
      
      const resumeData = {
        text: resumeText,
        fileName,
        file, // Original file for upload
        url: selectedResume?.url || null, // URL for fetching
        source: file ? 'upload' : selectedResume ? 'saved' : 'manual'
      };
      
      console.log("Submitting resume data:", {
        fileName: resumeData.fileName,
        textLength: resumeData.text.length,
        source: resumeData.source
      });
      
      onSubmit(resumeData);
    } catch (error) {
      console.error('Error preparing resume data:', error);
      showNotification('Error preparing resume data: ' + error.message, 'error');
    }
  };
  
  const getIconByFileType = (type) => {
    switch(type) {
      case 'pdf':
        return <Description sx={{ color: 'error.main' }} />;
      case 'docx':
      case 'doc':
        return <Description sx={{ color: 'primary.main' }} />;
      default:
        return <InsertDriveFileOutlined />;
    }
  };
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        Upload or Enter Your Resume
      </Typography>
      
      <Tabs value={tabValue} onChange={handleTabChange} aria-label="resume tabs" sx={{ mb: 3 }}>
        <Tab label="Upload New Resume" />
        {currentUser && <Tab label="My Saved Resumes" />}
        <Tab label="Enter Manually" />
      </Tabs>
      
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0} 
              sx={{ 
                border: '2px dashed #ccc', 
                padding: 3, 
                textAlign: 'center',
                borderRadius: 2,
                bgcolor: '#f9f9f9',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <input
                accept=".pdf,.doc,.docx,.txt"
                type="file"
                id="resume-upload"
                hidden
                onChange={handleFileChange}
              />
              <label htmlFor="resume-upload">
                <Button
                  component="span"
                  variant="contained"
                  startIcon={<CloudUpload />}
                  disabled={isUploading}
                  sx={{ mb: 2 }}
                >
                  {isUploading ? 'Processing...' : 'Upload Resume'}
                </Button>
              </label>
              <Typography variant="body2" color="text.secondary">
                Supported formats: PDF, DOCX, TXT
              </Typography>
              {isUploading && (
                <CircularProgress size={24} sx={{ mt: 2 }} />
              )}
              {file && (
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Selected file: {file.name}
                </Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0} 
              sx={{ 
                padding: 3, 
                height: '100%',
                borderRadius: 2,
                border: '1px solid #e0e0e0',
              }}
            >
              <Typography variant="subtitle1" gutterBottom>
                Resume Text Preview:
              </Typography>
              <Box 
                sx={{ 
                  maxHeight: 250, 
                  overflow: 'auto',
                  bgcolor: '#f5f5f5',
                  p: 2,
                  borderRadius: 1,
                  minHeight: 200
                }}
              >
                {resumeText ? (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {resumeText}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Resume text will appear here after you upload a file
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {tabValue === 1 && currentUser && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Select a previously uploaded resume:
          </Typography>
          
          {loadingResumes ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : savedResumes.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f9f9f9', mb: 3 }}>
              <Typography variant="body1">
                You haven't uploaded any resumes yet.
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => setTabValue(0)} 
                sx={{ mt: 2 }}
                startIcon={<UploadFile />}
              >
                Upload a Resume
              </Button>
            </Paper>
          ) : (
            <Box>
              <List sx={{ bgcolor: '#f5f5f5', borderRadius: 2, mb: 3 }}>
                {savedResumes.map((resume, index) => (
                  <React.Fragment key={resume.name}>
                    <ListItem 
                      alignItems="flex-start"
                      secondaryAction={
                        <Box>
                          <Button 
                            size="small"
                            onClick={() => handlePreviewResume(resume)}
                            startIcon={<Visibility />}
                          >
                            Preview
                          </Button>
                          <Button 
                            size="small"
                            variant={selectedResume?.name === resume.name ? "contained" : "outlined"}
                            onClick={() => handleSelectResume(resume)}
                            color="primary"
                          >
                            {selectedResume?.name === resume.name ? "Selected" : "Select"}
                          </Button>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>
                          {getIconByFileType(resume.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={resume.displayName}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {resume.type.toUpperCase()}
                            </Typography>
                            {` - Uploaded on ${resume.date}`}
                          </>
                        }
                      />
                    </ListItem>
                    {index < savedResumes.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
              
              {selectedResume && (
                <Paper 
                  elevation={0} 
                  sx={{ 
                    padding: 3, 
                    borderRadius: 2,
                    border: '1px solid #e0e0e0',
                    mb: 3
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    Selected Resume Text:
                  </Typography>
                  <Box 
                    sx={{ 
                      maxHeight: 250, 
                      overflow: 'auto',
                      bgcolor: '#f5f5f5',
                      p: 2,
                      borderRadius: 1
                    }}
                  >
                    {resumeText ? (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {resumeText}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Loading resume text...
                      </Typography>
                    )}
                  </Box>
                </Paper>
              )}
            </Box>
          )}
        </Box>
      )}
      
      {tabValue === (currentUser ? 2 : 1) && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Enter your resume text manually:
          </Typography>
          <TextField
            multiline
            rows={10}
            fullWidth
            placeholder="Paste or type your resume text here..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            sx={{ mb: 3 }}
          />
        </Box>
      )}
      
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSubmit}
          disabled={isUploading}
          size="large"
        >
          {isUploading ? 'Processing...' : 'Continue'}
        </Button>
      </Box>
      
      {/* Add the preview dialog */}
      {renderPreviewDialog()}
    </Box>
  );
}

export default ResumeForm;