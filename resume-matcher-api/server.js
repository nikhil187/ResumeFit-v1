const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const corsMiddleware = require('./corsMiddleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(corsMiddleware);
app.use(bodyParser.json({ limit: '50mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Report Schema
const reportSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, default: 'Job Analysis Report' },
  resumeData: {
    text: String,
    fileName: String
  },
  jobDescription: String,
  quizResults: {
    score: Number,
    totalQuestions: Number,
    answers: [{
      questionNumber: Number,
      question: String,
      selectedAnswer: {
        type: Number,
        default: 0
      },
      correctAnswer: {
        type: Number,
        default: 0
      },
      isCorrect: Boolean,
      explanation: String
    }],
    completedAt: Date
  },
  analysis: {
    summary: String,
    analysis: String,
    recommendations: String,
    learningResources: String,
    learningRoadmap: String,
    skillsMatchPercentage: Number,
    score: Number,
    strengths: {
      type: [String],
      default: []
    },
    areasForGrowth: {
      type: [String],
      default: []
    },
    skillsAnalysis: [Object],
    categoryScores: Object,
    comprehensiveAnalysis: String
  },
  savedInterviewQuestions: {
    type: [Object],
    default: []
  },
  visualizationData: {
    type: Object,
    default: {}
  },
  createdAt: { type: Date, default: Date.now }
});

const Report = mongoose.model('Report', reportSchema);

// API Routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Save a new report
app.post('/api/reports', async (req, res) => {
  try {
    console.log('Received save report request');
    const { userId, reportData } = req.body;
    
    // Add detailed logging
    console.log('Quiz Results received:', JSON.stringify(reportData.quizResults, null, 2));
    
    if (!userId) {
      console.error('Missing userId');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing userId' 
      });
    }
    
    if (!reportData) {
      console.error('Missing reportData');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing reportData' 
      });
    }
    
    // Format quiz results
    const quizResults = {
      score: Number(reportData.quizResults?.score) || 0,
      totalQuestions: Number(reportData.quizResults?.totalQuestions) || 0,
      answers: Array.isArray(reportData.quizResults?.answers) ? 
        reportData.quizResults.answers.map(answer => ({
          questionNumber: Number(answer.questionNumber || 0),
          question: answer.question || '',
          options: Array.isArray(answer.options) ? answer.options : [],
          category: answer.category || answer.questionType || 'Technical',
          difficulty: answer.difficulty || 'Intermediate',
          selectedAnswer: isNaN(Number(answer.selectedAnswer)) ? 0 : Number(answer.selectedAnswer),
          correctAnswer: isNaN(Number(answer.correctAnswer)) ? 0 : Number(answer.correctAnswer),
          isCorrect: Boolean(answer.isCorrect),
          explanation: answer.explanation || ''
        })) : [],
      completedAt: new Date(reportData.quizResults?.completedAt) || new Date()
    };
    
    console.log('Formatted quiz results:', JSON.stringify(quizResults, null, 2));
    
    // Create a new report document
    const report = new Report({
      userId,
      title: reportData.title || `Job Analysis Report ${new Date().toLocaleDateString()}`,
      resumeData: reportData.resumeData,
      jobDescription: reportData.jobDescription,
      quizResults,
      analysis: {
        ...reportData.analysis,
        strengths: Array.isArray(reportData.analysis?.strengths) ? 
          reportData.analysis.strengths.filter(Boolean) : [],
        areasForGrowth: Array.isArray(reportData.analysis?.areasForGrowth) ? 
          reportData.analysis.areasForGrowth.filter(Boolean) : [],
        skillsAnalysis: reportData.analysis?.skillsAnalysis || [],
        categoryScores: reportData.analysis?.categoryScores || {},
        comprehensiveAnalysis: reportData.analysis?.comprehensiveAnalysis || ''
      },
      savedInterviewQuestions: reportData.savedInterviewQuestions || [],
      visualizationData: reportData.visualizationData || {},
      createdAt: new Date()
    });
    
    console.log('Saving report to database...', report);
    await report.save();
    console.log('Report saved with ID:', report._id);
    
    res.json({ 
      success: true, 
      id: report._id,
      message: 'Report saved successfully'
    });
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to save report' 
    });
  }
});

