import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Rating,
  LinearProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Link,
  ListItemButton,
  Badge,
  Switch,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Collapse
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { saveReport } from '../../services/mongoDb';
import { generateInterviewQuestions, generateComprehensiveAnalysis } from '../../services/api';
import { Radar, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title
} from 'chart.js';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import StarIcon from '@mui/icons-material/Star';
import SchoolIcon from '@mui/icons-material/School';
import WorkIcon from '@mui/icons-material/Work';
import CodeIcon from '@mui/icons-material/Code';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LockIcon from '@mui/icons-material/Lock';
import LinkIcon from '@mui/icons-material/Link';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import MicIcon from '@mui/icons-material/Mic';
import FlagIcon from '@mui/icons-material/Flag';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import QuizIcon from '@mui/icons-material/Quiz';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';

// Register ChartJS components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
);

function Results() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [skillsData, setSkillsData] = useState(null);
  const [strengthsWeaknesses, setStrengthsWeaknesses] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [categoryScoresData, setCategoryScoresData] = useState(null);
  const [gapChartData, setGapChartData] = useState(null);
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [interviewTopics, setInterviewTopics] = useState([]);
  const [interviewQuestionsLoading, setInterviewQuestionsLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState({});
  const [practiceModeActive, setPracticeModeActive] = useState(false);
  const [interviewFilter, setInterviewFilter] = useState('all');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [jobDescriptionDialogOpen, setJobDescriptionDialogOpen] = useState(false);
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  
  // Extract data from location state
  const { resumeData, jobDescription, quizResults, analysis } = location.state || {};
  
  useEffect(() => {
    if (analysis) {
      // Extract skills data for visualization
      extractSkillsData();
      // Extract strengths and weaknesses
      extractStrengthsWeaknesses();
      // Prepare category scores data
      setCategoryScoresData(prepareCategoryScoresData());
      // Prepare gap chart data
      setGapChartData(prepareGapChartData());
    }
  }, [analysis]);
  
  useEffect(() => {
    if (analysis && analysis.skillsAnalysis) {
      prepareSkillsChartData();
    }
  }, [analysis]);
  
  useEffect(() => {
    if (analysis && jobDescription) {
      fetchInterviewQuestions();
    }
  }, [analysis, jobDescription]);
  
  // Fetch comprehensive analysis when the Skills Analysis tab is opened for the first time
  useEffect(() => {
    if (activeTab === 1 && !comprehensiveAnalysis && resumeData?.text && jobDescription) {
      fetchComprehensiveAnalysis();
    }
  }, [activeTab, comprehensiveAnalysis, resumeData, jobDescription]);
  
  // Function to fetch comprehensive analysis
  const fetchComprehensiveAnalysis = async () => {
    try {
      setAnalysisLoading(true);
      const result = await generateComprehensiveAnalysis(resumeData?.text || '', jobDescription);
      
      // Update the state with the comprehensive analysis
      setComprehensiveAnalysis(result);
      
      // Save the comprehensive analysis to the backend if it's available
      if (result && analysis) {
        console.log("Saving comprehensive analysis to backend");
        
        // Create a combined analysis object with both the original analysis and the comprehensive analysis
        const updatedAnalysis = {
          ...analysis,
          comprehensiveAnalysis: result
        };
        
        // If we're going to save a report later, make sure it includes this data
        if (analysis) {
          // We should update the analysis object for when the report is saved
          analysis.comprehensiveAnalysis = result;
        }
      }
    } catch (error) {
      console.error("Error fetching comprehensive analysis:", error);
      showNotification("Error loading comprehensive analysis", "error");
      setComprehensiveAnalysis('<p>Failed to load comprehensive analysis. Please try again later.</p>');
    } finally {
      setAnalysisLoading(false);
    }
  };
  
  // Function to extract skills data from analysis text
  const extractSkillsData = () => {
    if (!analysis || !analysis.skillsAnalysis) return;
    
    // Use the skillsAnalysis data directly from the API response
    setSkillsData({
      labels: analysis.skillsAnalysis.map(item => item.skill),
      datasets: [
        {
          label: 'Job Relevance',
          data: analysis.skillsAnalysis.map(item => item.relevance),
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Candidate Match',
          data: analysis.skillsAnalysis.map(item => item.match),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        }
      ],
    });
  };
  
  // Function to extract strengths and weaknesses
  const extractStrengthsWeaknesses = () => {
    if (!analysis) return;
    
    // Extract strengths and areas for growth from the API response
    let strengths = [];
    let weaknesses = [];
    
    // Check if the API returned arrays directly
    if (Array.isArray(analysis.strengths) && analysis.strengths.length > 0) {
      strengths = analysis.strengths;
    }
    
    if (Array.isArray(analysis.areasForGrowth) && analysis.areasForGrowth.length > 0) {
      weaknesses = analysis.areasForGrowth;
    }
    
    // If strengths or weaknesses are empty, try to extract from HTML content
    if (strengths.length === 0 && analysis.analysis) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(analysis.analysis, 'text/html');
        
        // Look for strengths in h3 sections
        const strengthsHeadings = doc.querySelectorAll('h3');
        for (const heading of strengthsHeadings) {
          if (heading.textContent.toLowerCase().includes('strength')) {
            // Get the next ul or ol element
            let nextElement = heading.nextElementSibling;
            while (nextElement && !['UL', 'OL'].includes(nextElement.tagName)) {
              nextElement = nextElement.nextElementSibling;
            }
            
            if (nextElement) {
              // Extract list items
              const items = nextElement.querySelectorAll('li');
              strengths = Array.from(items).map(item => item.textContent.trim());
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error parsing HTML for strengths:', error);
      }
    }
    
    // If weaknesses are empty, try to extract from HTML content
    if (weaknesses.length === 0 && analysis.analysis) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(analysis.analysis, 'text/html');
        
        // Look for weaknesses/areas for growth in h3 sections
        const weaknessHeadings = doc.querySelectorAll('h3');
        for (const heading of weaknessHeadings) {
          if (heading.textContent.toLowerCase().includes('weakness') || 
              heading.textContent.toLowerCase().includes('areas for growth')) {
            // Get the next ul or ol element
            let nextElement = heading.nextElementSibling;
            while (nextElement && !['UL', 'OL'].includes(nextElement.tagName)) {
              nextElement = nextElement.nextElementSibling;
            }
            
            if (nextElement) {
              // Extract list items
              const items = nextElement.querySelectorAll('li');
              weaknesses = Array.from(items).map(item => item.textContent.trim());
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error parsing HTML for weaknesses:', error);
      }
    }
    
    // If still empty, provide default messages
    if (strengths.length === 0) {
      strengths = ['Relevant technical background', 'Educational qualifications', 'Demonstrated interest in the field'];
    }
    
    if (weaknesses.length === 0) {
      weaknesses = ['Consider improving technical skills', 'Gain more specialized experience', 'Develop additional relevant certifications'];
    }
    
    setStrengthsWeaknesses({
      strengths: strengths,
      weaknesses: weaknesses
    });
  };
  
  // Function to strip HTML tags from text
  const stripHtml = (html) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const openSaveDialog = () => {
    // Generate a default title based on job description
    let defaultTitle = 'Job Analysis Report';
    if (jobDescription) {
      // Try to extract a job title from the first 100 characters
      const excerpt = jobDescription.substring(0, 100);
      const titleMatch = excerpt.match(/(?:^|\s)([\w\s]+developer|[\w\s]+engineer|[\w\s]+designer|[\w\s]+manager|[\w\s]+analyst|[\w\s]+specialist)(?:$|\s)/i);
      if (titleMatch && titleMatch[1]) {
        defaultTitle = titleMatch[1].trim() + " Analysis";
      }
    }
    
    // Add date to the title
    const currentDate = new Date().toLocaleDateString();
    defaultTitle += ` (${currentDate})`;
    
    setReportTitle(defaultTitle);
    setSaveDialogOpen(true);
  };
  
  const closeSaveDialog = () => {
    setSaveDialogOpen(false);
  };
  
  const handleSaveWithTitle = async () => {
    closeSaveDialog();
    await saveReportWithData();
  };
  
  const handleSaveReport = () => {
    if (!currentUser || !currentUser.uid) {
      showNotification('You must be logged in to save reports', 'error');
      return;
    }
    
    openSaveDialog();
  };
  
  const saveReportWithData = async () => {
    try {
      setSaving(true);
      setError(null);
      
      console.log('Quiz data before formatting:', quizResults);
      
      // Check if comprehensive analysis is available
      console.log('Comprehensive analysis available before saving:', Boolean(comprehensiveAnalysis));
      console.log('Comprehensive analysis content:', comprehensiveAnalysis);
      
      // Format quiz data to match server schema with better handling
      const formattedQuizResults = {
        score: Number(quizResults?.score) || 0,
        totalScorableQuestions: Number(quizResults?.totalScorableQuestions) || Number(quizResults?.totalQuestions) || 0,
        totalQuestions: Number(quizResults?.totalQuestions) || 0,
        answers: quizResults?.questions?.map((question, index) => {
          const feedback = quizResults.feedback[index];
          const questionId = question.questionId || question.id || index;
          const answer = quizResults.answers[questionId];
          
          // Return a complete question object
          return {
            questionNumber: index + 1,
            questionId: questionId,
            question: question.question,
            questionType: question.questionType || 'Multiple Choice',
            difficulty: question.difficulty || 'advanced',
            category: question.category || 'Technical',
            options: JSON.stringify(question.options || []), // Ensure options are serialized
            selectedAnswer: answer === 0 ? 0 : (answer || null), // Handle case where answer is 0
            correctAnswer: question.correctAnswer,
            isCorrect: feedback.isCorrect,
            explanation: feedback.explanation || '',
            textAnswer: quizResults.textAnswers?.[questionId] || ''
          };
        }) || [],
        completedAt: new Date()
      };
      
      console.log('Formatted quiz results:', formattedQuizResults);
      
      // Format the saved interview questions
      const formattedSavedQuestions = savedQuestions.map(question => ({
        id: question.id,
        question: question.question,
        difficulty: question.difficulty || 'Intermediate',
        type: question.type || 'Technical',
        category: question.category || question.topicName,
        topicName: question.topicName,
        sampleAnswer: question.sampleAnswer || '',
        tips: question.tips || '',
        saved: true
      }));
      
      // Get strengths and weaknesses from the state
      const { strengths, weaknesses } = strengthsWeaknesses || { strengths: [], weaknesses: [] };
      
      // Ensure analysis data is cloned to prevent reference issues
      const analysisData = {
        ...analysis,
        strengths: strengths,
        areasForGrowth: weaknesses,
        skillsAnalysis: analysis.skillsAnalysis ? [...analysis.skillsAnalysis] : [],
        categoryScores: { ...analysis.categoryScores },
        // Preserve all HTML content for detailed sections
        summary: analysis.summary || '',
        analysis: analysis.analysis || '',
        recommendations: analysis.recommendations || '',
        learningResources: analysis.learningResources || '',
        learningRoadmap: analysis.learningRoadmap || '',
        // Include comprehensive analysis if available
        comprehensiveAnalysis: comprehensiveAnalysis || '',
        // Include additional metrics that might be used in visualizations
        skillsMatchPercentage: analysis.skillsMatchPercentage || 0,
        score: analysis.score || 0
      };
      
      // Get category weights for saving
      const getCategoryWeight = (category) => {
        switch(category) {
          case 'technicalSkills': return 25;
          case 'experience': return 20;
          case 'education': return 15;
          case 'quizPerformance': return 30;
          case 'careerTrajectory': return 10;
          default: return 0;
        }
      };
      
      // Create weight data for visualizations
      const categoryWeightData = {
        labels: ['Technical Skills', 'Experience', 'Education', 'Quiz Performance', 'Career Trajectory'],
        datasets: [
          {
            label: 'Category Weights',
            data: [25, 20, 15, 30, 10],
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',
              'rgba(75, 192, 192, 0.6)', 
              'rgba(153, 102, 255, 0.6)',
              'rgba(255, 159, 64, 0.6)',
              'rgba(255, 99, 132, 0.6)'
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)',
              'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1,
          }
        ],
      };
      
      // Ensure visualization data is properly stored with deep copies
      const visualizationData = {
        skillsData: skillsData ? JSON.parse(JSON.stringify(skillsData)) : null,
        categoryScoresData: categoryScoresData ? JSON.parse(JSON.stringify(categoryScoresData)) : null,
        gapChartData: gapChartData ? JSON.parse(JSON.stringify(gapChartData)) : null,
        // Add category weights data
        categoryWeights: {
          technicalSkills: getCategoryWeight('technicalSkills'),
          experience: getCategoryWeight('experience'),
          education: getCategoryWeight('education'),
          quizPerformance: getCategoryWeight('quizPerformance'),
          careerTrajectory: getCategoryWeight('careerTrajectory')
        },
        categoryWeightData: categoryWeightData,
        // Add any other visualization data used in the Results page
        performanceByCategory: analysisData.categoryScores ? {
          labels: ['Technical Skills', 'Experience', 'Education', 'Quiz Performance', 'Career Trajectory'],
          datasets: [{
            label: 'Category Scores',
            data: [
              analysisData.categoryScores.technicalSkills || 0,
              analysisData.categoryScores.experience || 0,
              analysisData.categoryScores.education || 0,
              analysisData.categoryScores.quizPerformance || 0,
              analysisData.categoryScores.careerTrajectory || 0
            ],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        } : null,
        skillsGapAnalysis: analysis.skillsAnalysis ? 
          analysis.skillsAnalysis.map(item => ({
            skill: item.skill,
            relevance: item.relevance,
            match: item.match,
            gap: item.gap
          })) : []
      };
      
      // Prepare the report data
      const reportData = {
        title: reportTitle,
        resumeData: {
          text: resumeData?.text || '',
          fileName: resumeData?.fileName || 'resume.pdf'
        },
        jobDescription: jobDescription || '',
        analysis: analysisData,
        quizResults: formattedQuizResults,
        savedInterviewQuestions: formattedSavedQuestions,
        interviewTopics: interviewTopics || [],
        visualizationData: visualizationData,
        createdAt: new Date(),
        // Add extra metadata to ensure we can restore the exact same view
        metadata: {
          version: '2.0', // Add a version to track format changes
          generatedAt: new Date(),
          includesAllVisualizations: true
        }
      };
      
      console.log("Final savedQuestions being saved:", savedQuestions);
      console.log("Final formatted savedQuestions being saved:", formattedSavedQuestions);
      console.log("Final interviewTopics being saved:", interviewTopics);

      // After formatting the report data
      console.log("Final report structure:", JSON.stringify(reportData, null, 2));
      console.log("Checking comprehensiveAnalysis in final structure:", Boolean(reportData.analysis.comprehensiveAnalysis));
      console.log("Length of comprehensiveAnalysis:", reportData.analysis.comprehensiveAnalysis?.length || 0);
      
      // Save the report to the database
      console.log("Saving report to database with UID:", currentUser.uid);
      const reportId = await saveReport(currentUser.uid, reportData);
      console.log("Report saved with ID:", reportId);
      
      showNotification('Report saved successfully', 'success');
      navigate('/reports');
      
    } catch (error) {
      console.error('Error saving report:', error);
      setError(error.message || "Failed to save report");
      showNotification('Failed to save report: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };
  
  const prepareSkillsChartData = () => {
    if (!analysis.skillsAnalysis) return;
    
    // Prepare data for radar chart
    setSkillsData({
      labels: analysis.skillsAnalysis.map(item => item.skill),
      datasets: [
        {
          label: 'Job Relevance',
          data: analysis.skillsAnalysis.map(item => item.relevance),
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Candidate Match',
          data: analysis.skillsAnalysis.map(item => item.match),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        }
      ],
    });
  };
  
  // Extract code snippets from the question text
  const extractCodeSnippet = (questionText) => {
    if (!questionText) return { text: '', code: null };
    
    // Check for code blocks with ```
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const codeBlocks = [];
    let match;
    let modifiedText = questionText;
    
    while ((match = codeBlockRegex.exec(questionText)) !== null) {
      codeBlocks.push(match[1].trim());
      modifiedText = modifiedText.replace(match[0], `[CODE_BLOCK_${codeBlocks.length - 1}]`);
    }
    
    return {
      text: modifiedText,
      codeBlocks: codeBlocks.length > 0 ? codeBlocks : null
    };
  };
  
  // Render question text with code snippets properly formatted
  const renderQuestionText = (questionText) => {
    if (!questionText) return <Typography>No question available</Typography>;
    
    const { text, codeBlocks } = extractCodeSnippet(questionText);
    
    if (!codeBlocks) return <Typography variant="body1">{text}</Typography>;
    
    return (
      <>
        {text.split('[CODE_BLOCK_').map((part, index) => {
          if (index === 0) return <Typography key={`text-${index}`} variant="body1">{part}</Typography>;
          
          const closingBracketIndex = part.indexOf(']');
          if (closingBracketIndex === -1) return <Typography key={`text-${index}`} variant="body1">{part}</Typography>;
          
          const codeBlockIndex = parseInt(part.substring(0, closingBracketIndex));
          const remainingText = part.substring(closingBracketIndex + 1);
          
          return (
            <React.Fragment key={`fragment-${index}`}>
              <Box sx={{ my: 2 }}>
                <SyntaxHighlighter
                  language={getLanguageFromCategory(codeBlocks[codeBlockIndex])}
                  style={atomDark}
                  customStyle={{ borderRadius: '8px' }}
                >
                  {codeBlocks[codeBlockIndex]}
                </SyntaxHighlighter>
              </Box>
              <Typography variant="body1">{remainingText}</Typography>
            </React.Fragment>
          );
        })}
      </>
    );
  };
  
  // Function to determine language based on category
  const getLanguageFromCategory = (category) => {
    if (!category) return 'javascript';
    
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('python')) return 'python';
    if (categoryLower.includes('java') && !categoryLower.includes('javascript')) return 'java';
    if (categoryLower.includes('javascript') || categoryLower.includes('react')) return 'javascript';
    if (categoryLower.includes('c#')) return 'csharp';
    if (categoryLower.includes('sql')) return 'sql';
    if (categoryLower.includes('php')) return 'php';
    if (categoryLower.includes('ruby')) return 'ruby';
    if (categoryLower.includes('go')) return 'go';
    if (categoryLower.includes('c++')) return 'cpp';
    
    return 'javascript';
  };
  
  // Get color based on question category
  const getCategoryColor = (category) => {
    if (!category) return 'primary.main';
    
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('debug')) return '#e91e63'; // Pink
    if (lowerCategory.includes('logic')) return '#2196f3'; // Blue
    if (lowerCategory.includes('situation')) return '#ff9800'; // Orange
    if (lowerCategory.includes('behavio')) return '#9c27b0'; // Purple
    if (lowerCategory.includes('concept')) return '#4caf50'; // Green
    
    return 'primary.main'; // Default color
  };
  
  // Format text with proper capitalization
  const formatText = (text) => {
    if (!text) return '';
    
    // Split by spaces and capitalize each word
    return text.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  // Function to render a quiz question
  const renderQuizQuestion = (question, feedback, index) => {
    if (!question || !feedback) return null;
    
    const questionId = question.questionId || question.id || index;
    const isCorrect = feedback.isCorrect;
    
    return (
      <Accordion key={index} defaultExpanded={index === 0} sx={{ mb: 2 }}>
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon />}
          sx={{ 
            backgroundColor: isCorrect 
              ? 'rgba(76, 175, 80, 0.1)' 
              : 'rgba(244, 67, 54, 0.1)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Box 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                bgcolor: isCorrect ? 'success.main' : 'error.main',
                color: 'white',
                width: 32,
                height: 32,
                mr: 2
              }}
            >
              {index + 1}
            </Box>
            
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                {question.question?.substring(0, 80) || 'Question'}
                {question.question && question.question.length > 80 ? '...' : ''}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Chip 
                  size="small" 
                  label={formatText(question.category || 'Technical')} 
                  sx={{ mr: 1, bgcolor: getCategoryColor(question.category), color: 'white' }} 
                />
                <Chip 
                  size="small" 
                  label={question.difficulty ? formatText(question.difficulty) : 'Advanced'} 
                  color={
                    question.difficulty?.toLowerCase() === 'basic' ? 'success' : 
                    question.difficulty?.toLowerCase() === 'intermediate' ? 'warning' : 
                    'error'
                  } 
                  variant="outlined"
                />
                {question.type && (
                  <Chip 
                    label={formatText(question.type)} 
                    size="small" 
                    color="default" 
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
            
            <Box sx={{ ml: 2 }}>
              {isCorrect ? (
                <CheckCircleIcon color="success" sx={{ fontSize: 28 }} />
              ) : (
                <CancelIcon color="error" sx={{ fontSize: 28 }} />
              )}
            </Box>
          </Box>
        </AccordionSummary>
        
        <AccordionDetails sx={{ p: 3 }}>
          {renderQuestionText(question.question)}
          
          {/* For multiple choice questions */}
          <Box sx={{ mb: 3, mt: 3 }}>
            {question.options && question.options.map((option, optIndex) => {
              const correctAnswer = question.correctAnswer;
              const selectedAnswer = feedback.selectedAnswer;
              
              // Determine styling for this option
              let bgColor = 'grey.100';
              let borderLeft = 'none';
              let borderLeftColor = undefined;
              
              if (optIndex === correctAnswer) {
                bgColor = 'success.light';
                borderLeft = '4px solid';
                borderLeftColor = 'success.main';
              } else if (optIndex === selectedAnswer && selectedAnswer !== correctAnswer) {
                bgColor = 'error.light';
                borderLeft = '4px solid';
                borderLeftColor = 'error.main';
              }
              
              return (
                <Box 
                  key={optIndex} 
                  sx={{ 
                    p: 2, 
                    mb: 1, 
                    borderRadius: 1,
                    bgcolor: bgColor,
                    borderLeft: borderLeft,
                    borderColor: borderLeftColor,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {optIndex === selectedAnswer && (
                    <Box sx={{ mr: 2 }}>
                      {optIndex === correctAnswer ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        <CancelIcon color="error" />
                      )}
                    </Box>
                  )}
                  
                  {optIndex === correctAnswer && optIndex !== selectedAnswer && (
                    <Box sx={{ mr: 2 }}>
                      <ArrowRightIcon color="success" />
                    </Box>
                  )}
                  
                  <Typography variant="body1">
                    {option}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          
          {/* Explanation section */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
              Explanation:
            </Typography>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                bgcolor: isCorrect ? 'success.50' : 'error.50',
                borderLeft: '4px solid',
                borderColor: isCorrect ? 'success.main' : 'error.main'
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {feedback.explanation || 'No explanation available'}
              </Typography>
            </Paper>
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };
  
  // Add radar chart for category scores
  const prepareCategoryScoresData = () => {
    if (!analysis || !analysis.categoryScores) return null;
    
    return {
      labels: ['Technical Skills', 'Experience', 'Education', 'Quiz Performance', 'Career Trajectory'],
      datasets: [
        {
          label: 'Category Scores',
          data: [
            analysis.categoryScores.technicalSkills || 0,
            analysis.categoryScores.experience || 0, 
            analysis.categoryScores.education || 0,
            analysis.categoryScores.quizPerformance || 0,
            analysis.categoryScores.careerTrajectory || 0
          ],
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        }
      ],
    };
  };
  
  // Prepare visualization data for the gaps
  const prepareGapChartData = () => {
    if (!analysis || !analysis.skillsAnalysis) return null;
    
    // Sort skills by gap size descending to highlight biggest gaps
    const sortedSkills = [...analysis.skillsAnalysis].sort((a, b) => b.gap - a.gap);
    const topGapSkills = sortedSkills.slice(0, 5);
    
    return {
      labels: topGapSkills.map(skill => skill.skill),
      datasets: [
        {
          label: 'Skill Relevance',
          data: topGapSkills.map(skill => skill.relevance),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Your Match',
          data: topGapSkills.map(skill => skill.match),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        }
      ],
    };
  };
  
  const fetchInterviewQuestions = async () => {
    try {
      setInterviewQuestionsLoading(true);
      const result = await generateInterviewQuestions(jobDescription, resumeData?.text || '');
      
      // The API now returns an object with topics and questions arrays
      setInterviewQuestions(result.questions);
      setInterviewTopics(result.topics);
      
    } catch (error) {
      console.error("Error fetching interview questions:", error);
      showNotification("Error loading interview questions", "error");
    } finally {
      setInterviewQuestionsLoading(false);
    }
  };
  
  const handleToggleAnswer = (id) => {
    setShowAnswers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  const handleSaveQuestion = (id) => {
    setInterviewQuestions(prev => {
      const updatedQuestions = prev.map(q => 
        q.id === id ? {...q, saved: !q.saved} : q
      );
      
      // Get the question that was just toggled
      const toggledQuestion = updatedQuestions.find(q => q.id === id);
      
      // If it's now saved, add to savedQuestions stack
      if (toggledQuestion && toggledQuestion.saved) {
        setSavedQuestions(prev => [...prev, toggledQuestion]);
      } else {
        // If it's now unsaved, remove from savedQuestions stack
        setSavedQuestions(prev => prev.filter(q => q.id !== id));
      }
      
      return updatedQuestions;
    });
  };
  
  const handleTogglePracticeMode = () => {
    setPracticeModeActive(prev => !prev);
    // Hide all answers when entering practice mode
    if (!practiceModeActive) {
      setShowAnswers({});
    }
  };
  
  const handleFilterClick = (event) => {
    setFilterMenuAnchor(event.currentTarget);
  };
  
  const handleFilterClose = () => {
    setFilterMenuAnchor(null);
  };
  
  const handleSortClick = (event) => {
    setSortMenuAnchor(event.currentTarget);
  };
  
  const handleSortClose = () => {
    setSortMenuAnchor(null);
  };
  
  const handleFilterChange = (filter) => {
    setInterviewFilter(filter);
    handleFilterClose();
  };
  
  const filteredQuestions = interviewQuestions.filter(q => {
    if (interviewFilter === 'all') return true;
    if (interviewFilter === 'saved') return q.saved;
    return q.topicName === interviewFilter;
  });
  
  const handleRegenerateQuestions = () => {
    setRegenerateConfirmOpen(true);
  };
  
  const confirmRegenerateQuestions = async () => {
    setRegenerateConfirmOpen(false);
    setInterviewQuestionsLoading(true);
    
    try {
      // Generate new questions
      const result = await generateInterviewQuestions(jobDescription, resumeData?.text || '');
      
      // Map existing saved questions to maintain saved state
      const newQuestions = result.questions.map(newQ => {
        // Look for a matching saved question by content
        const matchingSaved = savedQuestions.find(savedQ => 
          savedQ.question.toLowerCase() === newQ.question.toLowerCase() ||
          savedQ.topicName.toLowerCase() === newQ.topicName.toLowerCase()
        );
        
        // If found, mark as saved, otherwise keep as is
        return matchingSaved ? { ...newQ, saved: true } : newQ;
      });
      
      // Update state with new questions
      setInterviewQuestions(newQuestions);
      setInterviewTopics(result.topics);
      
    } catch (error) {
      console.error("Error regenerating interview questions:", error);
      showNotification("Error regenerating interview questions", "error");
    } finally {
      setInterviewQuestionsLoading(false);
    }
  };
  
  // Add this function to open/close the job description preview dialog
  const toggleJobDescriptionDialog = () => {
    setJobDescriptionDialogOpen(!jobDescriptionDialogOpen);
  };

  if (!analysis) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading analysis...
        </Typography>
      </Container>
    );
  }
  
  // Prepare data for the compatibility score gauge
  const compatibilityData = {
    labels: ['Compatible', 'Gap'],
    datasets: [
      {
        data: [analysis.score, 100 - analysis.score],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(211, 211, 211, 0.5)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(211, 211, 211, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Prepare data for quiz results chart
  const quizData = {
    labels: ['Correct', 'Incorrect'],
    datasets: [
      {
        data: [
          quizResults?.score || 0, 
          (quizResults?.totalQuestions || 0) - (quizResults?.score || 0)
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 99, 132, 0.8)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Options for doughnut charts
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true
      }
    }
  };
  
  // Calculate quiz performance and provide helpful feedback
  const getQuizPerformanceFeedback = () => {
    const quizScore = quizResults?.score || 0;
    const maxScore = quizResults?.totalQuestions || 10;
    // Make sure we don't divide by zero
    const percentage = maxScore > 0 ? (quizScore / maxScore) * 100 : 0;
    
    let feedbackText = "";
    let feedbackColor = "error";
    
    if (percentage === 0) {
      feedbackText = "You didn't answer any questions correctly. Consider reviewing the technical concepts in this job description before re-attempting the quiz.";
      feedbackColor = "error";
    } else if (percentage < 30) {
      feedbackText = "You're just getting started. Focus on strengthening your core technical skills.";
      feedbackColor = "error";
    } else if (percentage < 50) {
      feedbackText = "You're making progress, but there's room for improvement. Review the quiz explanations.";
      feedbackColor = "warning";
    } else if (percentage < 70) {
      feedbackText = "Good job! You have a solid grasp of the basics. Focus on the more challenging concepts.";
      feedbackColor = "info";
    } else if (percentage < 90) {
      feedbackText = "Excellent work! You demonstrate strong technical knowledge in this area.";
      feedbackColor = "success";
    } else {
      feedbackText = "Outstanding! You've mastered the technical concepts required for this position.";
      feedbackColor = "success";
    }
    
    return { text: feedbackText, color: feedbackColor, percentage };
  };

  const quizFeedback = getQuizPerformanceFeedback();
  
  // Update the Interview Questions section in the render method to show loading state
  const renderInterviewQuestionsTab = () => {
    return (
      <Box mt={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            <QuizIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Interview Questions
          </Typography>
          <Box>
            <Tooltip title="Filter questions">
              <IconButton onClick={handleFilterClick}>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={filterMenuAnchor}
              open={Boolean(filterMenuAnchor)}
              onClose={handleFilterClose}
            >
              <MenuItem onClick={() => handleFilterChange('all')}>All Questions</MenuItem>
              <MenuItem onClick={() => handleFilterChange('saved')}>Saved Questions</MenuItem>
              <Divider />
              {Array.from(new Set(interviewQuestions.map(q => q.topicName))).map(topicName => (
                <MenuItem key={topicName} onClick={() => handleFilterChange(topicName)}>
                  {topicName}
                </MenuItem>
              ))}
            </Menu>
            
            <Tooltip title="Sort questions">
              <IconButton onClick={handleSortClick}>
                <SortIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={sortMenuAnchor}
              open={Boolean(sortMenuAnchor)}
              onClose={handleSortClose}
            >
              <MenuItem onClick={() => { /* implement sorting */ }}>Difficulty (Easy to Hard)</MenuItem>
              <MenuItem onClick={() => { /* implement sorting */ }}>Difficulty (Hard to Easy)</MenuItem>
              <MenuItem onClick={() => { /* implement sorting */ }}>Category</MenuItem>
            </Menu>
            
            <Tooltip title={practiceModeActive ? "Exit practice mode" : "Enter practice mode"}>
              <IconButton onClick={handleTogglePracticeMode} color={practiceModeActive ? "primary" : "default"}>
                <PlayCircleOutlineIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Generate new questions">
              <IconButton 
                onClick={handleRegenerateQuestions}
                disabled={interviewQuestionsLoading}
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* Saved questions counter */}
        {savedQuestions.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Chip
              icon={<BookmarkIcon />}
              label={`${savedQuestions.length} questions saved`}
              color="primary"
              variant="outlined"
            />
            <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
              These will be included in your report if you save it
            </Typography>
          </Box>
        )}
        
        {/* Topic-wise menu at the top */}
        <Paper sx={{ mb: 3, p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            Key Topic Areas {interviewTopics && interviewTopics.length > 0 && `(${interviewTopics.length} Topics)`}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, maxHeight: '150px', overflowY: 'auto', pb: 1 }}>
            <Chip 
              label="All Topics" 
              color={interviewFilter === 'all' ? 'primary' : 'default'}
              variant={interviewFilter === 'all' ? 'filled' : 'outlined'}
              onClick={() => handleFilterChange('all')}
              sx={{ fontWeight: interviewFilter === 'all' ? 'bold' : 'normal' }}
            />
            <Chip 
              label="Saved Questions" 
              icon={<BookmarkIcon fontSize="small" />}
              color={interviewFilter === 'saved' ? 'primary' : 'default'}
              variant={interviewFilter === 'saved' ? 'filled' : 'outlined'}
              onClick={() => handleFilterChange('saved')}
              sx={{ fontWeight: interviewFilter === 'saved' ? 'bold' : 'normal' }}
            />
            
            {/* Show all topic areas */}
            {interviewTopics && interviewTopics.map((topic) => (
              <Chip 
                key={topic.topicName}
                label={topic.topicName}
                color={interviewFilter === topic.topicName ? 'primary' : 'default'}
                variant={interviewFilter === topic.topicName ? 'filled' : 'outlined'}
                onClick={() => handleFilterChange(topic.topicName)}
                sx={{ fontWeight: interviewFilter === topic.topicName ? 'bold' : 'normal' }}
              />
            ))}
          </Box>
        </Paper>
  
        {interviewQuestionsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : interviewQuestions.length === 0 || (interviewQuestions.length === 1 && interviewQuestions[0].id === "emergency-0") ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" paragraph>
              {interviewQuestions.length === 0 
                ? "No interview questions are available." 
                : "There was an error generating interview questions."}
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => confirmRegenerateQuestions()}
              startIcon={<RefreshIcon />}
            >
              Generate Questions
            </Button>
          </Paper>
        ) : (
          <Box>
            {filteredQuestions.map((question, index) => (
              <Card key={question.id} sx={{ 
                mb: 3, 
                boxShadow: question.saved ? '0 0 0 2px rgba(63, 81, 181, 0.5)' : 'default',
                transition: 'box-shadow 0.3s ease'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        label={question.topicName} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                      <Chip 
                        label={question.difficulty ? formatText(question.difficulty) : 'Advanced'} 
                        size="small" 
                        color={
                          question.difficulty?.toLowerCase() === 'basic' ? 'success' : 
                          question.difficulty?.toLowerCase() === 'intermediate' ? 'warning' : 
                          'error'
                        } 
                        variant="outlined"
                      />
                      {question.type && (
                        <Chip 
                          label={formatText(question.type)} 
                          size="small" 
                          color="default" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={() => handleSaveQuestion(question.id)}
                      color={question.saved ? "primary" : "default"}
                    >
                      {question.saved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                    </IconButton>
                  </Box>
                  
                  <Typography variant="h6" component="h3" gutterBottom>
                    {question.question}
                  </Typography>
                  
                  {showAnswers[question.id] ? (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Sample Answer:
                      </Typography>
                      <Typography variant="body1" component="div">
                        {question.sampleAnswer}
                      </Typography>
                      {question.tips && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255, 243, 224, 0.5)', borderRadius: 1 }}>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                            <LightbulbIcon sx={{ mr: 1, fontSize: 20, color: 'warning.main' }} />
                            Interviewer Tip
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {question.tips}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Button 
                      variant="outlined" 
                      size="small" 
                      sx={{ mt: 2 }} 
                      onClick={() => handleToggleAnswer(question.id)}
                      startIcon={<VisibilityIcon />}
                      disabled={practiceModeActive}
                    >
                      {practiceModeActive ? 'Hidden in practice mode' : 'View sample answer'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  // Ensure we're using this function in the tabs section
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Analysis Results</Typography>
        <Box>
          <Button 
            variant="outlined" 
            onClick={toggleJobDescriptionDialog} 
            startIcon={<VisibilityIcon />}
            sx={{ mr: 2 }}
          >
            View Job Description
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleBackToDashboard} 
            sx={{ mr: 2 }}
          >
            Back to Dashboard
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveReport}
            disabled={saving}
            sx={{ mr: 2 }}
          >
            {saving ? 'Saving...' : 'Save Report'}
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            startIcon={<QuizIcon />}
            onClick={() => navigate('/practice-quiz', { state: { jobDescription } })}
          >
            Practice Quiz
          </Button>
        </Box>
      </Box>
      
      {/* Score Overview */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="h6" gutterBottom>Quiz Performance</Typography>
              <Box sx={{ height: 150, width: 150, position: 'relative' }}>
                <Doughnut data={quizData} options={doughnutOptions} />
                <Box sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <Typography variant="h4" color={quizFeedback.percentage === 0 ? "error.main" : "primary.main"}>
                    {quizResults?.score || 0}/{quizResults?.totalQuestions || 0}
                  </Typography>
                </Box>
              </Box>
              {quizFeedback.percentage === 0 && (
                <Typography variant="caption" color="error" sx={{ mt: 1, fontWeight: 'bold' }}>
                  Needs improvement!
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="h6" gutterBottom>Skills Match</Typography>
              <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ width: '100%', mt: 2 }}>
                  <Box sx={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={analysis.skillsMatchPercentage || 0} 
                      sx={{ 
                        height: 20, 
                        borderRadius: 5,
                        backgroundColor: 'rgba(211, 211, 211, 0.5)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: 'rgba(54, 162, 235, 0.8)',
                          borderRadius: 5
                        }
                      }}
                    />
                    <Box sx={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      right: 0, 
                      bottom: 0, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Typography variant="body2" fontWeight="bold" color="white">
                        {analysis.skillsMatchPercentage || 0}%
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Low Match</Typography>
                    <Typography variant="body2" color="text.secondary">High Match</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="h6" gutterBottom>Overall Compatibility</Typography>
              <Box sx={{ height: 150, width: 150, position: 'relative' }}>
                <Doughnut data={compatibilityData} options={doughnutOptions} />
                <Box sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <Typography variant="h4" color={analysis.score < 40 ? "error.main" : "primary.main"}>
                    {analysis.score || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    out of 100
                  </Typography>
                </Box>
              </Box>
              {quizFeedback.percentage === 0 && analysis.score < 60 && (
                <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                  Quiz score impacted compatibility
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
        
        {quizFeedback.percentage === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Improving your performance on the technical quiz can significantly increase your overall compatibility score.
          </Alert>
        )}
      </Paper>
      
      {/* Tabs */}
      <Box sx={{ mb: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="scrollable" 
          scrollButtons="auto"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              minWidth: 'auto',
              fontWeight: 'medium',
              fontSize: '0.9rem'
            }
          }}
        >
          <Tab label="Summary" icon={<StarIcon />} iconPosition="start" />
          <Tab label="Skills Analysis" icon={<CodeIcon />} iconPosition="start" />
          <Tab label="Learning Path" icon={<TrendingUpIcon />} iconPosition="start" />
          <Tab label="Quiz Results" icon={<SchoolIcon />} iconPosition="start" />
          <Tab label="Interview Questions" icon={<QuizIcon />} iconPosition="start" />
        </Tabs>
      </Box>
      
      {/* Tab Content */}
      <Box mt={3}>
      {activeTab === 0 && (
        <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Executive Summary</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <div dangerouslySetInnerHTML={{ __html: analysis.summary }} />
          
            {/* Category Scores */}
            <Paper elevation={2} sx={{ p: 3, mt: 4, borderRadius: 2, bgcolor: 'background.paper' }}>
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>Assessment Categories</Typography>
                
              </Box>
              
              <Grid container spacing={2}>
                {analysis.categoryScores && Object.entries(analysis.categoryScores).map(([category, score], index) => {
                  // Format the category name
                  const formattedCategory = category
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase());
                  
                  // Get category weight for display
                  const getCategoryWeight = (category) => {
                    switch(category) {
                      case 'technicalSkills': return '25%';
                      case 'experience': return '20%';
                      case 'education': return '15%';
                      case 'quizPerformance': return '30%';
                      case 'careerTrajectory': return '10%';
                      default: return '';
                    }
                  };
                  
                  // Determine color based on score
                  const getColor = (score) => {
                    if (score >= 80) return 'success';
                    if (score >= 60) return 'primary';
                    if (score >= 40) return 'warning';
                    return 'error';
                  };
                  
                  // Special case for Quiz Performance
                  const displayScore = category === 'quizPerformance' 
                    ? (quizResults?.score || 0) * 10 
                    : score;
                  
                  // Special messages for quiz performance
                  const getMessage = (category, displayScore) => {
                    if (category === 'quizPerformance') {
                      // Use the actual quiz score directly from quizResults
                      const quizScorePercent = quizResults?.score && quizResults?.totalQuestions 
                        ? Math.round((quizResults.score / quizResults.totalQuestions) * 100)
                        : 0;
                      
                      if (quizScorePercent === 0) return "Needs significant improvement";
                      if (quizScorePercent < 30) return "Beginner level";
                      if (quizScorePercent < 50) return "Needs improvement";
                      if (quizScorePercent < 70) return "Intermediate level";
                      if (quizScorePercent < 90) return "Advanced level";
                      return "Expert level";
                    }
                    return null;
                  };

                  const message = getMessage(category, displayScore);
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        boxShadow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        height: '100%'
                      }}>
                        <Box sx={{ mb: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {formattedCategory}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Weight: {getCategoryWeight(category)}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ 
                          position: 'relative', 
                          width: 80, 
                          height: 80, 
                          borderRadius: '50%', 
                          bgcolor: `${getColor(displayScore)}.light`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 1
                        }}>
                          <Typography variant="h5" sx={{ fontWeight: 'bold', color: `${getColor(displayScore)}.dark` }}>
                            {Math.round(displayScore)}
                          </Typography>
                        </Box>
                        
                        <LinearProgress 
                          variant="determinate" 
                          value={displayScore} 
                          sx={{ 
                            width: '100%', 
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: `${getColor(displayScore)}.main`,
                            }
                          }} 
                        />
                        
                        {message && (
                          <Typography variant="caption" sx={{ mt: 1, color: `${getColor(displayScore)}.dark` }}>
                            {message}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>

              {quizFeedback.percentage === 0 && (
                <Alert severity="warning" sx={{ mt: 3 }}>
                  Your quiz score of 0/10 has significantly impacted your overall compatibility score. Improving your performance on technical assessments will greatly increase your match percentage.
                </Alert>
              )}
            </Paper>
            
            {/* Strengths and Weaknesses */}
          {strengthsWeaknesses && (
            <Grid container spacing={3} sx={{ mt: 3 }}>
              <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 3, bgcolor: 'success.50', borderRadius: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', color: 'success.dark' }}>
                      <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                      Key Strengths
                    </Typography>
                    <List>
                      {strengthsWeaknesses.strengths.map((strength, index) => (
                        <ListItem key={index} sx={{ pl: 0 }}>
                          <ListItemIcon sx={{ minWidth: '36px' }}>
                            <CheckCircleIcon fontSize="small" color="success" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={strength} 
                            primaryTypographyProps={{ fontWeight: index < 2 ? 'bold' : 'normal' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 3, bgcolor: 'error.50', borderRadius: 2, height: '100%' }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', color: 'error.dark' }}>
                      <TrendingUpIcon sx={{ mr: 1, color: 'error.main' }} />
                      Areas for Growth
                    </Typography>
                    <List>
                      {strengthsWeaknesses.weaknesses.map((weakness, index) => (
                        <ListItem key={index} sx={{ pl: 0 }}>
                          <ListItemIcon sx={{ minWidth: '36px' }}>
                            <TrendingUpIcon fontSize="small" color="error" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={weakness}
                            primaryTypographyProps={{ fontWeight: index < 2 ? 'bold' : 'normal' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Paper>
      )}
      
      {activeTab === 1 && (
        <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" sx={{ 
              mb: 2, 
              fontWeight: 600,
              background: 'linear-gradient(45deg, #3f51b5 30%, #2196f3 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Skills Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your skills profile compared to job requirements
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3} sx={{ minHeight: { xs: 'auto', md: '350px' } }}>
            {/* Skill Match Radar Chart */}
            <Grid item xs={12} lg={6}>
              <Paper elevation={3} sx={{ 
                p: 3, 
                borderRadius: 2,
                background: 'linear-gradient(to bottom, #ffffff, #f9faff)',
                boxShadow: '0 8px 16px rgba(63, 81, 181, 0.08)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 20px rgba(63, 81, 181, 0.12)'
                }
              }}>
                <Typography variant="h6" sx={{ 
                  mb: 2, 
                  textAlign: 'center', 
                  fontSize: { xs: '0.95rem', sm: '1.1rem' },
                  fontWeight: 600,
                  color: 'primary.main' 
                }}>
                  Skills Relevance vs. Match
                </Typography>
                <Box sx={{ 
                  height: { xs: 250, sm: 300 }, 
                  mb: 2, 
                  maxWidth: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  {skillsData && (
                    <Radar 
                      data={skillsData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        scales: {
                          r: {
                            min: 0,
                            max: 100,
                            angleLines: {
                              color: 'rgba(0, 0, 0, 0.1)',
                            },
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)',
                            },
                            ticks: {
                              stepSize: 20,
                              font: {
                                size: 10
                              }
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              boxWidth: 10,
                              font: {
                                size: 11
                              }
                            }
                          }
                        }
                      }}
                    />
                  )}
                </Box>
              </Paper>
            </Grid>
            
            {/* Category Scores Radar Chart */}
            <Grid item xs={12} lg={6}>
              <Paper elevation={3} sx={{ 
                p: 3, 
                borderRadius: 2,
                background: 'linear-gradient(to bottom, #ffffff, #f9faff)',
                boxShadow: '0 8px 16px rgba(63, 81, 181, 0.08)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 20px rgba(63, 81, 181, 0.12)'
                }
              }}>
                <Typography variant="h6" sx={{ 
                  mb: 2, 
                  textAlign: 'center', 
                  fontSize: { xs: '0.95rem', sm: '1.1rem' },
                  fontWeight: 600,
                  color: 'primary.main'
                }}>
                  Performance by Category
                </Typography>
                <Box sx={{ 
                  height: { xs: 250, sm: 300 }, 
                  mb: 2, 
                  maxWidth: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  {categoryScoresData && (
                    <Radar 
                      data={categoryScoresData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        scales: {
                          r: {
                            min: 0,
                            max: 100,
                            angleLines: {
                              color: 'rgba(0, 0, 0, 0.1)',
                            },
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)',
                            },
                            ticks: {
                              stepSize: 20,
                              font: {
                                size: 10
                              }
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            display: false
                          }
                        }
                      }}
                    />
                  )}
                </Box>
              </Paper>
            </Grid>
            
            {/* Top Skills Gap Chart */}
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ 
                p: 3, 
                borderRadius: 2, 
                mt: 2,
                background: 'linear-gradient(to bottom, #ffffff, #f9faff)',
                boxShadow: '0 8px 16px rgba(63, 81, 181, 0.08)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 20px rgba(63, 81, 181, 0.12)'
                }
              }}>
                <Typography variant="h6" sx={{ 
                  mb: 2, 
                  textAlign: 'center', 
                  fontSize: { xs: '0.95rem', sm: '1.1rem' },
                  fontWeight: 600,
                  color: 'primary.main'
                }}>
                  Top Skills Gaps
                </Typography>
                <Box sx={{ 
                  height: { xs: 250, sm: 300, md: 320 }, 
                  mb: 2,
                  maxWidth: '95%',
                  mx: 'auto'
                }}>
                  {gapChartData && (
                    <Bar
                      data={gapChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        scales: {
                          x: {
                            grid: {
                              display: false,
                            },
                            ticks: {
                              font: {
                                size: 10
                              }
                            }
                          },
                          y: {
                            beginAtZero: true,
                            max: 100,
                            grid: {
                              color: 'rgba(0, 0, 0, 0.04)',
                              borderDash: [2, 4],
                            },
                            ticks: {
                              font: {
                                size: 10
                              }
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              boxWidth: 10,
                              font: {
                                size: 11
                              }
                            }
                          }
                        }
                      }}
                    />
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Skills Gap Analysis Table */}
          <Box sx={{ textAlign: 'center', mt: 5, mb: 3 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: 'primary.main',
              display: 'inline-block',
              position: 'relative',
              '&:after': {
                content: '""',
                position: 'absolute',
                width: '60%',
                height: '3px',
                bottom: '-8px',
                left: '20%',
                backgroundColor: 'primary.main',
                opacity: 0.6,
                borderRadius: '2px'
              }
            }}>
              Skills Gap Analysis
            </Typography>
          </Box>
          
          <Box sx={{ 
            overflowX: 'auto', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
            borderRadius: 2,
            background: 'white'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ 
                  background: 'linear-gradient(90deg, #3f51b5 0%, #2196f3 100%)'
                }}>
                  <th style={{ padding: '14px', textAlign: 'left', color: 'white', fontWeight: 600 }}>Skill</th>
                  <th style={{ padding: '14px', textAlign: 'center', color: 'white', fontWeight: 600 }}>Job Relevance</th>
                  <th style={{ padding: '14px', textAlign: 'center', color: 'white', fontWeight: 600 }}>Your Match</th>
                  <th style={{ padding: '14px', textAlign: 'center', color: 'white', fontWeight: 600 }}>Gap</th>
                  <th style={{ padding: '14px', textAlign: 'left', color: 'white', fontWeight: 600 }}>Priority</th>
                </tr>
              </thead>
              <tbody>
              {analysis.skillsAnalysis && analysis.skillsAnalysis.map((skill, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9ff' }}>
                    <td style={{ padding: '14px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>{skill.skill}</td>
                    <td style={{ padding: '14px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={skill.relevance} 
                            sx={{ 
                              height: 8, 
                              borderRadius: 5,
                              backgroundColor: 'rgba(54, 162, 235, 0.2)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: 'rgba(54, 162, 235, 0.8)'
                              }
                            }} 
                          />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                          <Typography variant="body2" fontWeight="medium" color="primary.main">{`${Math.round(skill.relevance)}%`}</Typography>
                        </Box>
                      </Box>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={skill.match} 
                            sx={{ 
                              height: 8, 
                              borderRadius: 5,
                              backgroundColor: 'rgba(75, 192, 192, 0.2)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: 'rgba(75, 192, 192, 0.8)'
                              }
                            }} 
                          />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                          <Typography variant="body2" fontWeight="medium" color="success.main">{`${Math.round(skill.match)}%`}</Typography>
                        </Box>
                      </Box>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                      <Chip 
                        label={`${Math.round(skill.gap)}%`} 
                        color={skill.gap > 50 ? "error" : skill.gap > 25 ? "warning" : "success"} 
                        size="small" 
                        sx={{ fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                      />
                    </td>
                    <td style={{ padding: '14px', borderBottom: '1px solid #eee' }}>
                    {skill.gap > 50 && skill.relevance > 70 ? (
                      <Chip 
                        label="High" 
                        color="error" 
                        size="small"
                        sx={{ fontWeight: 'medium', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                      />
                    ) : skill.gap > 30 && skill.relevance > 50 ? (
                      <Chip 
                        label="Medium" 
                        color="warning" 
                        size="small"
                        sx={{ fontWeight: 'medium', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                      />
                    ) : (
                      <Chip 
                        label="Low" 
                        color="success" 
                        size="small"
                        sx={{ fontWeight: 'medium', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                      />
                    )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        
        <Divider sx={{ my: 5, opacity: 0.6 }} />          
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            color: 'primary.main',
            display: 'inline-block',
            position: 'relative',
            '&:after': {
              content: '""',
              position: 'absolute',
              width: '60%',
              height: '3px',
              bottom: '-8px',
              left: '20%',
              backgroundColor: 'primary.main',
              opacity: 0.6,
              borderRadius: '2px'
            }
          }}>
            Comprehensive Analysis
          </Typography>
        </Box>
        <Paper elevation={3} sx={{ 
          p: 4, 
          borderRadius: 2, 
          bgcolor: 'background.paper',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          border: '1px solid #f0f0f0'
        }}>
          {analysisLoading ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              py: 5,
              background: 'linear-gradient(to bottom, rgba(63, 81, 181, 0.03), rgba(63, 81, 181, 0.06))',
              borderRadius: 2
            }}>
              <CircularProgress size={48} sx={{ color: 'primary.main' }} />
              <Typography variant="body1" color="text.secondary" sx={{ mt: 3, fontWeight: 500 }}>
                Generating comprehensive analysis...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ 
              '.skills-analysis': {
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              },
              '& h3': { 
                background: 'linear-gradient(45deg, #3f51b5 30%, #2196f3 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '1.1rem', 
                fontWeight: 600,
                mb: 1,
                pb: 0.5,
                borderBottom: '1px solid',
                borderColor: 'divider'
              },
              '& ul': { 
                pl: 3,
                mb: 0,
                mt: 0.5,
                '& > li': {
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: '-20px',
                    top: '10px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'primary.light',
                    borderRadius: '50%'
                  }
                }
              },
              '& li': { 
                py: 0.5,
                '&::marker': {
                  color: 'transparent'
                }
              },
              '& p': {
                my: 0.5,
                lineHeight: 1.6,
                fontSize: '0.95rem',
                color: 'text.secondary',
                fontWeight: 500
              }
            }}>
              <div dangerouslySetInnerHTML={{ 
                __html: comprehensiveAnalysis || 
                '<div class="skills-analysis"><h3>Key Skill Matches</h3><ul><li>Technical skills evaluation</li><li>Data analysis experience</li><li>Problem-solving abilities</li></ul><h3>Career Path Potential</h3><p>This role provides a foundation for growth in data analysis and technical project management.</p><h3>Priority Growth Areas</h3><ul><li>Data visualization techniques</li><li>Industry-specific analytical tools</li><li>Technical report preparation</li></ul></div>' 
              }} />
            </Box>
          )}
        </Paper>
      </Paper>
    )}
        
        {activeTab === 2 && (
          <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>Learning Path & Resources</Typography>
          <Divider sx={{ mb: 3 }} />
          
            {/* Roadmap Timeline */}
            <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
              
              
              
              
              {analysis.learningRoadmap ? (
                <Box sx={{ mt: 4, position: 'relative' }}>
                  {/* Timeline line */}
                  <Box sx={{ 
                    position: 'absolute', 
                    left: '20px',
                    top: 0, 
                    bottom: 0, 
                    width: '4px', 
                    bgcolor: 'primary.light',
                    zIndex: 0 
                  }} />
                  
                  {/* Parse the HTML content and render it inside our styled timeline */}
                  <Box sx={{ 
                    pl: 7, // Padding to accommodate the timeline and dots
                    '& h2': { // Style all h2 headers in the roadmap 
                      color: 'primary.main',
                      mt: 5,
                      mb: 3,
                      position: 'relative'
                    },
                    '& h3': { // Style all h3 headers in the roadmap
                      position: 'relative',
                      mb: 2,
                      mt: 4,
                      '&::before': { // Timeline dot for each section
                        content: '""',
                        position: 'absolute',
                        left: -53,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        zIndex: 1
                      }
                    },
                    '& ul': { // Style lists
                      pl: 2,
                      mt: 2,
                      mb: 3
                    },
                    '& li': { // Style list items
                      mb: 1.5
                    },
                    '& a': { // Style links
                      color: 'primary.main',
                      textDecoration: 'none',
                      fontWeight: 'medium',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }
                  }}>
                    <div dangerouslySetInnerHTML={{ __html: analysis.learningRoadmap }} />
                  </Box>
                </Box>
              ) : (
                <Box sx={{ position: 'relative', mt: 4 }}>
                  <Box sx={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: 0, 
                    bottom: 0, 
                    width: '4px', 
                    bgcolor: 'primary.light',
                    zIndex: 0
                  }} />
                  
                  <Box sx={{ ml: 5, position: 'relative' }}>
                    {[
                      { 
                        weeks: "1-2", 
                        title: "JavaScript Fundamentals",
                        items: [
                          "Complete the 'JavaScript Algorithms and Data Structures' course on freeCodeCamp",
                          "Work on small coding exercises to practice JavaScript concepts"
                        ]
                      },
                      { 
                        weeks: "3-4", 
                        title: "React Development",
                        items: [
                          "Take the 'React - The Complete Guide' course on Udemy",
                          "Build a simple React application using create-react-app",
                          "Explore React Router and Redux for state management"
                        ]
                      },
                      { 
                        weeks: "5-6", 
                        title: "Node.js and Express.js",
                        items: [
                          "Complete the 'Node.js - The Complete Guide' course on Udemy",
                          "Build a RESTful API using Node.js and Express.js",
                          "Integrate MongoDB for data storage"
                        ]
                      },
                      { 
                        weeks: "7-8", 
                        title: "AWS and Cloud Computing",
                        items: [
                          "Take the 'AWS Certified Solutions Architect - Associate' course on Udemy",
                          "Deploy a Node.js application on AWS EC2",
                          "Explore AWS services like S3, Lambda, and DynamoDB"
                        ]
                      },
                      { 
                        weeks: "9-10", 
                        title: "Docker and CI/CD",
                        items: [
                          "Complete the 'Docker and Kubernetes: The Complete Guide' course on Udemy",
                          "Containerize a Node.js application using Docker",
                          "Set up a CI/CD pipeline using GitLab CI/CD"
                        ]
                      },
                      { 
                        weeks: "11-12", 
                        title: "Full-Stack Project",
                        items: [
                          "Build a full-stack web application using React, Node.js, MongoDB, and AWS",
                          "Implement user authentication and authorization",
                          "Deploy the application on AWS using CI/CD pipelines"
                        ]
                      }
                    ].map((phase, index) => (
                      <Box key={index} sx={{ mb: 4, position: 'relative' }}>
                        {/* Timeline dot */}
                        <Box sx={{ 
                          position: 'absolute', 
                          left: '-42px', 
                          top: '16px', 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '50%', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          zIndex: 1
                        }}>
                          {index + 1}
                        </Box>
                        
                        <Paper 
                          elevation={1} 
                          sx={{ 
                            p: 2, 
                            borderLeft: '4px solid', 
                            borderColor: 'primary.main',
                            ml: 2
                          }}
                        >
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                            Week {phase.weeks}: {phase.title}
                          </Typography>
                          
                          <List dense disablePadding>
                            {phase.items.map((item, itemIndex) => (
                              <ListItem key={itemIndex} sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  <ArrowRightIcon color="primary" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={item} />
                              </ListItem>
                            ))}
                          </List>
                        </Paper>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
            
            {/* Recommendations */}
            <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
              
            <div dangerouslySetInnerHTML={{ __html: analysis.recommendations }} />
            </Paper>
            
            {/* Learning Resources */}
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} />

              </Typography>
            <div dangerouslySetInnerHTML={{ __html: analysis.learningResources }} />
            </Paper>
          </Paper>
        )}
        
        {activeTab === 3 && (
          <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">Quiz Results</Typography>
              
              {quizResults && (
            <Box>
                  <Chip 
                    label={`Score: ${quizResults.score || 0}/${quizResults.totalQuestions || 10}`}
                    color="primary"
                    sx={{ fontWeight: 'bold', mr: 1 }}
                  />
                  <Chip 
                    label={`${Math.round((quizResults.score / (quizResults.totalQuestions || 10)) * 100)}%`}
                    color={
                      ((quizResults.score / (quizResults.totalQuestions || 10)) >= 0.7) ? 'success' :
                      ((quizResults.score / (quizResults.totalQuestions || 10)) >= 0.5) ? 'primary' :
                      ((quizResults.score / (quizResults.totalQuestions || 10)) >= 0.3) ? 'warning' : 'error'
                    }
                    sx={{ fontWeight: 'bold' }}
                  />
            </Box>
          )}
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <Alert 
              severity={quizFeedback.color} 
              sx={{ mb: 3, fontWeight: quizFeedback.percentage === 0 ? 'bold' : 'normal' }}
            >
              {quizFeedback.text}
            </Alert>
            
            {quizFeedback.percentage === 0 && (
              <Alert 
                severity="info" 
                sx={{ mb: 3 }}
              >
                Note: A score of 0 will significantly reduce your overall job compatibility. Improving your technical skills will help increase your match percentage.
              </Alert>
            )}
            
            {quizResults && quizResults.questions && quizResults.questions.map((question, index) => {
              if (!quizResults.feedback || !quizResults.feedback[index]) return null;
              return renderQuizQuestion(question, quizResults.feedback[index], index);
            })}
        </Paper>
      )}
        
        {activeTab === 4 && renderInterviewQuestionsTab()}
      </Box>
      
      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={closeSaveDialog}>
        <DialogTitle>Save Analysis Report</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph sx={{ mt: 1 }}>
            Give your report a title so you can easily find it later.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            id="report-title"
            label="Report Title"
            type="text"
            fullWidth
            variant="outlined"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeSaveDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveWithTitle} 
            variant="contained"
            disabled={!reportTitle.trim()}
          >
            Save Report
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Regenerate Confirmation Dialog */}
      <Dialog open={regenerateConfirmOpen} onClose={() => setRegenerateConfirmOpen(false)}>
        <DialogTitle>Generate New Questions?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph sx={{ mt: 1 }}>
            This will replace all current interview questions with new ones. 
            {savedQuestions.length > 0 && ` Your ${savedQuestions.length} saved questions will be preserved.`}
          </Typography>
          <Typography variant="body2" color="warning.main">
            Unsaved questions will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmRegenerateQuestions} 
            variant="contained"
            color="primary"
          >
            Generate New Questions
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Job Description Preview Dialog */}
      <Dialog
        open={jobDescriptionDialogOpen}
        onClose={toggleJobDescriptionDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Job Description</Typography>
          <IconButton onClick={toggleJobDescriptionDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Paper sx={{ p: 3, maxHeight: '60vh', overflow: 'auto' }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {jobDescription}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={toggleJobDescriptionDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Results;