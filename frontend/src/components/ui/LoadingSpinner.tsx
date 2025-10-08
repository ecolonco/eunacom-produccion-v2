import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size],
        className
      )}
    />
  );
};

export const LoadingCard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">{children || 'Cargando...'}</p>
        </div>
      </div>
    </div>
  );
};

export const LoadingOverlay: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600">{children || 'Cargando...'}</p>
      </div>
    </div>
  );
};