import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DescriptionIcon from '@mui/icons-material/Description';
import WorkIcon from '@mui/icons-material/Work';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SchoolIcon from '@mui/icons-material/School';

function Home() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const features = [
    {
      icon: <DescriptionIcon fontSize="large" color="primary" />,
      title: "Resume Analysis",
      description: "Upload your resume and get detailed insights on how well it matches job requirements."
    },
    {
      icon: <WorkIcon fontSize="large" color="primary" />,
      title: "Job Matching",
      description: "Compare your skills and experience with job descriptions to find the perfect fit."
    },
    {
      icon: <AssessmentIcon fontSize="large" color="primary" />,
      title: "Skill Gap Analysis",
      description: "Identify missing skills and get personalized recommendations to improve your profile."
    },
    {
      icon: <SchoolIcon fontSize="large" color="primary" />,
      title: "Learning Resources",
      description: "Access curated learning resources to help you acquire the skills employers are looking for."
    }
  ];

  return (
    <Box sx={{ 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: 'calc(100vh - 64px)'
    }}>
      {/* Hero Section */}
      <Box sx={{ 
        py: 8,
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #4361ee 0%, #3f37c9 100%)',
        color: 'white'
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
                  Perfect Match for Your Career
                </Typography>
                <Typography variant="h6" paragraph>
                  ResumeFit uses AI to analyze how well your resume matches job requirements, identifies skill gaps, and provides personalized recommendations.
                </Typography>
                <Box sx={{ mt: 4 }}>
                  <Button 
                    variant="contained" 
                    size="large" 
                    onClick={() => navigate(currentUser ? '/dashboard' : '/register')}
                    sx={{ mr: 2, px: 4, py: 1.5, bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f0f0f0' } }}
                  >
                    {currentUser ? 'Go to Dashboard' : 'Get Started'}
                  </Button>
                  {!currentUser && (
                    <Button 
                      variant="outlined" 
                      size="large"
                      onClick={() => navigate('/login')}
                      sx={{ px: 4, py: 1.5, borderColor: 'white', color: 'white', '&:hover': { borderColor: '#f0f0f0' } }}
                    >
                      Log In
                    </Button>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" component="h2" align="center" gutterBottom>
          How ResumeFit Works
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" paragraph sx={{ mb: 6 }}>
          Our AI-powered platform helps you stand out in the job market
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3 }}>
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Call to Action */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 6 }}>
        <Container maxWidth="md">
          <Typography variant="h4" align="center" gutterBottom>
            Ready to boost your job search?
          </Typography>
          <Typography variant="subtitle1" align="center" paragraph>
            Join thousands of job seekers who have improved their chances with ResumeFit
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => navigate(currentUser ? '/dashboard' : '/register')}
              sx={{ px: 4, py: 1.5, bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f0f0f0' } }}
            >
              {currentUser ? 'Go to Dashboard' : 'Get Started for Free'}
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

export default Home;