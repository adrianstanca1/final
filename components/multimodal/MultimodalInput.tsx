import React from 'react';
import { MultimodalContent } from '../../types';

interface MultimodalInputProps {
  onContentSubmit: (content: Partial<MultimodalContent>) => void;
  onError: (error: string) => void;
}

export const MultimodalInput: React.FC<MultimodalInputProps> = ({ onContentSubmit, onError }) => {
  return (
    <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
      <p className="text-gray-500">Multimodal Input Component - Coming Soon</p>
      <p className="text-sm text-gray-400 mt-2">Upload and process multimodal content</p>
    </div>
  );
};
