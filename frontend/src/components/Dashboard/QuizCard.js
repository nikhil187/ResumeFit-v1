import React from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Radio,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Enhanced MCQ Card for quizzes
const QuizCard = ({ question, currentQuestion, totalQuestions, onAnswerChange, userAnswer }) => {
  // Get color based on question category
  const getCategoryColor = (category) => {
    if (!category) return 'primary.main';
    
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('debug')) return '#e91e63'; // Pink
    if (lowerCategory.includes('logic')) return '#2196f3'; // Blue
    if (lowerCategory.includes('architect')) return '#ff9800'; // Orange
    if (lowerCategory.includes('system')) return '#9c27b0'; // Purple
    if (lowerCategory.includes('perform')) return '#4caf50'; // Green
    if (lowerCategory.includes('secur')) return '#f44336'; // Red
    
    return 'primary.main'; // Default color
  };
  
  // Get appropriate language for syntax highlighting
  const getCodeLanguage = (question) => {
    if (!question) return 'javascript';
    
    const questionText = question.toLowerCase();
    
    if (questionText.includes('java ') && !questionText.includes('javascript')) return 'java';
    if (questionText.includes('javascript') || questionText.includes('js ') || questionText.includes('react')) return 'javascript';
    if (questionText.includes('python') || questionText.includes('django')) return 'python';
    if (questionText.includes('c#')) return 'csharp';
    if (questionText.includes('golang') || questionText.includes(' go ')) return 'go';
    if (questionText.includes('ruby')) return 'ruby';
    if (questionText.includes('sql')) return 'sql';
    if (questionText.includes('php')) return 'php';
    if (questionText.includes('c++')) return 'cpp';
    if (questionText.includes('swift')) return 'swift';
    if (questionText.includes('rust')) return 'rust';
    
    return 'javascript'; // Default
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
  
  // Process question text and extract code blocks
  const { text: questionText, codeBlocks } = extractCodeSnippet(question.question);
  
  return (
    <Card elevation={3} sx={{ borderRadius: 2, overflow: 'visible', mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Question {currentQuestion + 1} of {totalQuestions}
          </Typography>
        </Box>
        
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
          {questionText.split('[CODE_BLOCK_').map((part, index) => {
            if (index === 0) return part;
            
            const closingBracketIndex = part.indexOf(']');
            if (closingBracketIndex === -1) return part;
            
            const codeBlockIndex = parseInt(part.substring(0, closingBracketIndex));
            const remainingText = part.substring(closingBracketIndex + 1);
            
            return (
              <React.Fragment key={index}>
                <Box sx={{ my: 2 }}>
                  <SyntaxHighlighter
                    language={getCodeLanguage(question.question)}
                    style={atomDark}
                    customStyle={{ borderRadius: '8px' }}
                  >
                    {codeBlocks[codeBlockIndex]}
                  </SyntaxHighlighter>
                </Box>
                {remainingText}
              </React.Fragment>
            );
          })}
        </Typography>
        
        <Box sx={{ mt: 4 }}>
          {question.options && question.options.map((option, index) => (
            <Paper 
              key={index} 
              elevation={0}
              sx={{ 
                mb: 2.5,
                backgroundColor: userAnswer === index ? 'primary.50' : 'background.paper',
                border: '1px solid',
                borderColor: userAnswer === index ? 'primary.main' : 'grey.300',
                borderRadius: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: userAnswer === index ? 'primary.50' : 'grey.50',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }
              }}
            >
              <FormControlLabel
                value={index.toString()}
                control={
                  <Radio 
                    checked={userAnswer === index}
                    onChange={() => onAnswerChange(index)}
                    sx={{ ml: 1 }}
                  />
                }
                label={
                  <Typography variant="body1" sx={{ py: 1.5 }}>{option}</Typography>
                }
                sx={{ 
                  display: 'flex', 
                  width: '100%',
                  py: 0.5,
                  px: 1,
                  m: 0
                }}
              />
            </Paper>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default QuizCard; 