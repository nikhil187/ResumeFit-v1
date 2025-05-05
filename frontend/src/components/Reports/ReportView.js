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
  IconButton,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getReport, deleteReport } from '../../services/mongoDb';
import { Radar, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
} from 'chart.js';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import StarIcon from '@mui/icons-material/Star';
import SchoolIcon from '@mui/icons-material/School';
import WorkIcon from '@mui/icons-material/Work';
import CodeIcon from '@mui/icons-material/Code';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QuizIcon from '@mui/icons-material/Quiz';
import FilterListIcon from '@mui/icons-material/FilterList';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';

// Register ChartJS components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
);

function ReportView() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [skillsData, setSkillsData] = useState(null);
  const [strengthsWeaknesses, setStrengthsWeaknesses] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showAnswers, setShowAnswers] = useState({});
  const [interviewFilter, setInterviewFilter] = useState('all');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!currentUser || !currentUser.uid) {
          throw new Error('You must be logged in to view reports');
        }
        
        console.log("Fetching report with ID:", reportId);
        const reportData = await getReport(currentUser.uid, reportId);
        console.log("Retrieved report data:", reportData);
        
        if (reportData && reportData.report) {
          const report = reportData.report;
          
          // Debug the quiz results structure
          console.log("Raw Quiz Results:", JSON.stringify(report.quizResults, null, 2));
          
          // Ensure quiz results are properly formatted for rendering
          if (report.quizResults && report.quizResults.answers) {
            console.log("Quiz answers before processing:", report.quizResults.answers);
            
            // Process quiz answers
            report.quizResults.answers = report.quizResults.answers.map((answer, index) => {
              // Parse answer if it's a stringified object
              let processedAnswer = answer;
              if (typeof answer === 'string') {
                try {
                  processedAnswer = JSON.parse(answer);
                } catch (e) {
                  console.error("Failed to parse answer:", e);
                }
              }
              
              // Parse options if they're stored as string
              let options = processedAnswer.options || [];
              if (typeof options === 'string') {
                try {
                  options = JSON.parse(options);
                } catch (e) {
                  console.error("Failed to parse options:", e);
                  options = [];
                }
              }
              
              // Critical fix: Ensure selectedAnswer is properly handled for null/0 values
              const selectedAnswer = processedAnswer.selectedAnswer === 0 ? 0 : (processedAnswer.selectedAnswer || null);
              const hasSelection = selectedAnswer !== null && selectedAnswer !== undefined;
              
              console.log(`Processing answer ${index}:`, {
                original: processedAnswer,
                extractedCategory: processedAnswer.category || 'Technical',
                parsedOptions: options,
                selectedAnswer: selectedAnswer,
                hasSelection: hasSelection
              });
              
              return {
                ...processedAnswer,
                questionNumber: processedAnswer.questionNumber || (index + 1),
                questionId: processedAnswer.questionId || index,
                category: processedAnswer.category || 'Technical',
                difficulty: processedAnswer.difficulty || 'Intermediate',
                options: options,
                selectedAnswer: selectedAnswer,
                correctAnswer: processedAnswer.correctAnswer !== undefined ? processedAnswer.correctAnswer : null,
                isCorrect: hasSelection && selectedAnswer === processedAnswer.correctAnswer,
                explanation: processedAnswer.explanation || 'No explanation available'
              };
            });
            
            console.log("Processed quiz answers:", report.quizResults.answers);
          }
          
          // Restore visualization data if available
          if (report.visualizationData) {
            if (report.visualizationData.skillsData) {
              setSkillsData(report.visualizationData.skillsData);
            }
            if (report.visualizationData.categoryScoresData) {
              // Use this for rendering charts directly
              console.log("Using stored category scores data for charts");
            }
          }
          
          setReport(report);
          
          // Extract skills data and strengths/weaknesses if analysis exists
          if (report.analysis) {
            // Only extract if not already available from visualizationData
            if (!report.visualizationData?.skillsData) {
              extractSkillsData(report.analysis);
            }
            extractStrengthsWeaknesses(report.analysis);
            
            if (!report.visualizationData?.skillsData && report.analysis.skillsAnalysis) {
              prepareSkillsChartData(report.analysis);
            }
          }
          
          // Log specific sections to debug what's available
          console.log("Interview Questions:", report.savedInterviewQuestions);
          console.log("Quiz Results:", report.quizResults);
          console.log("Analysis:", report.analysis);
        } else {
          throw new Error('Invalid report data structure');
        }
      } catch (error) {
        console.error('Error fetching report:', error);
        setError(error.message || 'Failed to load report');
        showNotification('Failed to load report: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReport();
  }, [reportId, currentUser, showNotification]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleBackToReports = () => {
    navigate('/reports');
  };
  
  const handleDeleteReport = async () => {
    if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      try {
        setDeleting(true);
        await deleteReport(currentUser.uid, reportId);
        showNotification('Report deleted successfully', 'success');
        navigate('/reports');
      } catch (error) {
        console.error('Error deleting report:', error);
        showNotification('Failed to delete report: ' + error.message, 'error');
        setDeleting(false);
      }
    }
  };
  
  // Toggle showing/hiding sample answers
  const handleToggleAnswer = (id) => {
    setShowAnswers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Function to extract skills data from analysis text
  const extractSkillsData = (analysis) => {
    if (!analysis || !analysis.analysis) return;
    
    // Use AI-generated analysis to extract skills
    const analysisText = analysis.analysis;
    
    // Example skills extraction
    const skillsRegex = /skills?|technologies?|languages?|frameworks?|tools?/gi;
    const paragraphs = analysisText.split('</p>');
    
    let skillsList = [];
    let skillScores = [];
    
    paragraphs.forEach(para => {
      if (para.match(skillsRegex)) {
        // Extract skills mentioned in this paragraph
        const skills = para.match(/\b([A-Za-z]+(?:\.[A-Za-z]+)*)\b/g);
        if (skills) {
          skills.forEach(skill => {
            // Filter out common words and HTML tags
            if (skill.length > 2 && 
                !['the', 'and', 'for', 'with', 'has', 'div', 'span', 'class'].includes(skill.toLowerCase())) {
              if (!skillsList.includes(skill)) {
                skillsList.push(skill);
                // Generate a score between 60-100 for demonstration
                skillScores.push(Math.floor(Math.random() * 40) + 60);
              }
            }
          });
        }
      }
    });
    
    // Limit to top 8 skills for better visualization
    if (skillsList.length > 8) {
      skillsList = skillsList.slice(0, 8);
      skillScores = skillScores.slice(0, 8);
    }
    
    setSkillsData({
      labels: skillsList,
      datasets: [
        {
          label: 'Skill Proficiency',
          data: skillScores,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    });
  };
  
  // Function to prepare skills chart data from skillsAnalysis
  const prepareSkillsChartData = (analysis) => {
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
  
  // Function to extract strengths and weaknesses
  const extractStrengthsWeaknesses = (analysis) => {
    if (!analysis) return;
    
    // Use the strengths and areasForGrowth directly from the API response if available
    if (analysis.strengths && analysis.areasForGrowth) {
      setStrengthsWeaknesses({
        strengths: analysis.strengths,
        weaknesses: analysis.areasForGrowth
      });
      return;
    }
    
    // Fallback to text extraction if the direct fields aren't available
    const analysisText = analysis.analysis || '';
    
    // Extract strengths
    const strengthsRegex = /<strong>Strengths:<\/strong>|<h4>Strengths:<\/h4>|<h3>Strengths:<\/h3>/i;
    const strengthsMatch = analysisText.split(strengthsRegex);
    
    let strengths = [];
    if (strengthsMatch && strengthsMatch.length > 1) {
      const strengthsSection = strengthsMatch[1].split(/<\/ul>|<\/ol>|<h3>|<h4>/)[0];
      const strengthItems = strengthsSection.match(/<li>(.*?)<\/li>/g);
      if (strengthItems) {
        strengths = strengthItems.map(item => 
          item.replace(/<li>/, '').replace(/<\/li>/, '').trim()
        );
      }
    }
    
    // Extract weaknesses/areas for growth
    const weaknessesRegex = /<strong>Areas for Growth:<\/strong>|<strong>Weaknesses:<\/strong>|<h4>Areas for Growth:<\/h4>|<h4>Weaknesses:<\/h4>|<h3>Areas for Growth:<\/h3>|<h3>Weaknesses:<\/h3>/i;
    const weaknessesMatch = analysisText.split(weaknessesRegex);
    
    let weaknesses = [];
    if (weaknessesMatch && weaknessesMatch.length > 1) {
      const weaknessesSection = weaknessesMatch[1].split(/<\/ul>|<\/ol>|<h3>|<h4>/)[0];
      const weaknessItems = weaknessesSection.match(/<li>(.*?)<\/li>/g);
      if (weaknessItems) {
        weaknesses = weaknessItems.map(item => 
          item.replace(/<li>/, '').replace(/<\/li>/, '').trim()
        );
      }
    }
    
    setStrengthsWeaknesses({ strengths, weaknesses });
  };
  
  // Format text to display properly
  const formatText = (text) => {
    if (!text) return '';
    
    // Remove section titles that might be prepended
    const possibleTitles = [
      'Professional Summary',
      'Detailed Analysis',
      'Recommendations for Improvement',
      'Learning Resources',
      'Learning Resources:',  // Added this variation
      'Learning Roadmap'      // Added this one too
    ];
    
    let cleanedText = text;
    possibleTitles.forEach(title => {
      // Check if text starts with title (case insensitive)
      const regex = new RegExp(`^${title}`, 'i');
      if (regex.test(cleanedText)) {
        cleanedText = cleanedText.substring(title.length).trim();
      }
    });
    
    return cleanedText;
  };
  
  // Add this helper function
  const processSectionContent = (content, sectionTitle) => {
    if (!content) return '';
    
    // Check if content starts with the section title or a variation of it
    const titleRegex = new RegExp(`^<h\\d>\\s*${sectionTitle}\\s*[:\\-]?\\s*</h\\d>`, 'i');
    if (titleRegex.test(content)) {
      return content.replace(titleRegex, '');
    }
    
    return content;
  };
  
  // Alternative approach for HTML-structured content
  const formatRoadmapContent = (content) => {
    if (!content) return '';
    
    // First process the section to remove any title headers
    const processedContent = processSectionContent(content, 'Learning Roadmap');
    
    // Simply return the processed content, preserving the HTML structure
    // This ensures that all HTML tags, including links (a tags), will work as expected
    return processedContent;
  };
  
  // Render the interview questions tab
  const renderInterviewQuestionsTab = () => {
    // Safely access the nested data with optional chaining
    const savedQuestions = report?.savedInterviewQuestions || [];
    const interviewTopics = [];
    
    // Extract unique topic names from the questions to build the topics array
    if (savedQuestions && savedQuestions.length > 0) {
      const uniqueTopics = [...new Set(savedQuestions.map(q => q.topicName))];
      uniqueTopics.forEach(topicName => {
        if (topicName) {
          interviewTopics.push({ topicName });
        }
      });
    }
    
    console.log("Rendering with questions:", savedQuestions);
    console.log("Rendering with topics:", interviewTopics);
    
    // If there are no saved questions, show appropriate message
    if (!savedQuestions || savedQuestions.length === 0) {
      return (
        <Box mt={3}>
          <Typography variant="h5" component="h2" gutterBottom>
            <QuizIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Interview Questions
          </Typography>
          
          <Paper sx={{ p: 3, textAlign: 'center', mt: 3 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              No saved interview questions found in this report.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              When you save interview questions in your analysis, they will appear here.
            </Typography>
          </Paper>
        </Box>
      );
    }
    
    // Continue with regular rendering if questions exist
    const filteredQuestions = savedQuestions.filter(q => {
      if (interviewFilter === 'all') return true;
      return q.topicName === interviewFilter;
    });
    
    return (
      <Box mt={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            <QuizIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Saved Interview Questions
          </Typography>
          {interviewTopics?.length > 0 && (
            <Box>
              <IconButton onClick={(event) => setFilterMenuAnchor(event.currentTarget)}>
                <FilterListIcon />
              </IconButton>
              <Menu
                anchorEl={filterMenuAnchor}
                open={Boolean(filterMenuAnchor)}
                onClose={() => setFilterMenuAnchor(null)}
              >
                <MenuItem onClick={() => {
                  setInterviewFilter('all');
                  setFilterMenuAnchor(null);
                }}>All Questions</MenuItem>
                <Divider />
                {interviewTopics.map(topic => (
                  <MenuItem key={topic.topicName} onClick={() => {
                    setInterviewFilter(topic.topicName);
                    setFilterMenuAnchor(null);
                  }}>
                    {topic.topicName}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          )}
        </Box>
        
        {/* Topic chips display */}
        {interviewTopics?.length > 0 && (
          <Paper sx={{ mb: 3, p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Key Topic Areas {interviewTopics.length > 0 && `(${interviewTopics.length} Topics)`}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, maxHeight: '150px', overflowY: 'auto', pb: 1 }}>
              <Chip 
                label="All Topics" 
                color={interviewFilter === 'all' ? 'primary' : 'default'}
                variant={interviewFilter === 'all' ? 'filled' : 'outlined'}
                onClick={() => setInterviewFilter('all')}
                sx={{ fontWeight: interviewFilter === 'all' ? 'bold' : 'normal' }}
              />
              
              {interviewTopics.map((topic) => (
                <Chip 
                  key={topic.topicName}
                  label={topic.topicName}
                  color={interviewFilter === topic.topicName ? 'primary' : 'default'}
                  variant={interviewFilter === topic.topicName ? 'filled' : 'outlined'}
                  onClick={() => setInterviewFilter(topic.topicName)}
                  sx={{ fontWeight: interviewFilter === topic.topicName ? 'bold' : 'normal' }}
                />
              ))}
            </Box>
          </Paper>
        )}
        
        {/* Display questions */}
        {filteredQuestions.length > 0 ? (
          <Box>
            {filteredQuestions.map((question) => (
              <Card key={question.id} sx={{ 
                mb: 3, 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'box-shadow 0.3s ease'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={question.topicName} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    <Chip 
                      label={question.difficulty} 
                      size="small" 
                      color={
                        question.difficulty.toLowerCase() === 'basic' ? 'success' : 
                        question.difficulty.toLowerCase() === 'intermediate' ? 'warning' : 
                        'error'
                      } 
                      variant="outlined"
                    />
                    {question.type && (
                      <Chip 
                        label={question.type} 
                        size="small" 
                        color="default" 
                        variant="outlined"
                      />
                    )}
                  </Box>
                  
                  <Typography variant="h6" component="h3" gutterBottom>
                    {question.question}
                  </Typography>
                  
                  {showAnswers[question.id] ? (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Sample Answer:
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, maxHeight: '300px', overflowY: 'auto', bgcolor: 'rgba(245, 245, 245, 0.5)' }}>
                        <Typography variant="body1" component="div">
                          {question.sampleAnswer || <Typography color="text.secondary" fontStyle="italic">No sample answer available</Typography>}
                        </Typography>
                      </Paper>
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
                    >
                      View sample answer
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1">No saved interview questions found.</Typography>
          </Paper>
        )}
      </Box>
    );
  };
  
  // Function to render question text with code blocks if present
  const renderQuestionText = (questionText) => {
    if (!questionText) return <Typography>No question available</Typography>;
    
    // Instead of trying to extract code blocks, just render the text directly
    return <Typography variant="body1">{questionText}</Typography>;
  };
  
  // Get color based on question category
  const getCategoryColor = (category) => {
    // Use a fixed color palette regardless of category name
    return '#3f51b5'; // Indigo - consistent color for all categories
  };
  
  // Function to get category weight for display
  const getCategoryWeight = (category) => {
    // First check if the category weights are available from saved visualizationData
    if (report?.visualizationData?.categoryWeights?.[category]) {
      return report.visualizationData.categoryWeights[category] + '%';
    }
    
    // Default weights if not found in saved data
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
  
  // Calculate quiz performance and provide helpful feedback
  const getQuizPerformanceFeedback = () => {
    const quizScore = report.quizResults?.score || 0;
    const maxScore = report.quizResults?.totalQuestions || 10;
    const percentage = (quizScore / maxScore) * 100;
    
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
  
  // Function to reconstruct quiz options based on the known questions
  const reconstructQuizOptions = () => {
    return [
      ["Java", "Python", "C++", "JavaScript"],
      ["Developing hardware solutions", "Creating gaming platforms", "Building cloud-native healthcare services", "Designing mobile applications"],
      ["Developing social media platforms", "Building a healthcare data center", "Creating AI-driven healthcare platforms", "Designing e-commerce websites"],
      ["OpenCV", "PyTorch", "MongoDB", "Generative AI"],
      ["Providing financial services", "Transforming healthcare with technology", "Developing agricultural solutions", "Creating entertainment platforms"],
      ["Rev Cycle & Consumer Organization", "Oracle Health Platform & Production Engineering", "Platform Engineering services", "Hosting and Operations team"],
      ["Proficiency in baking", "Experience in construction management", "Ability to complete coding projects independently", "Expertise in culinary arts"],
      ["Focus on agriculture", "Utilization of generative AI", "Exclusive entertainment services", "Specialization in financial planning"],
      ["Social media platforms", "E-commerce websites", "AI-driven healthcare platforms", "Gaming platforms"],
      ["Providing entertainment services", "Revolutionizing healthcare with technology", "Creating social media platforms", "Developing financial tools"]
    ];
  };
  
  // Function to provide categories for each question based on what we know
  const getQuestionCategories = () => {
    return [
      "Programming Languages",
      "Team Focus",
      "Team Objective",
      "Relevant Technologies",
      "Industry Focus",
      "Team Responsibilities",
      "Job Requirement",
      "Differentiation Factor",
      "Platform Development",
      "Industry Transformation"
    ];
  };
  
  // Add a function to get the radar chart data
  const getRadarChartData = () => {
    // First try to use saved visualization data
    if (report?.visualizationData?.categoryScoresData) {
      console.log("Using saved category scores data for radar chart");
      return report.visualizationData.categoryScoresData;
    }
    
    // Try alternative data format
    if (report?.visualizationData?.performanceByCategory) {
      console.log("Using saved performance by category data");
      return report.visualizationData.performanceByCategory;
    }
    
    // Fallback to generating from analysis
    if (report?.analysis?.categoryScores) {
      return {
        labels: ['Technical Skills', 'Experience', 'Education', 'Quiz Performance', 'Career Trajectory'],
        datasets: [
          {
            label: 'Category Scores',
            data: [
              report.analysis.categoryScores.technicalSkills || 0,
              report.analysis.categoryScores.experience || 0, 
              report.analysis.categoryScores.education || 0,
              report.analysis.categoryScores.quizPerformance || 0,
              report.analysis.categoryScores.careerTrajectory || 0
            ],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          }
        ],
      };
    }
    
    return null;
  };
  
  // Add a function to get the skills chart data
  const getSkillsChartData = () => {
    // First try to use saved visualization data
    if (report?.visualizationData?.skillsData) {
      console.log("Using saved skills data for chart");
      return report.visualizationData.skillsData;
    }
    
    // Try using skills gap analysis if available
    if (report?.visualizationData?.skillsGapAnalysis && report.visualizationData.skillsGapAnalysis.length > 0) {
      console.log("Creating skills chart from skills gap analysis data");
      const skillsData = report.visualizationData.skillsGapAnalysis.slice(0, 8); // Limit to 8 skills for readability
      
      return {
        labels: skillsData.map(item => item.skill),
        datasets: [
          {
            label: 'Job Relevance',
            data: skillsData.map(item => item.relevance),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
          {
            label: 'Your Match',
            data: skillsData.map(item => item.match),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          }
        ],
      };
    }
    
    // Fallback to using the state
    if (skillsData) {
      return skillsData;
    }
    
    // Last fallback: generate from analysis if available
    if (report?.analysis?.skillsAnalysis) {
      console.log("Creating skills chart from analysis.skillsAnalysis");
      const skillsToShow = report.analysis.skillsAnalysis.slice(0, 8); // Limit to 8 skills for readability
      
      return {
        labels: skillsToShow.map(item => item.skill),
        datasets: [
          {
            label: 'Job Relevance',
            data: skillsToShow.map(item => item.relevance),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
          {
            label: 'Your Match',
            data: skillsToShow.map(item => item.match),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          }
        ],
      };
    }
    
    return null;
  };
  
  // Add a function to get the gap chart data
  const getGapChartData = () => {
    // First try to use saved visualization data
    if (report?.visualizationData?.gapChartData) {
      console.log("Using saved gap chart data");
      return report.visualizationData.gapChartData;
    }
    
    // Try alternate saved data format
    if (report?.visualizationData?.skillsGapAnalysis && report.visualizationData.skillsGapAnalysis.length > 0) {
      console.log("Using saved skills gap analysis data");
      // Sort skills by gap size descending
      const sortedSkills = [...report.visualizationData.skillsGapAnalysis].sort((a, b) => b.gap - a.gap);
      const topGapSkills = sortedSkills.slice(0, 5);
      
      return {
        labels: topGapSkills.map(skill => skill.skill),
        datasets: [
          {
            label: 'Job Relevance',
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
    }
    
    // Fallback to generating from analysis
    if (report?.analysis?.skillsAnalysis) {
      // Sort skills by gap size descending to highlight biggest gaps
      const sortedSkills = [...report.analysis.skillsAnalysis].sort((a, b) => b.gap - a.gap);
      const topGapSkills = sortedSkills.slice(0, 5);
      
      return {
        labels: topGapSkills.map(skill => skill.skill),
        datasets: [
          {
            label: 'Job Relevance',
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
    }
    
    return null;
  };
  
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading report...
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
        <Button variant="contained" onClick={handleBackToReports}>
          Back to Reports
        </Button>
      </Container>
    );
  }
  
  if (!report) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Report not found
        </Alert>
        <Button variant="contained" onClick={handleBackToReports}>
          Back to Reports
        </Button>
      </Container>
    );
  }
  
  // Prepare data for the compatibility score gauge
  const compatibilityData = {
    labels: ['Compatible', 'Gap'],
    datasets: [
      {
        data: [report?.analysis?.score || 0, 100 - (report?.analysis?.score || 0)],
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
          report?.quizResults?.score || 0, 
          (report?.quizResults?.totalQuestions || 0) - (report?.quizResults?.score || 0)
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
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">{report.title || 'Report Details'}</Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToReports} 
            sx={{ mr: 2 }}
          >
            Back to Reports
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<QuizIcon />}
            onClick={() => navigate('/practice-quiz', { state: { jobDescription: report.jobDescription } })}
            sx={{ mr: 2 }}
          >
            Practice Quiz
          </Button>
          <Button 
            variant="outlined" 
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteReport}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Report'}
          </Button>
        </Box>
      </Box>
      
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
                  <Typography variant="h4" color="primary">
                    {report.quizResults?.score || 0}/{report.quizResults?.totalQuestions || 0}
                  </Typography>
                </Box>
              </Box>
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
                      value={report.analysis?.skillsMatchPercentage || 0} 
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
                        {report.analysis?.skillsMatchPercentage || 0}%
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
                  <Typography variant="h4" color={report.analysis?.score < 40 ? "error.main" : "primary.main"}>
                    {report.analysis?.score || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    out of 100
                  </Typography>
                </Box>
              </Box>
              {report.analysis?.score < 60 && (
                <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                  Quiz score impacted compatibility
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 3 }}
        >
          <Tab icon={<StarIcon />} label="Summary" />
          <Tab icon={<CodeIcon />} label="Skills Analysis" />
          <Tab icon={<SchoolIcon />} label="Quiz Results" />
          <Tab icon={<TrendingUpIcon />} label="Learning Resources" />
          <Tab icon={<QuizIcon />} label="Interview Questions" />
        </Tabs>
      </Box>
      
      {activeTab === 0 && (
        <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Job Match Overview</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Typography variant="body1" sx={{ mb: 4 }}>
            <div dangerouslySetInnerHTML={{ __html: report.analysis?.summary }} />
          </Typography>
          
          {/* Assessment Categories - Same as in Results.js */}
          {report?.analysis?.categoryScores && (
            <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2, bgcolor: 'background.paper' }}>
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>Assessment Categories</Typography>
              </Box>
              
              <Grid container spacing={2}>
                {Object.entries(report.analysis.categoryScores).map(([category, score], index) => {
                  // Format the category name
                  const formattedCategory = category
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase());
                  
                  // Special case for Quiz Performance
                  const displayScore = category === 'quizPerformance' 
                    ? (report.quizResults?.score || 0) * 10
                    : score;
                  
                  // Special messages for quiz performance
                  const getMessage = (category, displayScore) => {
                    if (category === 'quizPerformance') {
                      // Use the actual quiz score directly from quizResults
                      const quizScorePercent = report.quizResults?.score && report.quizResults?.totalQuestions 
                        ? Math.round((report.quizResults.score / report.quizResults.totalQuestions) * 100)
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

              {report.quizResults?.score === 0 && (
                <Alert severity="warning" sx={{ mt: 3 }}>
                  Your quiz score of 0/10 has significantly impacted your overall compatibility score. Improving your performance on technical assessments will greatly increase your match percentage.
                </Alert>
              )}
            </Paper>
          )}
          
          {/* Strengths and Weaknesses Section */}
          {strengthsWeaknesses && (
            <Grid container spacing={3} sx={{ mt: 3, mb: 4 }}>
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
          <Typography variant="h5" sx={{ mb: 2 }}>Skills Analysis</Typography>
          <Divider sx={{ mb: 3 }} />
          
          {/* Skills Relevance vs Match section */}
          {skillsData && (
            <Box sx={{ mb: 5 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Skills Relevance vs. Match</Typography>
              <Box sx={{ height: 300 }}>
                <Radar 
                  data={getSkillsChartData()} 
                  options={{
                    scales: {
                      r: {
                        min: 0,
                        max: 100,
                        ticks: {
                          stepSize: 20
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return context.dataset.label + ': ' + context.raw + '%';
                          }
                        }
                      }
                    }
                  }}
                />
              </Box>
            </Box>
          )}
          
          {/* Skills Gap Analysis section */}
          {report?.analysis?.skillsAnalysis && (
            <Box sx={{ mb: 5 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Top Skills Gaps</Typography>
              <Box sx={{ height: 300 }}>
                <Bar 
                  data={getGapChartData()} 
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top',
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return context.dataset.label + ': ' + context.raw + '%';
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                          display: true,
                          text: 'Score (%)'
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Skills'
                        }
                      }
                    }
                  }}
                />
              </Box>
            </Box>
          )}
          
          {/* Display Comprehensive Analysis if available */}
          {report?.analysis?.comprehensiveAnalysis && (
            <Box sx={{ mt: 5 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Comprehensive Skills Analysis</Typography>
              <div dangerouslySetInnerHTML={{ __html: report.analysis.comprehensiveAnalysis }} />
            </Box>
          )}
        </Paper>
      )}
      
      {activeTab === 2 && (
        <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Quiz Results</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3} alignItems="center" sx={{ mb: 4 }}>
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
                    <Typography variant="h4" color="primary">
                      {report.quizResults?.score || 0}/{report.quizResults?.totalQuestions || 0}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={8}>
              {/* Quiz performance feedback */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>Performance Analysis</Typography>
                
                {(() => {
                  const quizFeedback = getQuizPerformanceFeedback();
                  return (
                    <Alert 
                      severity={quizFeedback.color}
                      variant="filled"
                      sx={{ mb: 2 }}
                    >
                      {quizFeedback.text}
                    </Alert>
                  );
                })()}
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Your quiz performance affects your overall job compatibility score. Improving your knowledge in the areas where you 
                    answered incorrectly can significantly enhance your job match.
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
          
          <Divider sx={{ mb: 4 }} />
          
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>Question Details</Typography>
          
          {/* Quiz Questions and Answers */}
          {report.quizResults?.answers && report.quizResults.answers.length > 0 ? (
            report.quizResults.answers.map((answer, index) => {
              // Log each answer to debug
              console.log(`Rendering answer ${index}:`, answer);
              
              return (
                <Accordion key={index} defaultExpanded={index === 0} sx={{ mb: 2 }}>
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                      backgroundColor: answer.isCorrect 
                        ? 'rgba(76, 175, 80, 0.1)' 
                        : (answer.selectedAnswer === null || answer.selectedAnswer === undefined)
                          ? 'rgba(224, 224, 224, 0.3)' // Light gray for unanswered questions
                          : 'rgba(244, 67, 54, 0.1)' // Light red for incorrect answers
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Box 
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          bgcolor: answer.isCorrect 
                            ? 'success.main' 
                            : (answer.selectedAnswer === null || answer.selectedAnswer === undefined)
                              ? 'grey.500' // Gray for unanswered
                              : 'error.main', // Red for incorrect
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
                          {answer.question?.substring(0, 80) || 'Question'}
                          {answer.question && answer.question.length > 80 ? '...' : ''}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <Chip 
                            size="small" 
                            label={answer.category || 'Technical'} 
                            sx={{ mr: 1, bgcolor: '#3f51b5', color: 'white' }} 
                          />
                          <Chip 
                            size="small" 
                            label={answer.difficulty || 'Intermediate'} 
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      
                      <Box sx={{ ml: 2 }}>
                        {answer.selectedAnswer === null || answer.selectedAnswer === undefined ? (
                          <Typography variant="caption" color="text.secondary">Not answered</Typography>
                        ) : answer.isCorrect ? (
                          <CheckCircleIcon color="success" sx={{ fontSize: 28 }} />
                        ) : (
                          <CancelIcon color="error" sx={{ fontSize: 28 }} />
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails sx={{ p: 3 }}>
                    {renderQuestionText(answer.question)}
                    
                    {/* For multiple choice questions */}
                    <Box sx={{ mb: 3, mt: 3 }}>
                      {Array.isArray(answer.options) && answer.options.length > 0 ? (
                        answer.options.map((option, optIndex) => {
                          const correctAnswer = answer.correctAnswer;
                          // Check explicitly for null or undefined selectedAnswer
                          const selectedAnswer = answer.selectedAnswer;
                          const hasSelection = selectedAnswer !== null && selectedAnswer !== undefined;
                          
                          // Determine styling for this option
                          let bgColor = 'grey.100';
                          let borderLeft = 'none';
                          let borderLeftColor = undefined;
                          
                          if (optIndex === correctAnswer) {
                            bgColor = 'success.light';
                            borderLeft = '4px solid';
                            borderLeftColor = 'success.main';
                          } else if (hasSelection && optIndex === selectedAnswer) {
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
                              {/* Only show selection indicator if an answer was actually selected */}
                              {hasSelection && optIndex === selectedAnswer && (
                                <Box sx={{ mr: 2 }}>
                                  {optIndex === correctAnswer ? (
                                    <CheckCircleIcon color="success" />
                                  ) : (
                                    <CancelIcon color="error" />
                                  )}
                                </Box>
                              )}
                              
                              {/* Show correct answer indicator, but only if this wasn't also selected */}
                              {optIndex === correctAnswer && !(hasSelection && optIndex === selectedAnswer) && (
                                <Box sx={{ mr: 2 }}>
                                  <ArrowRightIcon color="success" />
                                </Box>
                              )}
                              
                              <Typography variant="body1">
                                {option}
                              </Typography>
                            </Box>
                          );
                        })
                      ) : (
                        <Box sx={{ p: 2, mb: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                          <Typography color="text.secondary" variant="body2">
                            No options available for this question.
                          </Typography>
                        </Box>
                      )}
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
                          bgcolor: answer.isCorrect 
                            ? 'success.50' 
                            : (answer.selectedAnswer === null || answer.selectedAnswer === undefined)
                              ? 'grey.100'
                              : 'error.50',
                          borderLeft: '4px solid',
                          borderColor: answer.isCorrect 
                            ? 'success.main' 
                            : (answer.selectedAnswer === null || answer.selectedAnswer === undefined)
                              ? 'grey.400'
                              : 'error.main'
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {answer.selectedAnswer === null || answer.selectedAnswer === undefined 
                            ? 'You did not answer this question. The correct answer is shown above.' 
                            : answer.explanation || 'No explanation available'}
                        </Typography>
                      </Paper>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1">No quiz results found in this report.</Typography>
            </Paper>
          )}
        </Paper>
      )}
      
      {activeTab === 3 && (
        <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Learning Resources & Roadmap</Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Box sx={{ mb: 4 }}>
            <div dangerouslySetInnerHTML={{ __html: processSectionContent(report.analysis?.recommendations, 'Recommendations') }} />
          </Box>
          
          {report.analysis?.learningRoadmap && (
            <Box sx={{ mb: 5, mt: 5 }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ mr: 1 }} /> Learning Roadmap
              </Typography>
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
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: 'primary.dark',
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
                  <div dangerouslySetInnerHTML={{ __html: formatRoadmapContent(report.analysis?.learningRoadmap) }} />
                </Box>
              </Box>
            </Box>
          )}
          
          <Box sx={{ mt: 5 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <SchoolIcon sx={{ mr: 1 }} /> Learning Resources
            </Typography>
            <div dangerouslySetInnerHTML={{ __html: processSectionContent(report.analysis?.learningResources, 'Learning Resources') }} />
          </Box>
        </Paper>
      )}
      
      {activeTab === 4 && (
        <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
          {renderInterviewQuestionsTab()}
        </Paper>
      )}
    </Container>
  );
}

export default ReportView;