// Simple test script to check the connection to the Firebase Functions API
const FIREBASE_API_URL = 'https://us-central1-se11-cf96b.cloudfunctions.net';

async function testBackendConnection() {
  try {
    // Test the test endpoint
    console.log('Testing connection to Firebase Functions test endpoint...');
    const testResponse = await fetch(`${FIREBASE_API_URL}/test`);
    
    if (!testResponse.ok) {
      console.error(`Test endpoint error: ${testResponse.status}`);
      return false;
    }
    
    const testData = await testResponse.json();
    console.log('Firebase Test endpoint response:', testData);
    
    // Test the API endpoint
    console.log('Testing connection to Firebase Functions API endpoint...');
    const apiResponse = await fetch(`${FIREBASE_API_URL}/api/test`);
    
    if (!apiResponse.ok) {
      console.error(`API endpoint error: ${apiResponse.status}`);
      return false;
    }
    
    const apiData = await apiResponse.json();
    console.log('Firebase API endpoint response:', apiData);
    
    // Test fetching mock reports
    console.log('Testing API reports endpoint...');
    const reportsResponse = await fetch(`${FIREBASE_API_URL}/api/reports/user123`);
    
    if (!reportsResponse.ok) {
      console.error(`Reports endpoint error: ${reportsResponse.status}`);
      return false;
    }
    
    const reportsData = await reportsResponse.json();
    console.log('Reports endpoint response:', reportsData);
    console.log(`Found ${reportsData.reports.length} mock reports`);
    
    return true;
  } catch (error) {
    console.error('Connection error:', error);
    return false;
  }
}

// Export the function so it can be called from the browser console
window.testBackendConnection = testBackendConnection;

// Self-executing function to run the test when this script is loaded
(async () => {
  const result = await testBackendConnection();
  console.log('Connection test result:', result ? 'SUCCESS' : 'FAILED');
})();

export default testBackendConnection; 