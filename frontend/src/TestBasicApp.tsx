import React from 'react';

const TestBasicApp: React.FC = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: 'red', fontSize: '32px' }}>TEST BASIC APP - SIMPLE RENDER</h1>
      <p>This is a basic test to verify React is rendering correctly</p>
      <p>Time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
};

export default TestBasicApp;