import React from 'react';
import { QueryProvider } from './contexts/QueryProvider';

const TestApp2: React.FC = () => {
  return (
    <QueryProvider>
      <div style={{ padding: '20px' }}>
        <h1>QueryProvider Test</h1>
        <p>Testing QueryProvider works</p>
      </div>
    </QueryProvider>
  );
};

export default TestApp2;
