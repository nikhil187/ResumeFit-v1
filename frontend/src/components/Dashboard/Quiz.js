import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl, 
  FormLabel,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
  Chip,
  TextField,
  Divider,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tooltip,
  Link,
  Grid
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { generateQuiz, analyzeCompatibility } from '../../services/api';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CodeIcon from '@mui/icons-material/Code';
import LinkIcon from '@mui/icons-material/Link';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QuizCard from './QuizCard';

function Quiz() {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [showHints, setShowHints] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [error, setError] = useState(null);
  const [textAnswers, setTextAnswers] = useState({});
  
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  
  // Get resume and job description from location state
  const resumeData = location.state?.resumeData;
  const jobDescription = location.state?.jobDescription;
  
  useEffect(() => {
    if (!resumeData || !jobDescription) {
      showNotification('Missing resume or job description', 'error');
      navigate('/dashboard');
      return;
    }
    
    const loadQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const quizQuestions = await generateQuiz(jobDescription);
        setQuestions(quizQuestions);
        
        // Initialize answers object
        const initialAnswers = {};
        const initialTextAnswers = {};
        const initialHintsState = {};
        
        quizQuestions.forEach((question) => {
          const questionId = question.questionId || question.id || quizQuestions.indexOf(question);
          
          // Initialize with null for single-select or empty array for multi-select
          if (question.questionType === 'Multiple Choice (multiple answers possible)') {
            initialAnswers[questionId] = [];
          } else if (question.questionType && question.questionType.includes('Coding') ||
                    question.questionType && question.questionType.includes('SQL')) {
            initialTextAnswers[questionId] = '';
            initialAnswers[questionId] = null;
          } else {
            initialAnswers[questionId] = null;
          }
          
          // Initialize hints visibility state
          initialHintsState[questionId] = false;
        });
        
        setAnswers(initialAnswers);
        setTextAnswers(initialTextAnswers);
        setShowHints(initialHintsState);
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading quiz:', error);
        setError(error.message || "Failed to load quiz");
        showNotification('Failed to load quiz: ' + error.message, 'error');
        setLoading(false);
      }
    };
    
    loadQuiz();
  }, [resumeData, jobDescription, navigate, showNotification]);
  
  const handleSingleAnswerChange = (event) => {
    const questionId = questions[currentQuestion].questionId || questions[currentQuestion].id || currentQuestion;
    const selectedAnswer = parseInt(event.target.value);
    setAnswers({
      ...answers,
      [questionId]: selectedAnswer
    });
  };
  
  const handleMultiAnswerChange = (index) => {
    const questionId = questions[currentQuestion].questionId || questions[currentQuestion].id || currentQuestion;
    
    // Update answers state
    setAnswers({
      ...answers,
      [questionId]: index
    });
  };
  
  const handleTextAnswer = (text) => {
    const questionId = questions[currentQuestion].questionId || questions[currentQuestion].id || currentQuestion;
    
    const updatedTextAnswers = {
      ...textAnswers,
      [questionId]: text
    };
    setTextAnswers(updatedTextAnswers);
    
    // Mark question as answered if there's text
    if (text.trim() !== '') {
      setAnswers({
        ...answers,
        [questionId]: true
      });
    } else {
      setAnswers({
        ...answers,
        [questionId]: null
      });
    }
  };
  
  const toggleHints = () => {
    const questionId = questions[currentQuestion].questionId || questions[currentQuestion].id || currentQuestion;
    setShowHints({
      ...showHints,
      [questionId]: !showHints[questionId]
    });
  };
  
  const handlePrevious = () => {
    setCurrentQuestion(currentQuestion - 1);
  };
  
  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      // Move to next question
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Quiz completed, calculate results
      setAnalyzing(true);
      
      try {
        // Prepare data for submission
        const questionAnswers = {};
        const textResponseAnswers = {};
        
        // Process all answers
        questions.forEach((question, index) => {
          const questionId = question.questionId || question.id || index;
          const answer = answers[questionId];
          
          questionAnswers[questionId] = answer;
          
          // Add text answers for coding/text questions
          if (
            (question.questionType && question.questionType.includes('Coding')) ||
            (question.questionType && question.questionType.includes('SQL')) ||
            (question.questionType && question.questionType.includes('Short'))
          ) {
            textResponseAnswers[questionId] = textAnswers[questionId] || '';
          }
        });
        
        // Calculate score for multiple choice questions
        let score = 0;
        let totalScorableQuestions = 0;
        const quizFeedback = [];
        
        questions.forEach((question, index) => {
          const questionId = question.questionId || question.id || index;
          const selectedAnswer = answers[questionId];
          const questionType = question.questionType || 'Multiple Choice (single answer)';
          
          // Only score multiple choice questions automatically
          if (questionType.includes('Multiple Choice')) {
            totalScorableQuestions++;
            const correctAnswer = question.correctAnswer;
            
            // Check if single or multi-select
            let isCorrect = false;
            
            if (Array.isArray(correctAnswer)) {
              // Multi-select
              isCorrect = 
                Array.isArray(selectedAnswer) && 
                correctAnswer.length === selectedAnswer.length && 
                correctAnswer.every(value => selectedAnswer.includes(value));
            } else {
              // Single-select
              isCorrect = selectedAnswer === correctAnswer;
            }
            
            if (isCorrect) {
              score++;
            }
            
            // Store feedback
            quizFeedback.push({
              questionId,
              questionType,
              selectedAnswer,
              correctAnswer,
              isCorrect,
              explanation: question.explanation,
              wrongExplanations: question.wrongExplanations || []
            });
          } else {
            // For non-multiple choice, just store the response
            quizFeedback.push({
              questionId,
              questionType,
              userResponse: textAnswers[questionId] || null,
              explanation: question.explanation
            });
          }
        });
        
        // Format quiz results
        const quizResults = {
          score,
          totalScorableQuestions,
          totalQuestions: questions.length,
          answers: questionAnswers,
          textAnswers: textResponseAnswers,
          feedback: quizFeedback,
          questions
        };
        
        // Call API to analyze compatibility
        const analysis = await analyzeCompatibility(
          resumeData.text,
          jobDescription,
          quizResults.score
        );
        
        // Navigate to results page with all data
        navigate('/results', {
          state: {
            resumeData,
            jobDescription,
            quizResults,
            analysis
          }
        });
      } catch (error) {
        console.error('Error analyzing results:', error);
        setError(error.message || "Failed to analyze results");
        showNotification('Failed to analyze results: ' + error.message, 'error');
        setAnalyzing(false);
      }
    }
  };
  
  const handleSubmitQuiz = async () => {
    setAnalyzing(true);
    
    try {
      // Prepare data for submission
      const questionAnswers = {};
      
      // Process all answers
      questions.forEach((question, index) => {
        const questionId = question.questionId || question.id || index;
        const answer = answers[questionId];
        
        questionAnswers[questionId] = answer;
      });
      
      // Calculate score
      let score = 0;
      const quizFeedback = [];
      
      questions.forEach((question, index) => {
        const questionId = question.questionId || question.id || index;
        const selectedAnswer = answers[questionId];
        const correctAnswer = question.correctAnswer;
        
        // Check if answer is correct
        const isCorrect = selectedAnswer === correctAnswer;
        
        if (isCorrect) {
          score++;
        }
        
        // Store feedback for this question
        quizFeedback.push({
          questionId,
          selectedAnswer,
          correctAnswer,
          isCorrect,
          explanation: question.explanation
        });
      });
      
      // Format quiz results
      const quizResults = {
        score,
        totalQuestions: questions.length,
        answers: questionAnswers,
        feedback: quizFeedback,
        questions
      };
      
      // Call API to analyze compatibility
      const analysis = await analyzeCompatibility(
        resumeData.text,
        jobDescription,
        quizResults.score
      );
      
      // Navigate to results page with all data
      navigate('/results', {
        state: {
          resumeData,
          jobDescription,
          quizResults,
          analysis
        }
      });
    } catch (error) {
      console.error('Error analyzing results:', error);
      setError(error.message || "Failed to analyze results");
      showNotification('Failed to analyze results: ' + error.message, 'error');
      setAnalyzing(false);
    }
  };
  
  const renderQuestion = (question) => {
    const questionId = question.questionId || question.id || currentQuestion;
    const questionType = question.questionType || 'Multiple Choice (single answer)';
    
    if (questionType === 'Multiple Choice (single answer)') {
      return (
        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <RadioGroup
            value={answers[questionId] !== null ? answers[questionId].toString() : ''}
            onChange={handleSingleAnswerChange}
          >
            {question.options.map((option, index) => (
              <FormControlLabel
                key={index}
                value={index.toString()}
                control={<Radio />}
                label={option}
                sx={{ mb: 1, p: 1, '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }, borderRadius: 1 }}
              />
            ))}
          </RadioGroup>
        </FormControl>
      );
    } else if (questionType === 'Multiple Choice (multiple answers possible)') {
      return (
        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select all that apply
          </Typography>
          {question.options.map((option, index) => (
            <FormControlLabel
              key={index}
              control={
                <Checkbox
                  checked={answers[questionId] && answers[questionId].includes(index)}
                  onChange={() => handleMultiAnswerChange(index)}
                  value={index}
                />
              }
              label={option}
              sx={{ mb: 1, p: 1, '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }, borderRadius: 1, display: 'block' }}
            />
          ))}
        </FormControl>
      );
    } else if (
      questionType.includes('Coding') || 
      questionType.includes('SQL') || 
      questionType.includes('Short')
    ) {
      return (
        <Box>
          <TextField
            multiline
            rows={8}
            fullWidth
            variant="outlined"
            placeholder={`Enter your ${questionType.includes('SQL') ? 'SQL query' : 'code or answer'} here...`}
            value={textAnswers[questionId] || ''}
            onChange={(e) => handleTextAnswer(e.target.value)}
            sx={{ fontFamily: 'monospace' }}
          />
        </Box>
      );
    } else {
      // For scenario-based questions (Question 3 in the example)
      if (questionType?.toLowerCase().includes('scenario') || 
          !question.options || 
          question.options.length === 0) {
        return (
          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder="Type your answer here..."
              value={textAnswers[questionId] || ''}
              onChange={(e) => handleTextAnswer(e.target.value)}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: '#fafafa'
                }
              }}
            />
          </Box>
        );
      } else {
        // For multiple choice questions
        return (
          <Box sx={{ mt: 2 }}>
            {question.options && question.options.map((option, optionIndex) => (
              <Box 
                key={optionIndex} 
                sx={{ 
                  mb: 1.5,
                  backgroundColor: answers[questionId] === optionIndex ? 'primary.50' : 'transparent',
                  border: '1px solid',
                  borderColor: answers[questionId] === optionIndex ? 'primary.main' : 'grey.300',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }
                }}
              >
                <FormControlLabel
                  value={optionIndex.toString()}
                  control={
                    <Radio 
                      checked={answers[questionId] === optionIndex}
                      onChange={() => handleMultiAnswerChange(optionIndex)}
                      sx={{ ml: 1 }}
                    />
                  }
                  label={
                    <Typography variant="body1">{option}</Typography>
                  }
                  sx={{ 
                    display: 'flex', 
                    py: 1.5,
                    px: 1,
                    width: '100%'
                  }}
                />
              </Box>
            ))}
          </Box>
        );
      }
    }
  };
  
  // Question Navigation Component
  const QuestionNavigator = ({ questions, currentQuestion, onQuestionSelect, answers }) => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Question Navigator
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1.5,
          justifyContent: 'flex-start',
          '& > *': { margin: '4px' }
        }}>
          {questions.map((_, index) => {
            const questionId = questions[index].questionId || questions[index].id || index;
            const isAnswered = answers[questionId] !== null && answers[questionId] !== undefined;
            const isCurrent = index === currentQuestion;
            
            return (
              <Button
                key={index}
                variant={isCurrent ? "contained" : "outlined"}
                onClick={() => onQuestionSelect(index)}
                sx={{
                  minWidth: '40px',
                  width: '40px',
                  height: '40px',
                  padding: 0,
                  borderRadius: '50%',
                  fontSize: '0.9rem',
                  fontWeight: isCurrent ? 'bold' : 'normal',
                  backgroundColor: isCurrent 
                    ? 'primary.main' 
                    : isAnswered 
                      ? 'success.light' 
                      : 'grey.200',
                  color: isCurrent ? 'white' : isAnswered ? 'success.dark' : 'text.primary',
                  '&:hover': {
                    backgroundColor: isCurrent 
                      ? 'primary.dark' 
                      : isAnswered 
                        ? 'success.main' 
                        : 'grey.300',
                  },
                  border: isCurrent ? 'none' : isAnswered ? '1px solid' : '1px solid',
                  borderColor: isAnswered ? 'success.main' : 'grey.300',
                  textOverflow: 'initial',
                  lineHeight: 1,
                  '& .MuiButton-label': {
                    whiteSpace: 'nowrap',
                    overflow: 'visible'
                  }
                }}
              >
                {index + 1}
              </Button>
            );
          })}
        </Box>
      </Box>
    );
  };
  
  // Question Information Component
  const QuestionInformation = ({ question }) => {
    // Ensure first letter is capitalized for difficulty
    const formatDifficulty = (diff) => {
      if (!diff) return 'Advanced';
      return diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
    };

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Question Information</Typography>
        
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Type:</Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{question.questionType || 'Scenario-Based Problem'}</Typography>
        </Box>
        
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Difficulty:</Typography>
          <Chip 
            label={formatDifficulty(question.difficulty)} 
            size="small" 
            color={
              question.difficulty === 'beginner' ? 'success' :
              question.difficulty === 'intermediate' ? 'primary' : 'error'
            }
            variant="outlined"
          />
        </Box>
        
        <Box>
          <Typography variant="subtitle2" color="text.secondary">Category:</Typography>
          <Chip 
            label={question.category || 'Full-Stack Development'}
            size="small"
            variant="outlined"
            sx={{ mt: 0.5 }}
          />
        </Box>
      </Box>
    );
  };
  
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Generating quiz questions...
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
          This may take a minute to create advanced technical questions
        </Typography>
      </Container>
    );
  }
  
  if (analyzing) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Analyzing your results...
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
          We're evaluating your answers and preparing a detailed analysis
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
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }
  
  if (!questions || questions.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          No questions could be generated. Please try again.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }
  
  const currentQ = questions[currentQuestion];
  const questionId = currentQ.questionId || currentQ.id || currentQuestion;
  const isAnswered = answers[questionId] !== null && answers[questionId] !== undefined;
  const isMultiSelect = currentQ.questionType === 'Multiple Choice (multiple answers possible)';
  const isTextAnswer = 
    (currentQ.questionType && currentQ.questionType.includes('Coding')) || 
    (currentQ.questionType && currentQ.questionType.includes('SQL')) ||
    (currentQ.questionType && currentQ.questionType.includes('Short'));
  const isLastQuestion = currentQuestion === questions.length - 1;
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Technical Assessment</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        This assessment evaluates your technical skills based on the job requirements. Answer each question to the best of your ability.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper elevation={2} sx={{ p: 2, borderRadius: 2, position: 'sticky', top: '20px' }}>
            <QuestionNavigator questions={questions} currentQuestion={currentQuestion} onQuestionSelect={(index) => setCurrentQuestion(index)} answers={answers} />
            
            <Divider sx={{ my: 2 }} />
            
            <QuestionInformation question={currentQ} />
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" color="text.secondary">
              Progress: {currentQuestion + 1} of {questions.length}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={9}>
          <QuizCard
            question={currentQ}
            currentQuestion={currentQuestion}
            totalQuestions={questions.length}
            onAnswerChange={(index) => handleMultiAnswerChange(index)}
            userAnswer={answers[questionId]}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              startIcon={<ArrowBackIcon />}
              sx={{ minWidth: '120px' }}
            >
              Previous
            </Button>
            
            {currentQuestion < questions.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForwardIcon />}
                sx={{ minWidth: '120px' }}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                onClick={handleSubmitQuiz}
                endIcon={<CheckCircleIcon />}
                sx={{ minWidth: '120px' }}
              >
                Submit Quiz
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Quiz;