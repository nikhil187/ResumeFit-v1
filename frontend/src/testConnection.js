import React, { useState, useEffect } from 'react';

// Production API URL
const API_URL = 'https://us-central1-se11-cf96b.cloudfunctions.net/api';

function TestConnection() {
  const [connectionStatus, setConnectionStatus] = useState('Checking...');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkConnection() {
      try {
        console.log('Testing connection to API...');
        const response = await fetch(`${API_URL}/test`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        setConnectionStatus(`Connected! Response: ${data.message}`);
        setError(null);
      } catch (err) {
        console.error('Connection error:', err);
        setConnectionStatus('Failed to connect');
        setError(err.message);
      }
    }

    checkConnection();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>API Connection Test</h2>
      <p>Testing connection to: <code>{API_URL}</code></p>
      <div style={{ 
        padding: '15px', 
        borderRadius: '5px',
        backgroundColor: connectionStatus.includes('Connected') ? '#e0ffe0' : '#ffe0e0'
      }}>
        <p><strong>Status:</strong> {connectionStatus}</p>
        {error && (
          <div>
            <p><strong>Error:</strong> {error}</p>
            <div style={{ marginTop: '10px' }}>
              <h3>Troubleshooting:</h3>
              <ul>
                <li>Check if the Firebase Function is deployed and running</li>
                <li>Verify your network connection</li>
                <li>Check browser console for detailed error messages</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TestConnection; 