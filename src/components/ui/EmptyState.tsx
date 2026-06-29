import React from 'react';

interface EmptyStateProps {
  icon: string | React.ReactNode;
  title: string;
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-white text-sm font-semibold mb-1">{title}</h3>
      <p className="text-[#9AA3B2] text-xs max-w-xs">{message}</p>
    </div>
  );
};

export default EmptyState;