// Get all reports for a user
app.get('/api/reports/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      console.error('Missing userId in request params');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing userId' 
      });
    }
    
    const reports = await Report.find({ userId }).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      reports 
    });
  } catch (error) {
    console.error('Error getting reports:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get reports' 
    });
  }
});

// Get a specific report
app.get('/api/reports/:userId/:reportId', async (req, res) => {
  try {
    const { userId, reportId } = req.params;
    
    if (!userId) {
      console.error('Missing userId in request params');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing userId' 
      });
    }
    
    if (!reportId || reportId === 'undefined') {
      console.error('Invalid reportId in request params:', reportId);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reportId' 
      });
    }
    
    const report = await Report.findOne({ _id: reportId, userId });
    
    if (!report) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }
    
    res.json({ 
      success: true, 
      report 
    });
  } catch (error) {
    console.error('Error getting report:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get report' 
    });
  }
});

// Update a report title
app.patch('/api/reports/:userId/:reportId/title', async (req, res) => {
  try {
    const { userId, reportId } = req.params;
    const { title } = req.body;
    
    console.log(`Updating title for report ${reportId} for user ${userId} to "${title}"`);
    
    if (!userId) {
      console.error('Missing userId in request params');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing userId' 
      });
    }
    
    if (!reportId || reportId === 'undefined') {
      console.error('Invalid reportId in request params:', reportId);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reportId' 
      });
    }
    
    if (!title || title.trim() === '') {
      console.error('Missing title in request body');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing title' 
      });
    }
    
    const result = await Report.findOneAndUpdate(
      { _id: reportId, userId },
      { title: title.trim() },
      { new: true }
    );
    
    if (!result) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }
    
    res.json({ 
      success: true,
      title: result.title
    });
  } catch (error) {
    console.error('Error updating report title:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update report title' 
    });
  }
});

// Delete a report
app.delete('/api/reports/:userId/:reportId', async (req, res) => {
  try {
    const { userId, reportId } = req.params;
    
    if (!userId) {
      console.error('Missing userId in request params');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing userId' 
      });
    }
    
    if (!reportId || reportId === 'undefined') {
      console.error('Invalid reportId in request params:', reportId);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reportId' 
      });
    }
    
    const result = await Report.deleteOne({ _id: reportId, userId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Report not found' 
      });
    }
    
    res.json({ 
      success: true 
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete report' 
    });
  }
});

// Save interview questions to a report
app.post('/api/reports/:reportId/interview-questions', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { questions } = req.body;
    
    if (!reportId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Invalid data provided' });
    }

    console.log(`Received request to save interview questions for report ${reportId}`, questions);
    
    // Find the report and update it with the questions
    const report = await Report.findById(reportId);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    report.savedInterviewQuestions = questions;
    await report.save();
    
    console.log(`Successfully saved ${questions.length} interview questions for report ${reportId}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving interview questions:', error);
    return res.status(500).json({ error: 'Error saving interview questions' });
  }
});

// Get interview questions for a report
app.get('/api/reports/:reportId/interview-questions', async (req, res) => {
  try {
    const { reportId } = req.params;
    
    if (!reportId) {
      return res.status(400).json({ error: 'Report ID is required' });
    }
    
    console.log(`Retrieving interview questions for report ${reportId}`);
    
    const report = await Report.findById(reportId);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    return res.status(200).json({ questions: report.savedInterviewQuestions || [] });
  } catch (error) {
    console.error('Error retrieving interview questions:', error);
    return res.status(500).json({ error: 'Error retrieving interview questions' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});