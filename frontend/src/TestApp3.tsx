import React from 'react';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider } from './contexts/AuthContext';

const TestApp3: React.FC = () => {
  return (
    <QueryProvider>
      <AuthProvider>
        <div style={{ padding: '20px' }}>
          <h1>AuthProvider Test</h1>
          <p>Testing QueryProvider + AuthProvider works</p>
        </div>
      </AuthProvider>
    </QueryProvider>
  );
};

export default TestApp3;
