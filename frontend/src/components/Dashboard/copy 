const API_URL = 'http://localhost:5005/api';

export async function saveReport(userId, reportData) {
  try {
    console.log('Saving report to MongoDB for user:', userId);
    console.log('Report data:', reportData);
    
    // Validate input
    if (!userId) {
      throw new Error('Missing userId');
    }
    
    if (!reportData) {
      throw new Error('Missing reportData');
    }
    
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
    
    if (!userId) {
      throw new Error('Missing userId');
    }
    
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
  } catch (error) {
    console.error('Error getting reports:', error);
    throw error;
  }
}

export async function getReport(userId, reportId) {
  try {
    console.log('Getting report from MongoDB:', reportId, 'for user:', userId);
    
    if (!userId) {
      throw new Error('Missing userId');
    }
    
    if (!reportId) {
      throw new Error('Missing reportId');
    }
    
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
    return data.report;
  } catch (error) {
    console.error('Error getting report:', error);
    throw error;
  }
}

export async function deleteReport(userId, reportId) {
  try {
    console.log('Deleting report from MongoDB:', reportId, 'for user:', userId);
    
    if (!userId) {
      throw new Error('Missing userId');
    }
    
    if (!reportId) {
      throw new Error('Missing reportId');
    }
    
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