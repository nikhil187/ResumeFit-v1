// Production API URL (Firebase Functions)
const API_URL = 'https://us-central1-se11-cf96b.cloudfunctions.net/api';

export async function saveReport(userId, reportData) {
  try {
    console.log('Saving report to MongoDB for user:', userId);
    
    // Validate input
    if (!userId || !reportData) {
      throw new Error('Missing userId or reportData');
    }
    
    // Don't reformat the quiz data - use it as is from Results.js
    // The data is already properly formatted in handleSaveReport
    
    // Don't extract strengths and areas for growth - they are already formatted in Results.js
    
    // Make the API call with the original reportData
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
      const errorText = await response.text();
      console.error('Raw response:', errorText);
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
  } catch (error) {
    console.error('Error saving report:', error);
    throw error;
  }
}

export async function getUserReports(userId) {
  try {
    console.log('Getting reports from MongoDB for user:', userId);
    
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
    return data.reports.map(report => ({
      ...report,
      createdAt: new Date(report.createdAt)
    }));
  } catch (error) {
    console.error('Error getting reports:', error);
    throw error;
  }
}

export const getReport = async (userId, reportId) => {
  try {
    // Use the Firebase Function API URL
    const response = await fetch(`${API_URL}/reports/${userId}/${reportId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to retrieve report');
    }
    
    const data = await response.json();
    console.log("Retrieved report data:", data);
    
    // Return the data as is to handle the structure in the component
    return data;
  } catch (error) {
    console.error('Error in getReport:', error);
    throw error;
  }
};

export async function deleteReport(userId, reportId) {
  try {
    console.log('Deleting report from MongoDB:', reportId, 'for user:', userId);
    
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
    
    console.log('Report deleted successfully');
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
}

export async function updateReportTitle(userId, reportId, title) {
  try {
    console.log(`Updating report title in MongoDB for user: ${userId}, report: ${reportId}, new title: "${title}"`);
    
    if (!userId || !reportId || !title) {
      throw new Error('Missing required parameters');
    }
    
    // Construct the full URL for debugging
    const url = `${API_URL}/reports/${userId}/${reportId}/title`;
    console.log('Request URL:', url);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from server:', errorText);
      console.error('Status code:', response.status);
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to update report title');
    }
    
    console.log('Report title updated successfully:', data.title);
    return data.title;
  } catch (error) {
    console.error('Error updating report title:', error);
    throw error;
  }
}