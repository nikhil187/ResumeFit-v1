import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  CircularProgress, 
  Grid, 
  List, 
  ListItem, 
  ListItemText, 
  Divider,
  Card,
  CardContent,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Skeleton,
  LinearProgress
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { extractSkillsForPracticeQuiz, generateSingleMCQ, generateBatchMCQs } from '../../services/api';

function PracticeQuiz() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [extractedSkills, setExtractedSkills] = useState([]);
  const [skillsByCategory, setSkillsByCategory] = useState({});
  const [currentSkill, setCurrentSkill] = useState(null);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [quizHistory, setQuizHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  
  // Batch questions state
  const [questionBatch, setQuestionBatch] = useState([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchSize] = useState(10);
  const [totalQuestionsGenerated, setTotalQuestionsGenerated] = useState(0);
  const [showBatchProgress, setShowBatchProgress] = useState(false);

  // Load job description and extract skills
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Extract job description from location state
        if (location.state && location.state.jobDescription) {
          setJobDescription(location.state.jobDescription);
          
          // Extract skills from job description
          const skillsData = await extractSkillsForPracticeQuiz(location.state.jobDescription);
          
          console.log("Extracted skills data:", skillsData);
          
          if (skillsData && skillsData.allSkills && skillsData.allSkills.length > 0) {
            setExtractedSkills(skillsData.allSkills);
            setSkillsByCategory(skillsData.skillsByCategory);
            
            // Set default category and skill
            const firstCategory = Object.keys(skillsData.skillsByCategory)[0];
            setCurrentCategory(firstCategory);
            setExpandedCategory(firstCategory);
            
            const firstSkill = skillsData.skillsByCategory[firstCategory][0];
            setCurrentSkill(firstSkill);
            
            // Generate first batch of questions
            await generateQuestionBatch(location.state.jobDescription, skillsData.allSkills.slice(0, 5));
          } else {
            setLoadingError("No skills could be extracted from the job description");
          }
        } else {
          setError("No job description provided");
        }
      } catch (err) {
        console.error("Error in initial data loading:", err);
        setLoadingError(err.message || "Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [location]);
  
  // Generate a question for the selected skill (single question approach - keeping for skill selection)
  const generateQuestionForSkill = useCallback(async (skillName) => {
    try {
      setIsGenerating(true);
      setLoadingError(null);
      
      const questionData = await generateSingleMCQ(jobDescription, skillName);
      
      console.log("Generated question:", questionData);
      
      setCurrentQuestion(questionData);
      setSelectedAnswer(null);
      setAnswerSubmitted(false);
    } catch (err) {
      console.error("Error generating question:", err);
      setLoadingError("Failed to generate question. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [jobDescription]);

  // Handle skill selection - update to trigger batch question generation for that skill
  const handleSkillSelect = (skill) => {
    setCurrentSkill(skill);
    // Generate a batch of questions for this specific skill
    generateQuestionBatch(jobDescription, [skill]);
  };

  // Handle category expansion
  const handleCategoryChange = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  // Handle answer selection
  const handleAnswerSelect = (event) => {
    setSelectedAnswer(parseInt(event.target.value));
  };

  // Submit answer
  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    setAnswerSubmitted(true);
    
    // Add question and answer to history
    setQuizHistory(prev => [...prev, {
      ...currentQuestion,
      userAnswer: selectedAnswer,
      isCorrect: selectedAnswer === currentQuestion.correctAnswer,
      skill: currentQuestion.skill || currentSkill?.skill,
      timestamp: new Date()
    }]);
  };

  // Generate next question
  const handleNextQuestion = () => {
    loadNextBatchQuestion();
  };

  // Generate new batch of questions for the current skill
  const handleRefreshQuestions = () => {
    if (currentSkill) {
      generateQuestionBatch(jobDescription, [currentSkill]);
    } else {
      const shuffledSkills = [...extractedSkills].sort(() => Math.random() - 0.5);
      generateQuestionBatch(jobDescription, shuffledSkills.slice(0, 5));
    }
  };

  // End quiz and generate PDF
  const handleEndQuiz = () => {
    if (quizHistory.length === 0) {
      showNotification('Please answer at least one question before ending the quiz.', 'warning');
      return;
    }
    
    // Ask for custom PDF name
    const customName = prompt("Enter a custom name for your PDF (optional):", "practice-quiz-results");
    const pdfName = customName ? customName.trim() : `practice-quiz-results-${new Date().getTime()}`;
    
    // Generate PDF with quiz results
    generateQuizPDF(pdfName);
    
    // Show notification
    showNotification('Quiz completed! PDF has been generated.', 'success');
    
    // Navigate back to report
    navigate(-1);
  };

  // Generate PDF with quiz results
  const generateQuizPDF = (pdfName = `practice-quiz-results-${new Date().getTime()}`) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add custom font styling
    const titleStyle = { fontSize: 18, fontStyle: 'bold' };
    const sectionTitleStyle = { fontSize: 14, fontStyle: 'bold' };
    const normalTextStyle = { fontSize: 10 };
    const labelStyle = { fontSize: 10, fontStyle: 'bold' };
    
    // Title page
    const title = `Practice Quiz Results - ${new Date().toLocaleDateString()}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(titleStyle.fontSize);
    doc.text(title, 105, 20, { align: 'center' });
    
    // Add date and time
    doc.setFont("helvetica", "normal");
    doc.setFontSize(normalTextStyle.fontSize);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 30, { align: 'center' });
    
    // Add job description with proper formatting and pagination
    doc.setFont("helvetica", "bold");
    doc.setFontSize(sectionTitleStyle.fontSize);
    doc.text('Job Description', 14, 45);
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(14, 47, 196, 47);
    
    // Handle long job descriptions by breaking them into chunks with paging
    doc.setFont("helvetica", "normal");
    doc.setFontSize(normalTextStyle.fontSize);
    
    // Set maximum height per page and starting positions
    const maxHeightPerPage = 220; // mm, leave room for headers and margins
    let currentY = 55;
    let currentPage = 1;
    
    // Split job description into lines
    const splitJobDesc = doc.splitTextToSize(jobDescription, 180);
    
    // Calculate how many lines can fit on the first page
    const lineHeight = 5; // approximate line height in mm
    const linesPerPage = Math.floor(maxHeightPerPage / lineHeight);
    
    // If the job description is long, split it across pages
    if (splitJobDesc.length > linesPerPage) {
      // For first page
      const firstPageLines = splitJobDesc.slice(0, linesPerPage);
      doc.text(firstPageLines, 14, currentY);
      
      // For subsequent pages
      let remainingLines = splitJobDesc.slice(linesPerPage);
      
      while (remainingLines.length > 0) {
        doc.addPage();
        currentPage++;
        
        // Add continuation header
        doc.setFont("helvetica", "bold");
        doc.text('Job Description (continued)', 14, 20);
        doc.setLineWidth(0.2);
        doc.line(14, 22, 196, 22);
        
        // Add page number
        doc.setFontSize(8);
        doc.text(`Page ${currentPage}`, 196, 10, { align: 'right' });
        
        // Reset text style
        doc.setFont("helvetica", "normal");
        doc.setFontSize(normalTextStyle.fontSize);
        
        // Add next batch of lines
        const pageLines = remainingLines.slice(0, linesPerPage);
        doc.text(pageLines, 14, 30);
        remainingLines = remainingLines.slice(linesPerPage);
      }
      
      // Start a new page for the skills section
      doc.addPage();
      currentY = 20;
    } else {
      // Job description fits on first page
      doc.text(splitJobDesc, 14, currentY);
      currentY += (splitJobDesc.length * lineHeight) + 15;
      
      // Check if we need a new page for skills
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
    }
    
    // Continue with skills section
    // ... rest of the PDF generation code ...

    // Add skills section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(sectionTitleStyle.fontSize);
    doc.text('Skills Tested', 14, currentY);
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(14, currentY + 2, 196, currentY + 2);
    
    currentY += 10;
    
    // Create skills list with bullet points
    const uniqueSkills = [...new Set(quizHistory.map(item => item.skill))];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(normalTextStyle.fontSize);
    
    uniqueSkills.forEach((skill, index) => {
      doc.text(`• ${skill}`, 20, currentY);
      currentY += 6;
    });
    
    // Add new page if needed
    if (currentY > 280) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY += 15;
    }
    
    // Add quiz results summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(sectionTitleStyle.fontSize);
    doc.text('Quiz Results Summary', 14, currentY);
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(14, currentY + 2, 196, currentY + 2);
    
    // Calculate overall stats
    const totalQuestions = quizHistory.length;
    const correctAnswers = quizHistory.filter(item => item.isCorrect).length;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    currentY += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(normalTextStyle.fontSize);
    doc.text(`Total Questions: ${totalQuestions}`, 20, currentY);
    currentY += 6;
    doc.text(`Correct Answers: ${correctAnswers}`, 20, currentY);
    currentY += 6;
    doc.text(`Score: ${score}%`, 20, currentY);
    currentY += 6;
    
    // Create a basic score visualization
    const scoreBarWidth = 150;
    const scoreFilledWidth = (score / 100) * scoreBarWidth;
    
    currentY += 8;
    
    // Draw score bar outline
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(20, currentY, scoreBarWidth, 8);
    
    // Fill score bar based on percentage
    if (score > 0) {
      doc.setFillColor(score >= 70 ? 0 : score >= 40 ? 255 : 255, 
                       score >= 70 ? 128 : score >= 40 ? 165 : 0, 
                       score >= 70 ? 0 : 0);
      doc.rect(20, currentY, scoreFilledWidth, 8, 'F');
    }
    
    currentY += 20;
    
    // Questions and Answers section - create a new page
    doc.addPage();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(sectionTitleStyle.fontSize);
    doc.text('Detailed Questions and Answers', 105, 20, { align: 'center' });
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(14, 25, 196, 25);
    
    // List all questions with improved MCQ formatting
    let yPos = 35;
    
    quizHistory.forEach((item, index) => {
      // Check if we need a new page
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      
      // Question number and skill
      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPos - 5, 182, 10, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Question ${index + 1}: ${item.skill}`, 16, yPos);
      
      // Timestamp
      const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A';
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text(`Timestamp: ${timestamp}`, 180, yPos, { align: 'right' });
      
      yPos += 10;
      
      // Question text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const questionLines = doc.splitTextToSize(item.question, 180);
      doc.text(questionLines, 14, yPos);
      yPos += (questionLines.length * 5) + 8;
      
      // Options with proper multiple-choice formatting
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      
      // Draw option boxes
      item.options.forEach((option, optIndex) => {
        const optionLines = doc.splitTextToSize(option, 166);
        const optionHeight = (optionLines.length * 5) + 2;
        
        // Option letter background
        doc.setFillColor(210, 210, 210);
        doc.rect(14, yPos - 4, 15, optionHeight, 'F');
        
        // Highlight answer backgrounds
        if (optIndex === item.correctAnswer && optIndex === item.userAnswer) {
          // Correct and selected
          doc.setFillColor(200, 255, 200);
          doc.rect(30, yPos - 4, 166, optionHeight, 'F');
        } else if (optIndex === item.correctAnswer) {
          // Correct but not selected
          doc.setFillColor(220, 255, 220);
          doc.rect(30, yPos - 4, 166, optionHeight, 'F');
        } else if (optIndex === item.userAnswer) {
          // Incorrect and selected
          doc.setFillColor(255, 220, 220);
          doc.rect(30, yPos - 4, 166, optionHeight, 'F');
        }
        
        // Option letter
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(String.fromCharCode(65 + optIndex), 22, yPos, { align: 'center' }); // A, B, C, D...
        
        // Option text
        doc.setFont("helvetica", "normal");
        doc.text(optionLines, 34, yPos);
        
        yPos += optionHeight + 3;
      });
      
      yPos += 5;
      
      // Answer indicators
      doc.setFont("helvetica", "bold");
      if (item.isCorrect) {
        doc.setTextColor(0, 128, 0);
        doc.text(`✓ Your answer was correct: ${String.fromCharCode(65 + item.correctAnswer)}`, 14, yPos);
      } else {
        doc.setTextColor(255, 0, 0);
        doc.text(`✗ Your answer ${String.fromCharCode(65 + item.userAnswer)} was incorrect. Correct answer: ${String.fromCharCode(65 + item.correctAnswer)}`, 14, yPos);
      }
      
      yPos += 10;
      
      // Explanation with styled box
      doc.setFillColor(245, 245, 250);
      
      const explanationLines = doc.splitTextToSize(item.explanation, 170);
      const explanationHeight = (explanationLines.length * 5) + 8;
      
      doc.rect(14, yPos - 4, 182, explanationHeight, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 100);
      doc.text('Explanation:', 16, yPos);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(explanationLines, 16, yPos + 6);
      
      yPos += explanationHeight + 15;
    });

    // Save the PDF with custom name
    doc.save(`${pdfName}.pdf`);
  };

  // Get color for difficulty badge
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'error';
      default:
        return 'primary';
    }
  };

  // Get color for type badge
  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'conceptual':
        return 'primary';
      case 'logical':
        return 'secondary';
      case 'applied':
      case 'application':
        return 'success';
      case 'problem-solving':
      case 'debugging':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Generate a batch of questions
  const generateQuestionBatch = useCallback(async (jobDesc, skills) => {
    try {
      setBatchLoading(true);
      setShowBatchProgress(true);
      setLoadingError(null);
      
      // Get a subset of skills if we have many
      const selectedSkills = skills.slice(0, Math.min(skills.length, 5));
      
      const questions = await generateBatchMCQs(jobDesc, selectedSkills, batchSize);
      
      console.log("Generated question batch:", questions);
      
      if (questions && questions.length > 0) {
        setQuestionBatch(questions);
        setCurrentBatchIndex(0);
        setCurrentQuestion(questions[0]);
        setTotalQuestionsGenerated(prevTotal => prevTotal + questions.length);
      } else {
        setLoadingError("Failed to generate questions. Please try again.");
      }
    } catch (err) {
      console.error("Error generating question batch:", err);
      setLoadingError("Failed to generate questions. Please try again.");
    } finally {
      setBatchLoading(false);
      setTimeout(() => setShowBatchProgress(false), 1500);
    }
  }, [batchSize]);
  
  // Load the next question from the batch
  const loadNextBatchQuestion = useCallback(() => {
    if (currentBatchIndex < questionBatch.length - 1) {
      // Still have questions in the current batch
      const nextIndex = currentBatchIndex + 1;
      setCurrentBatchIndex(nextIndex);
      setCurrentQuestion(questionBatch[nextIndex]);
      setSelectedAnswer(null);
      setAnswerSubmitted(false);
    } else {
      // Need to generate a new batch
      if (extractedSkills.length > 0) {
        // Shuffle skills to get variety in the next batch
        const shuffledSkills = [...extractedSkills].sort(() => Math.random() - 0.5);
        generateQuestionBatch(jobDescription, shuffledSkills.slice(0, 5));
      } else {
        setLoadingError("No skills available to generate questions");
      }
    }
  }, [currentBatchIndex, questionBatch, extractedSkills, jobDescription, generateQuestionBatch]);

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading practice quiz...
        </Typography>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Practice Quiz</Typography>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={() => navigate(-1)}
        >
          Back to Report
        </Button>
      </Box>
      
      {loadingError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {loadingError}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Skills sidebar */}
        <Grid item xs={12} md={3}>
          <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Skills by Category
            </Typography>
            
            {isGenerating && extractedSkills.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress size={30} />
              </Box>
            ) : (
              <Box sx={{ mt: 2 }}>
                {Object.keys(skillsByCategory).map((category) => (
                  <Accordion 
                    key={category}
                    expanded={expandedCategory === category}
                    onChange={() => handleCategoryChange(category)}
                    sx={{ 
                      mb: 1, 
                      '&:before': { display: 'none' },
                      boxShadow: 'none',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '4px !important',
                      overflow: 'hidden'
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ 
                        bgcolor: 'background.paper', 
                        borderBottom: expandedCategory === category ? '1px solid' : 'none',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography>{category}</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      <List dense disablePadding>
                        {skillsByCategory[category].map((skill, index) => (
                          <React.Fragment key={skill.skill}>
                            <ListItem 
                              component="div"
                              onClick={() => handleSkillSelect(skill)} 
                              selected={currentSkill?.skill === skill.skill}
                              sx={{ 
                                cursor: 'pointer',
                                '&.Mui-selected': { 
                                  bgcolor: 'primary.light',
                                  color: 'primary.contrastText'
                                }
                              }}
                            >
                              <ListItemText 
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box component="span">{skill.skill}</Box>
                                    <Chip 
                                      label={skill.importance} 
                                      size="small" 
                                      color={
                                        skill.importance === "critical" ? "error" : 
                                        skill.importance === "important" ? "warning" : 
                                        "success"
                                      }
                                      variant="outlined"
                                      sx={{ ml: 1, fontSize: '0.65rem' }}
                                    />
                                  </Box>
                                } 
                              />
                              {currentSkill?.skill === skill.skill && <ChevronRightIcon />}
                            </ListItem>
                            {index < skillsByCategory[category].length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Quiz Statistics
              </Typography>
              <Typography variant="body2">
                Questions answered: {quizHistory.length}
              </Typography>
              <Typography variant="body2">
                Correct answers: {quizHistory.filter(item => item.isCorrect).length}
              </Typography>
              {quizHistory.length > 0 && (
                <Typography variant="body2">
                  Accuracy: {Math.round((quizHistory.filter(item => item.isCorrect).length / quizHistory.length) * 100)}%
                </Typography>
              )}
              <Typography variant="body2">
                Total questions: {totalQuestionsGenerated}
              </Typography>
              <Typography variant="body2">
                Current batch: {currentBatchIndex + 1}/{questionBatch.length}
              </Typography>
              
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                sx={{ mt: 2, mb: 1 }}
                onClick={handleRefreshQuestions}
                disabled={batchLoading}
                startIcon={<AutorenewIcon />}
              >
                New Question Batch
              </Button>
              
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 1 }}
                onClick={handleEndQuiz}
                disabled={quizHistory.length === 0}
              >
                End Quiz & Generate PDF
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Main quiz area */}
        <Grid item xs={12} md={9}>
          <Paper elevation={1} sx={{ p: 3 }}>
            {showBatchProgress && (
              <Box sx={{ width: '100%', mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Generating batch of {batchSize} questions...
                </Typography>
                <LinearProgress color="primary" />
              </Box>
            )}
            
            {batchLoading ? (
              <Box sx={{ my: 4 }}>
                <Skeleton variant="text" sx={{ fontSize: '2rem', width: '50%', mb: 2 }} />
                <Skeleton variant="rounded" height={120} sx={{ mb: 3 }} />
                <Skeleton variant="rounded" height={60} sx={{ mb: 2 }} />
                <Skeleton variant="rounded" height={60} sx={{ mb: 2 }} />
                <Skeleton variant="rounded" height={60} sx={{ mb: 2 }} />
                <Skeleton variant="rounded" height={60} sx={{ mb: 2 }} />
              </Box>
            ) : currentQuestion ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5">
                    {currentQuestion.skill || currentSkill?.skill} Quiz
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label={`Question ${currentBatchIndex + 1}/${questionBatch.length}`}
                      color="primary"
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip 
                      label={currentQuestion.difficulty} 
                      color={getDifficultyColor(currentQuestion.difficulty)}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip 
                      label={currentQuestion.type} 
                      color={getTypeColor(currentQuestion.type)}
                      size="small"
                    />
                  </Box>
                </Box>
                
                <Card variant="outlined" sx={{ mb: 4, mt: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {currentQuestion.question}
                    </Typography>
                    
                    <FormControl component="fieldset" sx={{ width: '100%', mt: 2 }}>
                      <RadioGroup 
                        value={selectedAnswer !== null ? selectedAnswer.toString() : ''} 
                        onChange={handleAnswerSelect}
                      >
                        {currentQuestion.options.map((option, index) => (
                          <FormControlLabel 
                            key={index}
                            value={index.toString()}
                            control={<Radio />}
                            label={option}
                            disabled={answerSubmitted}
                            sx={{
                              py: 1,
                              ...(answerSubmitted && index === currentQuestion.correctAnswer ? {
                                color: 'success.main',
                                '& .MuiFormControlLabel-label': { fontWeight: 'bold' }
                              } : {}),
                              ...(answerSubmitted && selectedAnswer === index && index !== currentQuestion.correctAnswer ? {
                                color: 'error.main',
                                '& .MuiFormControlLabel-label': { fontWeight: 'bold' }
                              } : {})
                            }}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                    
                    {answerSubmitted && (
                      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          {selectedAnswer === currentQuestion.correctAnswer ? (
                            <>
                              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                              <Typography variant="subtitle1" color="success.main">
                                Correct!
                              </Typography>
                            </>
                          ) : (
                            <>
                              <CancelIcon color="error" sx={{ mr: 1 }} />
                              <Typography variant="subtitle1" color="error.main">
                                Incorrect
                              </Typography>
                            </>
                          )}
                        </Box>
                        <Typography variant="body1">
                          {currentQuestion.explanation}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                  {!answerSubmitted ? (
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={handleSubmitAnswer}
                      disabled={selectedAnswer === null}
                    >
                      Submit Answer
                    </Button>
                  ) : (
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={handleNextQuestion}
                    >
                      Next Question
                    </Button>
                  )}
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" gutterBottom>
                  Select a skill from the sidebar to start the quiz
                </Typography>
              </Box>
            )}
          </Paper>
          
          {quizHistory.length > 0 && (
            <Paper elevation={1} sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Question History
              </Typography>
              
              <List>
                {quizHistory.slice(-5).reverse().map((item, index) => (
                  <React.Fragment key={index}>
                    <ListItem alignItems="flex-start">
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip 
                              label={item.skill} 
                              size="small" 
                              color="primary" 
                              variant="outlined" 
                              sx={{ mr: 1 }} 
                            />
                            <Box component="span" sx={{ fontWeight: 'medium', fontSize: '1rem' }}>
                              {item.question}
                            </Box>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography 
                              component="span" 
                              variant="body2" 
                              sx={{ 
                                display: 'block',
                                color: item.isCorrect ? 'success.main' : 'error.main' 
                              }}
                            >
                              Your answer: {item.options[item.userAnswer]}
                              {item.isCorrect ? (
                                <CheckCircleIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
                              ) : (
                                <CancelIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
                              )}
                            </Typography>
                            {!item.isCorrect && (
                              <Typography component="span" variant="body2" color="text.secondary">
                                Correct answer: {item.options[item.correctAnswer]}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < quizHistory.slice(-5).length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}

export default PracticeQuiz; 