import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';

// Use Firebase Functions API URL
const API_URL = 'https://us-central1-se11-cf96b.cloudfunctions.net/api';

// Mock data for demonstration in case of API failure
const MOCK_REPORTS = [
  {
    _id: "mock1",
    userId: "a4AHbNNuzXNUOtQLLnzBxNCnJkP2",
    title: "Full Stack Developer Analysis",
    analysis: {
      skillsMatchPercentage: 85,
      strengths: ["React", "Node.js", "MongoDB"],
      areasForGrowth: ["AWS", "CI/CD"]
    },
    createdAt: new Date(2024, 4, 1)
  },
  {
    _id: "mock2",
    userId: "a4AHbNNuzXNUOtQLLnzBxNCnJkP2",
    title: "Frontend Engineer Analysis",
    analysis: {
      skillsMatchPercentage: 92,
      strengths: ["HTML/CSS", "JavaScript", "UI/UX"],
      areasForGrowth: ["TypeScript", "Testing"]
    },
    createdAt: new Date(2024, 4, 2)
  }
];

// Save a report using the Firebase Functions API
export async function saveReport(userId, reportData) {
  try {
    console.log('Saving report for user:', userId);
    
    // Validate input
    if (!userId) {
      throw new Error('Missing userId');
    }
    
    if (!reportData) {
      throw new Error('Missing reportData');
    }
    
    try {
      const response = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          reportData
        }),
      });
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error(`Failed to parse server response: ${parseError.message}`);
      }
      
      if (!response.ok) {
        console.error('Error response from server:', responseData);
        throw new Error(`Server error: ${response.status} - ${responseData.message || 'Unknown error'}`);
      }
      
      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to save report');
      }
      
      console.log('Report saved successfully with ID:', responseData.id);
      return responseData.id;
    } catch (apiError) {
      console.error('API error, falling back to Firestore direct:', apiError);
      
      // Fall back to direct Firestore implementation
      const reportToSave = {
        userId,
        title: reportData.title || `Job Analysis Report ${new Date().toLocaleDateString()}`,
        resumeData: reportData.resumeData,
        jobDescription: reportData.jobDescription,
        quizResults: reportData.quizResults,
        analysis: reportData.analysis || {},
        savedInterviewQuestions: reportData.savedInterviewQuestions || [],
        visualizationData: reportData.visualizationData || {},
        createdAt: new Date()
      };

      // Add the document to Firestore
      const docRef = await addDoc(collection(db, "reports"), reportToSave);
      
      console.log('Report saved successfully with ID:', docRef.id);
      return docRef.id;
    }
  } catch (error) {
    console.error('Error saving report:', error);
    throw error;
  }
}

// Get all reports for a user
export async function getUserReports(userId) {
  try {
    console.log('Getting reports for user:', userId);
    
    if (!userId) {
      throw new Error('Missing userId');
    }
    
    try {
      const response = await fetch(`${API_URL}/reports/${userId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from server:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get reports');
      }
      
      console.log('Reports retrieved successfully:', data.reports.length);
      return data.reports;
    } catch (apiError) {
      console.error('API error, falling back to Firestore direct:', apiError);
      
      // Fall back to direct Firestore implementation
      const reportsQuery = query(
        collection(db, 'reports'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(reportsQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
        };
      });
    }
  } catch (error) {
    console.error('Error getting reports, returning mock data:', error);
    // Return mock data if all else fails
    return MOCK_REPORTS;
  }
}

// Get a specific report
export async function getReport(userId, reportId) {
  try {
    console.log('Getting report:', reportId, 'for user:', userId);
    
    if (!userId) {
      throw new Error('Missing userId');
    }
    
    if (!reportId) {
      throw new Error('Missing reportId');
    }
    
    try {
      const response = await fetch(`${API_URL}/reports/${userId}/${reportId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from server:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get report');
      }
      
      console.log('Report retrieved successfully');
      return data;
    } catch (apiError) {
      console.error('API error, falling back to Firestore direct:', apiError);
      
      // Fall back to direct Firestore implementation
      const reportDoc = await getDoc(doc(db, 'reports', reportId));
      
      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }
      
      const reportData = reportDoc.data();
      
      // Check if this report belongs to the user
      if (reportData.userId !== userId) {
        throw new Error('Access denied: This report does not belong to the user');
      }
      
      return {
        success: true,
        report: {
          _id: reportDoc.id,
          ...reportData,
          createdAt: reportData.createdAt?.toDate ? reportData.createdAt.toDate() : reportData.createdAt
        }
      };
    }
  } catch (error) {
    console.error('Error getting report:', error);
    throw error;
  }
}

// Update a report title
export async function updateReportTitle(userId, reportId, title) {
  try {
    console.log(`Updating title for report ${reportId} for user ${userId} to "${title}"`);
    
    if (!userId || !reportId || !title) {
      throw new Error('Missing required parameters');
    }
    
    try {
      const response = await fetch(`${API_URL}/reports/${userId}/${reportId}/title`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from server:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update report title');
      }
      
      return data.title;
    } catch (apiError) {
      console.error('API error, falling back to Firestore direct:', apiError);
      
      // Fall back to direct Firestore implementation
      const reportRef = doc(db, 'reports', reportId);
      
      // Check if report exists and belongs to user
      const reportDoc = await getDoc(reportRef);
      
      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }
      
      const reportData = reportDoc.data();
      
      if (reportData.userId !== userId) {
        throw new Error('Access denied: This report does not belong to the user');
      }
      
      await updateDoc(reportRef, { title });
      
      return title;
    }
  } catch (error) {
    console.error('Error updating report title:', error);
    throw error;
  }
}

// Delete a report
export async function deleteReport(userId, reportId) {
  try {
    console.log(`Deleting report ${reportId} for user ${userId}`);
    
    if (!userId || !reportId) {
      throw new Error('Missing required parameters');
    }
    
    try {
      const response = await fetch(`${API_URL}/reports/${userId}/${reportId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from server:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete report');
      }
      
      return true;
    } catch (apiError) {
      console.error('API error, falling back to Firestore direct:', apiError);
      
      // Fall back to direct Firestore implementation
      const reportRef = doc(db, 'reports', reportId);
      
      // Check if report exists and belongs to user
      const reportDoc = await getDoc(reportRef);
      
      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }
      
      const reportData = reportDoc.data();
      
      if (reportData.userId !== userId) {
        throw new Error('Access denied: This report does not belong to the user');
      }
      
      await deleteDoc(reportRef);
      
      return true;
    }
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
}